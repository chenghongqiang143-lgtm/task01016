
import React, { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Task, DayData, HOURS, Objective, Todo } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, formatDate, generateId } from '../utils';
import { Clock, LayoutGrid, Check, X, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';

interface TrackerViewProps {
  tasks: Task[];
  objectives: Objective[];
  categoryOrder: string[];
  scheduleData: DayData;
  recordData: DayData;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  onUpdateRecord: (hour: number, taskIds: string[]) => void;
  onUpdateSchedule: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTodo: (todo: Todo) => void;
  currentDate: Date;
  onEditingStatusChange?: (status: string | null) => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  tasks,
  objectives,
  categoryOrder,
  scheduleData,
  recordData,
  recurringSchedule,
  onUpdateRecord,
  onUpdateSchedule,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask,
  currentDate,
  onEditingStatusChange
}) => {
  const [activeSide, setActiveSide] = useState<'plan' | 'actual' | null>(null);
  const [selectedHours, setSelectedHours] = useState<Set<number>>(new Set<number>());
  
  const [isRecurringMode, setIsRecurringMode] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to avoid namespace errors in browser environment
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  useEffect(() => {
    if (onEditingStatusChange) {
      if (activeSide && selectedHours.size > 0) {
        const sortedHours = Array.from(selectedHours).sort((a: number, b: number) => a - b);
        const hoursText = sortedHours.length > 3 
            ? `${sortedHours.length}个时段` 
            : sortedHours.map(h => `${h}:00`).join(', ');
        onEditingStatusChange(`${hoursText} ${activeSide === 'plan' ? '安排' : '记录'}`);
      } else {
        onEditingStatusChange(null);
      }
    }
  }, [activeSide, selectedHours, onEditingStatusChange]);

  const taskProgress = useMemo(() => {
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);
    
    HOURS.forEach(h => {
      const ids = recordData.hours[h] || [];
      ids.forEach(tid => {
        const currentVal = stats[tid];
        if (typeof currentVal === 'number') {
          const task = tasks.find(t => t.id === tid);
          if (task?.targets?.mode === 'count') {
            stats[tid] = currentVal + 1;
          } else {
            stats[tid] = currentVal + (1 / Math.max(ids.length, 1));
          }
        }
      });
    });
    return stats;
  }, [tasks, recordData]);

  const sortedCategories = useMemo(() => {
    const existingCats = new Set(tasks.map(t => t.category || '未分类'));
    const ordered = categoryOrder.filter(c => existingCats.has(c));
    const others = Array.from(existingCats).filter(c => !categoryOrder.includes(c));
    return [...ordered, ...others];
  }, [tasks, categoryOrder]);

  const getObjectiveTitle = (id: string) => {
    if (id === '未分类') return '未分类';
    const obj = objectives.find(o => o.id === id);
    return obj ? obj.title : '未知分类';
  };

  const handleHourClick = (hour: number, side: 'plan' | 'actual') => {
    if (activeSide !== side) {
        setActiveSide(side);
        setSelectedHours(new Set([hour]));
    } else {
        const newSelection = new Set(selectedHours);
        if (newSelection.has(hour)) {
            newSelection.delete(hour);
            if (newSelection.size === 0) setActiveSide(null);
        } else {
            newSelection.add(hour);
        }
        setSelectedHours(newSelection);
    }
  };

  const handleToggleTaskInSlot = (taskId: string) => {
    if (!activeSide || selectedHours.size === 0) return;
    const isRecurring = activeSide === 'plan' && isRecurringMode;
    const targetDataMap = activeSide === 'actual' ? recordData.hours : (isRecurring ? recurringSchedule : scheduleData.hours);
    const updateFn = activeSide === 'actual' ? onUpdateRecord : (isRecurring ? onUpdateRecurring : onUpdateSchedule);

    const allHaveIt = Array.from(selectedHours).every((h: number) => (targetDataMap[h] || []).includes(taskId));

    selectedHours.forEach(hour => {
        const currentTasks = targetDataMap[hour] || [];
        let newTasks;
        if (allHaveIt) {
            newTasks = currentTasks.filter(id => id !== taskId);
        } else {
            if (!currentTasks.includes(taskId)) newTasks = [...currentTasks, taskId].slice(-4);
            else newTasks = currentTasks;
        }
        if (newTasks !== currentTasks) updateFn(hour, newTasks);
    });
  };

  const handleTaskPointerDown = (task: Task) => {
    longPressTimer.current = setTimeout(() => {
      setEditingTask(task);
      setIsEditModalOpen(true);
      longPressTimer.current = null;
    }, 600);
  };

  const handleTaskPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const isTaskInActiveSlot = (taskId: string) => {
      if (!activeSide || selectedHours.size === 0) return false;
      const isRecurring = activeSide === 'plan' && isRecurringMode;
      const targetDataMap = activeSide === 'actual' ? recordData.hours : (isRecurring ? recurringSchedule : scheduleData.hours);
      return Array.from(selectedHours).every((h: number) => (targetDataMap[h] || []).includes(taskId));
  };

  const clearSelection = () => {
      setSelectedHours(new Set());
      setActiveSide(null);
  };

  const PoolContent = () => (
    <div className="flex flex-col h-full bg-white">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-2">
                <h3 className="text-[9px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-1.5">
                    <LayoutGrid size={10} /> 任务库 (长按编辑)
                </h3>
            </div>
            {activeSide === 'plan' && (
                <button 
                    onClick={() => setIsRecurringMode(!isRecurringMode)}
                    className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all flex items-center gap-1 border",
                        isRecurringMode ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-100 hover:border-stone-300"
                    )}
                >
                    <Repeat size={10} /> {isRecurringMode ? '已开启' : '循环'}
                </button>
            )}
            <button onClick={clearSelection} className="p-1 hover:bg-stone-100 rounded-full text-stone-300 transition-colors">
                <X size={14} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar pb-32">
            {sortedCategories.map(cat => (
                <div key={cat} className="space-y-2">
                    <div className="px-1 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em] truncate">{getObjectiveTitle(cat)}</span>
                        <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
                            const isSelected = isTaskInActiveSlot(task.id);
                            const currentVal = taskProgress[task.id] || 0;
                            const target = task.targets;
                            const dailyTarget = target ? (target.value / target.frequency) : 0;
                            const progress = dailyTarget > 0 ? Math.min((currentVal / dailyTarget) * 100, 100) : 0;
                            const isCompleted = progress >= 100;

                            return (
                                <div 
                                    key={task.id}
                                    onClick={() => handleToggleTaskInSlot(task.id)}
                                    onPointerDown={() => handleTaskPointerDown(task)}
                                    onPointerUp={handleTaskPointerUp}
                                    onPointerLeave={handleTaskPointerUp}
                                    className={cn(
                                        "px-3 h-10 rounded-xl border transition-all cursor-pointer relative shadow-sm flex items-center overflow-hidden active:scale-95 select-none",
                                        isSelected 
                                            ? "bg-stone-900 border-stone-900 text-white z-10" 
                                            : "bg-white border-stone-100 hover:border-stone-300 text-stone-700"
                                    )}
                                >
                                    {!isSelected && (
                                        <div 
                                            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0"
                                            style={{ 
                                                width: `${progress}%`, 
                                                backgroundColor: `${task.color}15`
                                            }}
                                        />
                                    )}

                                    <div className="relative z-10 flex items-center gap-2 w-full min-w-0">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            isCompleted && !isSelected ? "animate-pulse shadow-[0_0_4px_rgba(0,0,0,0.2)]" : ""
                                        )} style={{ backgroundColor: isSelected ? 'white' : task.color }} />
                                        <span className="text-[10px] font-bold leading-none truncate flex-1">{task.name}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      <aside className={cn(
        "absolute left-0 top-0 bottom-0 w-[240px] bg-white border-r border-stone-200 z-[70] transition-transform duration-500 ease-out shadow-[10px_0_40px_rgba(0,0,0,0.08)]",
        activeSide === 'actual' ? "translate-x-0" : "-translate-x-full"
      )}>
        <PoolContent />
      </aside>

      <aside className={cn(
        "absolute right-0 top-0 bottom-0 w-[240px] bg-white border-l border-stone-200 z-[70] transition-transform duration-500 ease-out shadow-[-10px_0_40px_rgba(0,0,0,0.08)]",
        activeSide === 'plan' ? "translate-x-0" : "translate-x-full"
      )}>
        <PoolContent />
      </aside>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white custom-scrollbar pb-32">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-6 w-full">
                <div className="flex-1 flex items-center justify-center gap-2 text-stone-300">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">安排</span>
                    <ChevronLeft size={12} />
                </div>
                <div className="w-14 flex items-center justify-center">
                    <Clock size={16} className="text-stone-200" />
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 text-stone-300">
                    <ChevronRight size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">记录</span>
                </div>
            </div>
        </div>

        <div className="pt-1">
          {HOURS.map(hour => (
            <TimelineRow 
              key={hour} 
              hour={hour} 
              assignedScheduleIds={scheduleData.hours[hour] || []} 
              assignedRecordIds={recordData.hours[hour] || []} 
              allTasks={tasks} 
              onScheduleClick={(h) => handleHourClick(h, 'plan')}
              onRecordClick={(h) => handleHourClick(h, 'actual')}
              isScheduleSelected={activeSide === 'plan' && selectedHours.has(hour)}
              isRecordSelected={activeSide === 'actual' && selectedHours.has(hour)}
            />
          ))}
        </div>
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} objectives={objectives} />
    </div>
  );
};
