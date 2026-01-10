import React, { useState, useRef, useMemo } from 'react';
import { Task, Objective, Todo, DayData, HOURS } from '../types';
import { X, Plus, Edit2, Layers, CheckCircle, History, Flag } from 'lucide-react';
import { cn, generateId } from '../utils';
import { useModalBackHandler } from '../hooks';
import { TaskEditorModal } from './TaskEditorModal';
import { ObjectiveEditorModal } from './ObjectiveEditorModal';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';

interface TaskPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  objectives: Objective[];
  categoryOrder: string[];
  todos: Todo[];
  allRecords?: Record<string, DayData>;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddObjective: (obj: Objective) => void;
  onUpdateObjective: (obj: Objective) => void;
  onDeleteObjective: (id: string) => void;
  onUpdateCategoryOrder: (order: string[]) => void;
  onSelectTask?: (task: Task) => void;
}

export const TaskPoolModal: React.FC<TaskPoolModalProps> = ({
  isOpen,
  onClose,
  tasks,
  objectives,
  categoryOrder,
  todos,
  allRecords = {},
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
  onUpdateCategoryOrder,
  onSelectTask
}) => {
  useModalBackHandler(isOpen, onClose);
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  
  // Ref for long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 计算任务统计（主要是累计值）
  const taskStats = useMemo(() => {
    const stats: Record<string, { totalActual: number }> = {};
    const recordedValues = new Map<string, number>(); 

    tasks.forEach(t => {
        stats[t.id] = { totalActual: 0 };
    });
    
    // 1. 从 Timeline 记录中汇总
    Object.entries(allRecords).forEach(([dateStr, record]) => {
        const dayData = record as DayData;
        if (!dayData || !dayData.hours) return;
        
        HOURS.forEach(h => {
            const rawIds = dayData.hours[h];
            if (Array.isArray(rawIds)) {
                const ids = rawIds as string[];
                ids.forEach(tid => { 
                    if (tid && stats[tid]) {
                        const increment = 1 / Math.max(ids.length, 1);
                        stats[tid].totalActual += increment;
                        const key = `${tid}_${dateStr}`;
                        recordedValues.set(key, (recordedValues.get(key) || 0) + increment);
                    }
                });
            }
        });
    });

    // 2. 从已完成的 Todo 中补充（如果 Todo 完成了但没在 timeline 上记录，或者 count 模式）
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
                // 如果打卡记录少于目标值，将差额补齐到累计值
                if (targetVal > recorded) {
                    stats[t.templateId].totalActual += (targetVal - recorded);
                }
            }
        }
    });

    return stats;
  }, [tasks, todos, allRecords]);

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

  if (!isOpen) return null;

  const sortedObjectives = [...objectives].sort((a, b) => {
        const idxA = categoryOrder.indexOf(a.id);
        const idxB = categoryOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  const visibleTasks = tasks.filter(t => {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'none') return !t.category || t.category === 'none' || t.category === 'uncategorized';
      return t.category === activeCategory;
  });

  const handleTaskPointerDown = (task: Task) => {
    longPressTimer.current = setTimeout(() => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
        longPressTimer.current = null;
    }, 600);
  };

  const handleTaskPointerUp = (task: Task) => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        if (onSelectTask) {
            onSelectTask(task);
        } else {
             setEditingTask(task);
             setIsTaskModalOpen(true);
        }
    }
  };
  
  const handleTaskPointerLeave = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[85vh] border border-stone-300 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <header className="flex flex-col border-b border-stone-100 bg-white shrink-0">
            <div className="px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-stone-900" />
                    <h3 className="font-black text-stone-800 text-[13px]">任务库</h3>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400"><X size={18} /></button>
            </div>
            
            <div className="px-4 pb-3 flex overflow-x-auto no-scrollbar gap-2">
                <button onClick={() => setActiveCategory('all')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0", activeCategory === 'all' ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100")}>全部</button>
                {sortedObjectives.map(obj => (
                    <button key={obj.id} onClick={() => setActiveCategory(obj.id)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5", activeCategory === obj.id ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100")} onContextMenu={(e) => { e.preventDefault(); setEditingObjective(obj); setIsObjModalOpen(true); }}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", activeCategory === obj.id ? "bg-white" : "")} style={{ backgroundColor: activeCategory === obj.id ? undefined : obj.color }} />
                        {obj.title}
                    </button>
                ))}
                <button onClick={() => setActiveCategory('none')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0", activeCategory === 'none' ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100")}>未分类</button>
                <button onClick={() => { setEditingObjective(null); setIsObjModalOpen(true); }} className="px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0 bg-white border-dashed border-stone-200 text-stone-400 hover:text-primary hover:border-primary">+ 分类</button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-stone-50/30">
            <div className="grid grid-cols-2 gap-2.5">
                {visibleTasks.map(task => {
                    const status = getStatusText(task.id);
                    const stats = taskStats[task.id];
                    const hasLongTermGoal = task.targets?.totalValue && task.targets.totalValue > 0;
                    const totalActual = stats?.totalActual || 0;
                    const totalGoal = task.targets?.totalValue;
                    const progressPercent = Math.min((totalActual / (totalGoal || 1)) * 100, 100);

                    return (
                        <div 
                            key={task.id}
                            onPointerDown={() => handleTaskPointerDown(task)}
                            onPointerUp={() => handleTaskPointerUp(task)}
                            onPointerLeave={handleTaskPointerLeave}
                            className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex flex-col gap-1 active:scale-95 transition-transform cursor-pointer select-none group relative overflow-hidden"
                        >
                            {/* Integrated Background Progress */}
                            {hasLongTermGoal && (
                                <div 
                                    className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0 opacity-[0.12]"
                                    style={{ width: `${progressPercent}%`, backgroundColor: task.color }}
                                />
                            )}
                            
                            <div className="relative z-10">
                                <h4 className="font-black text-stone-800 text-xs truncate">{task.name}</h4>
                                
                                {hasLongTermGoal && (
                                    <div className="mt-1.5 flex items-center gap-1 text-[8px] font-black text-primary/70">
                                        <Flag size={8} /> 
                                        <span>{totalActual.toFixed(1)} / {totalGoal?.toFixed(1)}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5 mt-1.5 text-stone-400">
                                    <History size={10} />
                                    <span className="text-[9px] font-bold">{status}</span>
                                </div>
                            </div>
                            <Edit2 size={10} className="text-stone-200 opacity-0 group-hover:opacity-100 absolute right-2 top-2" />
                        </div>
                    );
                })}
                
                <button onClick={() => { setEditingTask({ id: '', name: '', color: '#3b82f6', category: activeCategory !== 'all' && activeCategory !== 'none' ? activeCategory : 'none', targets: undefined } as Task); setIsTaskModalOpen(true); }} className="h-14 rounded-xl border border-dashed border-stone-200 flex items-center justify-center gap-1.5 text-stone-400 hover:border-primary hover:text-primary hover:bg-white transition-all active:scale-95">
                    <Plus size={16} /> <span className="text-[10px] font-black">新建任务</span>
                </button>
            </div>
        </div>
        
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 text-center shrink-0">
             <span className="text-[9px] font-bold text-stone-400">长按卡片可编辑任务详情，点击添加到今日</span>
        </div>
      </div>

      <TaskEditorModal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} task={editingTask} onSave={(task) => { if (editingTask && editingTask.id) onUpdateTask(task); else onAddTask(task); }} onDelete={onDeleteTask} objectives={objectives} onAddObjective={onAddObjective} />
      <ObjectiveEditorModal isOpen={isObjModalOpen} onClose={() => { setIsObjModalOpen(false); setEditingObjective(null); }} objective={editingObjective} onSave={(obj) => { if (editingObjective) onUpdateObjective(obj); else onAddObjective(obj); }} onDelete={onDeleteObjective} zIndex={210} />
    </div>
  );
};
