import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Todo, Objective, Task, ViewMode, HOURS, DayData } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { cn, formatDate, generateId } from '../utils';
import { Plus, Star, List, Check, Timer, Flag, Lock, ListTodo, CornerDownRight, Package, History } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';

type FilterRange = 'today' | 'expired' | 'no-date' | 'recurring' | 'one-time' | 'all';

export interface TodoViewProps {
  todos: Todo[];
  objectives: Objective[];
  tasks: Task[];
  categoryOrder: string[];
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onAddTask?: (task: Omit<Task, 'id'>) => void;
  isTaskPoolOpen: boolean;
  setIsTaskPoolOpen: (open: boolean) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  viewMode?: ViewMode; 
  onViewModeChange?: (mode: ViewMode) => void;
  scheduleData?: DayData;
  recordData?: DayData;
  onUpdateSchedule?: (hour: number, taskIds: string[]) => void;
  allRecords?: Record<string, DayData>;
}

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  objectives,
  tasks,
  categoryOrder,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  isTaskPoolOpen,
  setIsTaskPoolOpen,
  currentDate = new Date(),
  onDateChange,
  viewMode = 'list',
  onViewModeChange,
  scheduleData = { hours: {} },
  recordData = { hours: {} },
  onUpdateSchedule,
  allRecords = {}
}) => {
  const [localViewMode, setLocalViewMode] = useState<ViewMode>(viewMode);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false); 
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterRange>('today');
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (viewMode !== localViewMode) setLocalViewMode(viewMode);
  }, [viewMode]);

  const filterOrder: FilterRange[] = ['today', 'expired', 'no-date', 'recurring', 'one-time', 'all'];
  const filterLabels: Record<FilterRange, string> = {
    today: format(currentDate, 'M月d日'),
    expired: '已过期',
    'no-date': '无日期',
    recurring: '循环',
    'one-time': '单次',
    all: '全部'
  };

  const getObjectiveTitle = (id: string) => {
    if (id === 'none' || id === 'uncategorized' || id === '未分类') return '未分类';
    return objectives.find(o => o.id === id)?.title || '未知分类';
  };

  const taskStats = useMemo(() => {
    const stats: Record<string, { actual: number; goal: number; mode: string; totalActual: number; totalGoal?: number }> = {};
    const recordedValues = new Map<string, number>(); 

    tasks.forEach(t => {
        const hasTotal = t.targets?.totalValue && t.targets.totalValue > 0;
        stats[t.id] = { 
            actual: 0,
            goal: t.targets ? (t.targets.value / (t.targets.frequency || 1)) : 0,
            mode: t.targets?.mode || 'duration',
            totalActual: 0,
            totalGoal: hasTotal ? t.targets?.totalValue : undefined
        };
    });
    
    if (allRecords) {
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
    }

    todos.forEach(t => {
        if (t.isCompleted && t.templateId && stats[t.templateId]) {
            const mode = stats[t.templateId].mode;
            const refDate = t.completedAt || t.startDate; 
            if (mode === 'count') {
                stats[t.templateId].totalActual += 1;
            } else if (mode === 'duration' && refDate) {
                const key = `${t.templateId}_${refDate}`;
                const recorded = recordedValues.get(key) || 0;
                const targetVal = t.targets?.value || 0;
                if (targetVal > recorded) {
                    const diff = targetVal - recorded;
                    stats[t.templateId].totalActual += diff;
                }
            }
        }
    });

    const recordHours = recordData?.hours;
    if (recordHours) {
        HOURS.forEach(h => {
            const rawIds = recordHours[h];
            if (Array.isArray(rawIds)) {
                const ids = rawIds as string[];
                ids.forEach(tid => {
                    if (tid && stats[tid]) {
                        stats[tid].actual += (1 / Math.max(ids.length, 1)); 
                    }
                });
            }
        });
    }

    const dateStr = formatDate(currentDate);
    todos.forEach(t => {
        if (t.startDate === dateStr && t.isCompleted && t.templateId && stats[t.templateId]) {
             if (stats[t.templateId].mode === 'count') {
                 stats[t.templateId].actual += 1;
             } else if (stats[t.templateId].mode === 'duration') {
                 if (stats[t.templateId].actual === 0 && t.targets?.value) {
                     stats[t.templateId].actual = t.targets.value;
                 }
             }
        }
    });

    return stats;
  }, [tasks, recordData, todos, currentDate, allRecords]);

  const filteredTodos = useMemo<(Todo & { isVirtual?: boolean })[]>(() => {
    let result: (Todo & { isVirtual?: boolean })[] = [];
    const selectedDateStr = formatDate(currentDate);
    const realToday = new Date();
    const realTodayStr = formatDate(realToday);
    const isFuture = selectedDateStr > realTodayStr;
    const isSameDate = selectedDateStr === realTodayStr;

    const baseTodos = todos.filter(t => {
      if (localViewMode !== 'list') return t.startDate === selectedDateStr;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'recurring') return !!t.templateId || (t.targets?.frequency || 0) > 0;
      if (activeFilter === 'one-time') return !t.templateId;
      if (activeFilter === 'expired') return !t.isCompleted && t.startDate && t.startDate < realTodayStr;
      if (activeFilter === 'no-date') return !t.startDate;
      if (activeFilter === 'today') return t.startDate === selectedDateStr;
      return false;
    });
    
    result = [...baseTodos];

    if (localViewMode === 'list' && (isFuture || isSameDate)) {
        tasks.filter(t => t.targets && t.targets.value > 0).forEach(task => {
            const isScheduledOnSelectedDate = todos.some(t => 
                t.templateId === task.id && t.startDate === selectedDateStr
            );

            if (!isScheduledOnSelectedDate) {
                const shouldAdd = 
                    activeFilter === 'today' || 
                    activeFilter === 'all' || 
                    activeFilter === 'recurring';

                if (shouldAdd) {
                    result.push({
                        id: `virtual_${task.id}_${selectedDateStr}`,
                        title: task.name,
                        objectiveId: task.category || 'none',
                        isFrog: false,
                        isCompleted: false,
                        subTasks: [],
                        createdAt: new Date().toISOString(),
                        startDate: selectedDateStr,
                        targets: task.targets,
                        templateId: task.id,
                        isVirtual: true
                    });
                }
            }
        });
    }

    if (hideCompleted) result = result.filter(t => !t.isCompleted);
    return result;
  }, [todos, activeFilter, localViewMode, currentDate, hideCompleted, tasks]);

  const groupedTodos = useMemo<Record<string, (Todo & { isVirtual?: boolean })[]>>(() => {
    const groups: Record<string, (Todo & { isVirtual?: boolean })[]> = { 'none': [] };
    categoryOrder.forEach(id => { groups[id] = []; });

    filteredTodos.forEach(todo => {
        const catId = todo.objectiveId || 'none';
        if (!groups[catId]) groups[catId] = [];
        groups[catId].push(todo);
    });

    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            if (a.isFrog !== b.isFrog) return a.isFrog ? -1 : 1;
            if (a.isVirtual !== b.isVirtual) return a.isVirtual ? 1 : -1;
            return 0;
        });
    });

    return groups;
  }, [filteredTodos, categoryOrder]);

  const handleTodoToggle = (t: Todo & { isVirtual?: boolean }) => {
    if (t.isVirtual) return; 
    const todayStr = formatDate(new Date());
    const newIsCompleted = !t.isCompleted;
    onUpdateTodo({ 
        ...t, 
        isCompleted: newIsCompleted, 
        completedAt: newIsCompleted ? todayStr : undefined 
    });
  };

  const handleSubTaskToggle = (e: React.MouseEvent, t: Todo, subTaskId: string) => {
    e.stopPropagation();
    const newSubTasks = t.subTasks.map(st => 
        st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    onUpdateTodo({ ...t, subTasks: newSubTasks });
  };

  const handleFrogToggle = (e: React.MouseEvent, t: Todo & { isVirtual?: boolean }) => {
    e.stopPropagation();
    if (t.isVirtual) return;
    onUpdateTodo({ ...t, isFrog: !t.isFrog });
  };
  
  const handlePointerDown = (t: Todo & { isVirtual?: boolean }) => {
      if (t.isVirtual) return;
      longPressTimer.current = setTimeout(() => {
          setEditingTodo(t);
          setIsTodoModalOpen(true);
          longPressTimer.current = null;
      }, 600);
  };
  
  const handlePointerUp = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };
  
  const handlePointerLeave = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const handleTaskSelect = (task: Task) => {
    const newTodo: Todo = {
        id: generateId(),
        title: task.name,
        objectiveId: task.category || 'none',
        templateId: task.id,
        isFrog: false,
        isCompleted: false,
        subTasks: [],
        createdAt: new Date().toISOString(),
        startDate: formatDate(currentDate),
        targets: task.targets
    };
    onAddTodo(newTodo);
  };

  const ListView = () => (
    <div className="max-w-xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-[11px] font-black text-stone-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <List size={14} strokeWidth={3} className="text-primary" /> 待办清单
            </h2>
            <button onClick={() => setHideCompleted(!hideCompleted)} className="text-[10px] font-black text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest">
                {hideCompleted ? "显示已完成" : "隐藏已完成"}
            </button>
        </div>

        <div className="space-y-10">
            {(Object.entries(groupedTodos) as [string, (Todo & { isVirtual?: boolean })[]][]).map(([catId, todosInCat]) => {
                if (todosInCat.length === 0) return null;
                const obj = objectives.find(o => o.id === catId);
                return (
                    <div key={catId} className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: obj?.color || '#cbd5e1' }} />
                            <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest">
                                {getObjectiveTitle(catId)}
                            </span>
                            <div className="h-px flex-1 bg-stone-100" />
                        </div>
                        <div className="space-y-3">
                            {todosInCat.map(t => {
                                let dailyProgress = 0;
                                let dailyTargetText = '';
                                let totalTargetText = '';
                                let totalProgress = 0;
                                
                                const stats = t.templateId ? taskStats[t.templateId] : null;

                                if (t.targets) {
                                    const dailyGoal = (t.targets.value || 0) / (t.targets.frequency || 1);
                                    let dailyActual = t.currentValue || 0;
                                    
                                    if (stats) dailyActual = stats.actual;
                                    
                                    if (!t.isVirtual && !t.isCompleted && dailyGoal > 0) {
                                        dailyProgress = Math.min((dailyActual / dailyGoal) * 100, 100);
                                    } else if (t.isCompleted) {
                                        dailyProgress = 100;
                                    }
                                    
                                    dailyTargetText = `${dailyActual.toFixed(1)} / ${dailyGoal.toFixed(1)}${t.targets.mode === 'duration' ? 'h' : ''}`;
                                    
                                    if (stats && stats.totalGoal) {
                                        totalTargetText = `${stats.totalActual.toFixed(1)} / ${stats.totalGoal.toFixed(1)}`;
                                        totalProgress = Math.min((stats.totalActual / stats.totalGoal) * 100, 100);
                                    } else if (stats) {
                                        totalTargetText = `${stats.totalActual.toFixed(1)}`;
                                    } else if (t.targets.totalValue) {
                                        totalTargetText = `${t.targets.totalValue}`;
                                    }
                                }

                                const color = obj?.color || '#3b82f6';
                                const isVirtual = !!t.isVirtual;

                                return (
                                    <div key={t.id} 
                                        onClick={() => handleTodoToggle(t)} 
                                        onPointerDown={() => handlePointerDown(t)}
                                        onPointerUp={handlePointerUp}
                                        onPointerLeave={handlePointerLeave}
                                        onContextMenu={(e) => e.preventDefault()}
                                        className={cn(
                                            "group rounded-2xl p-4 flex flex-col gap-2 transition-all border relative overflow-hidden active:scale-[0.98] select-none touch-manipulation",
                                            isVirtual ? "bg-stone-50 border-stone-100 opacity-60 grayscale" : "bg-white border-stone-100 shadow-soft",
                                            t.isFrog && !isVirtual ? "border-amber-200" : "",
                                            t.isCompleted ? "opacity-40" : ""
                                        )}
                                    >
                                        {!isVirtual && dailyProgress > 0 && (
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0 opacity-10" 
                                                style={{ width: `${dailyProgress}%`, backgroundColor: color }} 
                                            />
                                        )}

                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                                isVirtual ? "border-stone-200 text-stone-200" : (t.isCompleted ? "bg-stone-900 border-stone-900" : (t.isFrog ? "border-amber-400 text-amber-500" : "border-stone-200"))
                                            )}>
                                                {isVirtual ? <Lock size={12} /> : (t.isCompleted && <Check size={14} className="text-white" strokeWidth={4} />)}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h3 className={cn("text-sm font-black truncate", t.isCompleted ? "text-stone-400 line-through" : "text-stone-800")}>{t.title}</h3>
                                                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                                                    {dailyTargetText && (
                                                        <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <Timer size={8} /> {dailyTargetText}
                                                        </span>
                                                    )}
                                                    {totalTargetText && (
                                                        <div className="relative overflow-hidden rounded bg-stone-100/50">
                                                             <div className="absolute inset-0 z-0">
                                                                 <div className="h-full bg-primary/20 transition-all duration-500" style={{ width: `${totalProgress}%` }} />
                                                             </div>
                                                             <span className="relative z-10 text-[9px] font-bold text-primary px-1.5 py-0.5 flex items-center gap-1">
                                                                <Flag size={8} /> {totalTargetText}
                                                             </span>
                                                        </div>
                                                    )}
                                                    {isVirtual && <span className="text-[8px] font-bold text-stone-400 italic">预计 {t.startDate} 激活</span>}
                                                </div>
                                            </div>
                                            
                                            {!t.isCompleted && !isVirtual && (
                                                <button onClick={(e) => handleFrogToggle(e, t)} className={cn("p-2 rounded-xl transition-all", t.isFrog ? "text-amber-500 bg-amber-100/50 shadow-inner" : "text-stone-200 hover:text-amber-400")}>
                                                    <Star size={18} fill={t.isFrog ? "currentColor" : "none"} />
                                                </button>
                                            )}
                                        </div>

                                        {!isVirtual && t.subTasks && t.subTasks.length > 0 && (
                                            <div className="mt-1 pl-10 pr-2 space-y-1.5 relative z-10">
                                                {t.subTasks.map(st => (
                                                    <div 
                                                        key={st.id} 
                                                        className="flex items-start gap-2.5 cursor-pointer group/sub"
                                                        onClick={(e) => handleSubTaskToggle(e, t, st.id)}
                                                    >
                                                        <div className={cn(
                                                            "w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                            st.isCompleted 
                                                                ? "bg-stone-400 border-stone-400 text-white" 
                                                                : "border-stone-200 bg-white group-hover/sub:border-primary"
                                                        )}>
                                                            {st.isCompleted && <Check size={10} strokeWidth={4} />}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[11px] font-medium leading-tight transition-colors",
                                                            st.isCompleted ? "text-stone-300 line-through" : "text-stone-600"
                                                        )}>
                                                            {st.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-white overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
            {localViewMode === 'list' && (
                <div className="bg-white px-6 pt-4 pb-3 border-b border-stone-100 shrink-0 z-10 flex justify-center">
                    <div className="inline-flex bg-stone-50 p-1.5 rounded-2xl border border-stone-100 overflow-x-auto no-scrollbar max-w-full">
                        <div className="flex flex-nowrap gap-1.5">
                            {filterOrder.map((range) => (
                                <button key={range} onClick={() => setActiveFilter(range)} className={cn("px-5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase shrink-0", activeFilter === range ? "bg-primary text-white shadow-lg" : "text-stone-400 hover:bg-white/80")}>
                                    {filterLabels[range]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                {localViewMode === 'list' && <ListView />}
                {localViewMode === 'list' && filteredTodos.length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-stone-100 rounded-3xl bg-stone-50/30">
                        <ListTodo size={32} className="text-stone-200 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-300">暂无任务安排</span>
                    </div>
                )}
            </div>
        </div>

        {/* Side Task Pool (Desktop) */}
        <aside className="hidden md:flex flex-col w-[300px] border-l border-stone-100 bg-white shrink-0 overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/30">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <Package size={12} /> 任务库
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {categoryOrder.map(catId => {
                    const obj = objectives.find(o => o.id === catId);
                    const catTasks = tasks.filter(t => t.category === catId);
                    if (catTasks.length === 0) return null;

                    return (
                        <div key={catId} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-tighter">{obj?.title}</span>
                            </div>
                            <div className="space-y-2">
                                {catTasks.map(task => {
                                    const status = getStatusText(task.id);
                                    // 计算侧边栏累计进度
                                    const hasLongTermGoal = task.targets?.totalValue && task.targets.totalValue > 0;
                                    const stats = taskStats[task.id];
                                    const progressPercent = Math.min(((stats?.totalActual || 0) / (task.targets?.totalValue || 1)) * 100, 100);
                                    
                                    return (
                                        <button 
                                            key={task.id}
                                            onClick={() => handleTaskSelect(task)}
                                            className="w-full text-left p-3 bg-stone-50/50 rounded-xl border border-stone-100 hover:border-primary/30 transition-all group active:scale-[0.98] shadow-sm flex flex-col relative overflow-hidden"
                                        >
                                            {/* Integrated Progress Background */}
                                            {hasLongTermGoal && (
                                                <div 
                                                    className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0 opacity-[0.08]"
                                                    style={{ width: `${progressPercent}%`, backgroundColor: task.color }}
                                                />
                                            )}

                                            <div className="relative z-10">
                                                <div className="font-bold text-xs text-stone-700 group-hover:text-primary transition-colors">{task.name}</div>
                                                
                                                {hasLongTermGoal && (
                                                    <div className="mt-2 w-full flex items-center justify-between text-[8px] font-black text-primary/70 mb-1">
                                                        <span>{ (stats?.totalActual || 0).toFixed(1) } / { task.targets?.totalValue?.toFixed(1) }</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 mt-2 text-stone-400">
                                                    <History size={10} />
                                                    <span className="text-[9px] font-bold">{status}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>

        <TodoEditorModal isOpen={isTodoModalOpen} onClose={() => setIsTodoModalOpen(false)} todo={editingTodo} objectives={objectives} onSave={onUpdateTodo} onDelete={onDeleteTodo} frogCount={todos.filter(t => t.isFrog).length} defaultDate={currentDate} />
    </div>
  );
};
