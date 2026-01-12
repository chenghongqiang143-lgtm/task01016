import React, { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Task, DayData, HOURS, Objective, Todo } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, formatDate, generateId } from '../utils';
import { LayoutGrid, X, ChevronLeft, ChevronRight, Repeat, Clock, Columns, History, Layers, Flag } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TrackerViewProps {
  tasks: Task[];
  objectives: Objective[];
  categoryOrder: string[];
  scheduleData: DayData;
  recordData: DayData;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  todos: Todo[];
  onUpdateRecord: (hour: number, taskIds: string[]) => void;
  onUpdateSchedule: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTodo: (todo: Todo) => void;
  currentDate: Date;
  onEditingStatusChange?: (status: string | null) => void;
}

type ViewMode = 'day' | 'week';

export const TrackerView: React.FC<TrackerViewProps> = ({
  tasks,
  objectives,
  categoryOrder,
  scheduleData,
  recordData,
  recurringSchedule,
  allRecords,
  todos,
  onUpdateRecord,
  onUpdateSchedule,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask,
  onAddTodo,
  currentDate,
  onEditingStatusChange
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activeSide, setActiveSide] = useState<'plan' | 'actual' | null>(null);
  const [selectedHours, setSelectedHours] = useState<Set<number>>(new Set<number>());
  
  const [isRecurringMode, setIsRecurringMode] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activePoolCategory, setActivePoolCategory] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  const taskLastAdded = useMemo(() => {
    const lastDates: Record<string, string> = {};
    todos.forEach(todo => {
      if (todo.templateId) {
        const date = todo.startDate;
        if (date && (!lastDates[todo.templateId] || date > lastDates[todo.templateId])) {
          lastDates[todo.templateId] = date;
        }
      }
    });
    return lastDates;
  }, [todos]);

  const getStatusText = (taskId: string) => {
    const lastDateStr = taskLastAdded[taskId];
    if (!lastDateStr) return '未开始';
    try {
      const date = parseISO(lastDateStr);
      if (!isValid(date)) return '未开始';
      const diff = differenceInCalendarDays(new Date(), date);
      if (diff === 0) return '今天添加过';
      return `${diff}天前添加`;
    } catch (e) {
      return '未开始';
    }
  };

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

  const taskStats = useMemo(() => {
    const stats: Record<string, { todayActual: number; totalActual: number }> = {};
    const recordedValues = new Map<string, number>();

    tasks.forEach(t => stats[t.id] = { todayActual: 0, totalActual: 0 });
    
    // 汇总所有历史记录
    Object.entries(allRecords).forEach(([dateStr, record]) => {
      const dayData = record as DayData;
      if (!dayData || !dayData.hours) return;
      
      HOURS.forEach(h => {
        const rawIds = dayData.hours[h];
        if (Array.isArray(rawIds)) {
          const ids = rawIds as string[];
          ids.forEach(tid => {
            if (stats[tid]) {
              const increment = 1 / Math.max(ids.length, 1);
              stats[tid].totalActual += increment;
              if (dateStr === formatDate(currentDate)) {
                  stats[tid].todayActual += increment;
              }
              const key = `${tid}_${dateStr}`;
              recordedValues.set(key, (recordedValues.get(key) || 0) + increment);
            }
          });
        }
      });
    });

    // 从已完成 Todo 补充累计值
    todos.forEach(t => {
        if (t.isCompleted && t.templateId && stats[t.templateId]) {
            const task = tasks.find(tk => tk.id === t.templateId);
            const mode = task?.targets?.mode || 'duration';
            const refDate = t.completedAt || t.startDate; 
            if (mode === 'count') {
                stats[t.templateId].totalActual += 1;
            } else if (mode === 'duration' && refDate) {
                const key = `${t.templateId}_${refDate}`;
                const recorded = recordedValues.get(key) || 0;
                const targetVal = t.targets?.value || 0;
                if (targetVal > recorded) {
                    stats[t.templateId].totalActual += (targetVal - recorded);
                }
            }
        }
    });

    return stats;
  }, [tasks, allRecords, todos, currentDate]);

  const sortedCategories = useMemo(() => {
    const existingCats = new Set(tasks.map(t => t.category || '未分类'));
    const ordered = categoryOrder.filter(c => existingCats.has(c));
    const others = Array.from(existingCats).filter(c => !categoryOrder.includes(c));
    return ['all', ...ordered, ...others];
  }, [tasks, categoryOrder]);

  const getObjectiveTitle = (id: string) => {
    if (id === 'all') return '全部';
    if (id === '未分类') return '未分类';
    const obj = objectives.find(o => o.id === id);
    return obj ? obj.title : '未知分类';
  };

  const handleHourClick = (hour: number, side: 'plan' | 'actual') => {
    if (viewMode !== 'day') return;
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

  const renderTaskButton = (task: Task) => {
    const isSelected = isTaskInActiveSlot(task.id);
    const stats = taskStats[task.id];
    const todayActual = stats?.todayActual || 0;
    const totalActual = stats?.totalActual || 0;
    
    const target = task.targets;
    const dailyTarget = target ? (target.value / target.frequency) : 0;
    const hasLongTermGoal = target?.totalValue && target.totalValue > 0;
    const totalGoal = target?.totalValue;

    // 优先显示长期目标进度，如果存在
    const progressPercent = hasLongTermGoal 
      ? Math.min((totalActual / (totalGoal || 1)) * 100, 100)
      : (dailyTarget > 0 ? Math.min((todayActual / dailyTarget) * 100, 100) : 0);
      
    const statusText = getStatusText(task.id);

    return (
        <div 
            key={task.id}
            onClick={() => handleToggleTaskInSlot(task.id)}
            onPointerDown={() => handleTaskPointerDown(task)}
            onPointerUp={handleTaskPointerUp}
            onPointerLeave={handleTaskPointerUp}
            className={cn(
                "px-3 py-2 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-center overflow-hidden active:scale-95 select-none touch-manipulation min-h-[50px]",
                isSelected 
                    ? "text-white z-10 border-transparent bg-primary shadow-none" 
                    : "bg-white border-stone-100 hover:border-stone-300 text-stone-700"
            )}
        >
            {!isSelected && (
                <div 
                    className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0 opacity-[0.12]"
                    style={{ width: `${progressPercent}%`, backgroundColor: task.color }}
                />
            )}
            <div className="relative z-10 flex items-center gap-2 w-full min-w-0">
                <span className="text-[10px] font-bold leading-none truncate flex-1 font-sans">{task.name}</span>
            </div>
            
            {hasLongTermGoal && (
                <div className={cn("relative z-10 flex items-center gap-0.5 mt-1 text-[7px] font-black", isSelected ? "text-white/50" : "text-primary/60")}>
                    <Flag size={7} />
                    <span>{totalActual.toFixed(1)} / {totalGoal?.toFixed(1)}</span>
                </div>
            )}

            <div className={cn("relative z-10 flex items-center gap-1 mt-0.5 text-[8px] font-bold", isSelected ? "text-white/60" : "text-stone-300")}>
                <History size={8} />
                <span>{statusText}</span>
            </div>
        </div>
    );
  };

  const PoolContent = () => (
    <div className="flex flex-col h-full bg-white">
        <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/95 z-20 shrink-0 h-10">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutGrid size={12} /> 任务库
            </h3>
            <div className="flex items-center gap-2">
              {activeSide === 'plan' && (
                  <button onClick={() => setIsRecurringMode(!isRecurringMode)} className={cn("px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all flex items-center gap-1 border", isRecurringMode ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100")}>
                      <Repeat size={10} /> {isRecurringMode ? '已开启' : '循环'}
                  </button>
              )}
              <button onClick={clearSelection} className="p-1 hover:bg-stone-100 rounded-full text-stone-300 transition-colors">
                  <X size={14} />
              </button>
            </div>
        </div>
        
        <div className="px-3 py-2 bg-white border-b border-stone-50 shrink-0">
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {sortedCategories.map(catId => {
                    const isActive = activePoolCategory === catId;
                    return (
                        <button 
                            key={catId} 
                            onClick={() => setActivePoolCategory(catId)}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                                isActive ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100"
                            )}
                        >
                            {getObjectiveTitle(catId)}
                        </button>
                    );
                })}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar pb-32">
            {activePoolCategory === 'all' ? (
                <div className="space-y-6">
                    {categoryOrder.map(catId => {
                        const obj = objectives.find(o => o.id === catId);
                        const catTasks = tasks.filter(t => t.category === catId);
                        if (catTasks.length === 0) return null;
                        return (
                            <div key={catId} className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{obj?.title}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {catTasks.map(task => renderTaskButton(task))}
                                </div>
                            </div>
                        );
                    })}
                    {/* Others/Uncategorized */}
                    {tasks.filter(t => !t.category || !categoryOrder.includes(t.category)).length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest">其他</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {tasks.filter(t => !t.category || !categoryOrder.includes(t.category)).map(task => renderTaskButton(task))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {tasks.filter(t => (t.category || '未分类') === activePoolCategory || (activePoolCategory === 'none' && (!t.category || t.category === 'none'))).map(task => renderTaskButton(task))}
                </div>
            )}
        </div>
    </div>
  );

  const WeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
        <div className="flex flex-col min-h-full pb-32">
             <div className="flex sticky top-0 z-30 bg-white/95 border-b border-stone-100 shadow-sm shrink-0">
                 <div className="w-10 flex-shrink-0 bg-white border-r border-stone-50"></div>
                 <div className="flex-1 flex overflow-hidden">
                     {days.map(day => {
                         const isToday = isSameDay(day, new Date());
                         const isSelected = isSameDay(day, currentDate);
                         return (
                             <div key={day.toString()} className={cn("flex-1 flex flex-col items-center justify-center py-2 border-r border-stone-50/50", isSelected ? "bg-stone-50/50" : "")}>
                                 <span className={cn("text-[9px] font-black uppercase", isToday ? "text-primary" : "text-stone-400")}>{format(day, 'EEE', { locale: zhCN }).replace('周', '')}</span>
                                 <span className={cn("text-xs font-black leading-none mt-0.5", isToday ? "text-primary" : "text-stone-600")}>{format(day, 'd')}</span>
                             </div>
                         );
                     })}
                 </div>
             </div>

             <div className="flex flex-1">
                  <div className="w-10 flex-shrink-0 bg-white border-r border-stone-100 z-10">
                      {HOURS.map(h => (
                          <div key={h} className="h-9 flex items-center justify-center text-[9px] font-mono text-stone-300 border-b border-stone-50">
                              {h.toString().padStart(2, '0')}
                          </div>
                      ))}
                  </div>

                  <div className="flex-1 flex">
                      {days.map(day => {
                          const dKey = formatDate(day);
                          const record = allRecords[dKey] || { hours: {} };
                          const isSelected = isSameDay(day, currentDate);
                          
                          return (
                              <div key={dKey} className={cn("flex-1 border-r border-stone-50 flex flex-col", isSelected ? "bg-stone-50/20" : "")}>
                                  {HOURS.map(h => {
                                      const tasksInHour = (record.hours && record.hours[h] ? record.hours[h] : []).map(id => tasks.find(t => t.id === id)).filter((t): t is Task => !!t);
                                      return (
                                          <div key={h} className="h-9 border-b border-stone-50 p-0.5 relative group">
                                              {tasksInHour.length > 0 && (
                                                  <div className="w-full h-full flex gap-0.5">
                                                      {tasksInHour.slice(0, 2).map((t, idx) => (
                                                          <div 
                                                            key={idx} 
                                                            className="flex-1 h-full rounded-[2px] opacity-80" 
                                                            style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}AA)` }} 
                                                            title={t.name}
                                                          />
                                                      ))}
                                                       {tasksInHour.length > 2 && <div className="w-1 h-full bg-stone-200 rounded-[1px]" />}
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          );
                      })}
                  </div>
             </div>
        </div>
    );
  };

  const DayView = () => (
    <div className="pt-1">
        {HOURS.map(hour => (
        <TimelineRow 
            key={hour} 
            hour={hour} 
            assignedScheduleIds={scheduleData.hours ? (scheduleData.hours[hour] || []) : []} 
            assignedRecordIds={recordData.hours ? (recordData.hours[hour] || []) : []} 
            allTasks={tasks} 
            onScheduleClick={(h) => handleHourClick(h, 'plan')}
            onRecordClick={(h) => handleHourClick(h, 'actual')}
            isScheduleSelected={activeSide === 'plan' && selectedHours.has(hour)}
            isRecordSelected={activeSide === 'actual' && selectedHours.has(hour)}
        />
        ))}
    </div>
  );

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      <aside className={cn("absolute left-0 top-0 bottom-0 w-[240px] bg-white border-r border-stone-200 z-[70] transition-transform duration-200 ease-out", activeSide === 'actual' ? "translate-x-0" : "-translate-x-full")}>
        <PoolContent />
      </aside>

      <aside className={cn("absolute right-0 top-0 bottom-0 w-[240px] bg-white border-l border-stone-200 z-[70] transition-transform duration-200 ease-out", activeSide === 'plan' ? "translate-x-0" : "translate-x-full")}>
        <PoolContent />
      </aside>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white custom-scrollbar">
        <div className="sticky top-0 bg-white/95 z-40 px-4 py-2 border-b border-stone-100 flex items-center justify-between h-12">
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                {(['day', 'week'] as ViewMode[]).map(m => (
                    <button key={m} onClick={() => { setViewMode(m); setActiveSide(null); }} className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all flex items-center gap-1", viewMode === m ? "bg-primary text-white border border-primary" : "text-stone-400 hover:text-stone-600 border border-transparent")}>
                        {m === 'day' ? <Clock size={12} /> : <Columns size={12} />}
                        {m === 'day' ? '日' : '周'}
                    </button>
                ))}
            </div>

            {viewMode === 'day' && (
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-1.5 text-stone-300">
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">安排</span>
                        <ChevronLeft size={12} />
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-300">
                        <ChevronRight size={12} />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">记录</span>
                    </div>
                </div>
            )}
        </div>

        {viewMode === 'day' && <DayView />}
        {viewMode === 'week' && <WeekView />}
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} objectives={objectives} />
    </div>
  );
};
