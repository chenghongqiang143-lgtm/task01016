
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Todo, Objective, Task, ViewMode } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { cn, generateId, formatDate } from '../utils';
import { Plus, Circle, Star, X, LayoutGrid, Trash2, ChevronRight, List, Clock, Repeat, Hash, CheckSquare, History, Layers, CalendarRange, CalendarDays, ListTodo, CheckCircle2, Lock, CalendarClock, Flag, AlertCircle, Edit2, TrendingUp, Hourglass, Eye, EyeOff } from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, differenceInCalendarDays, subDays, addDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type FilterRange = 'today' | 'expired' | 'no-date' | 'recurring' | 'all';

export interface TodoViewProps {
  todos: Todo[];
  objectives: Objective[];
  tasks: Task[];
  categoryOrder: string[];
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onAddTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onUpdateObjective?: (obj: Objective) => void;
  onDeleteObjective?: (id: string) => void;
  isTaskPoolOpen: boolean;
  setIsTaskPoolOpen: (open: boolean) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  viewMode?: ViewMode; // Received from App
}

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  objectives,
  tasks,
  categoryOrder,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateObjective,
  onDeleteObjective,
  isTaskPoolOpen,
  setIsTaskPoolOpen,
  currentDate = new Date(),
  onDateChange,
  viewMode = 'list'
}) => {
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false); 
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  
  const [activeFilter, setActiveFilter] = useState<FilterRange>('today');
  const [poolCategory, setPoolCategory] = useState<string>('');
  
  // Ref to track if current interaction is a long press
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize pool category to first available
  useEffect(() => {
    if (!poolCategory && categoryOrder.length > 0) {
        setPoolCategory(categoryOrder[0]);
    }
  }, [categoryOrder, poolCategory]);

  // Updated Filter Order
  const filterOrder: FilterRange[] = ['today', 'expired', 'no-date', 'recurring', 'all'];
  
  // Dynamic Label for "Today" to show selected date
  const filterLabels: Record<FilterRange, string> = {
    today: format(currentDate, 'M月d日'),
    expired: '已过期',
    'no-date': '无日期',
    recurring: '循环',
    all: '全部'
  };

  const filteredTodos = useMemo(() => {
    let result = [];
    const selectedDateStr = formatDate(currentDate);
    const realTodayStr = formatDate(new Date());

    // If in List mode, use filters. If in Week/Month, show selected date's tasks.
    if (viewMode !== 'list') {
        result = todos.filter(t => t.startDate === selectedDateStr);
    } else {
        result = todos.filter(t => {
          if (activeFilter === 'all') return true;
          if (activeFilter === 'recurring') return !!t.templateId || (t.targets?.frequency || 0) > 0;
          if (activeFilter === 'expired') return !t.isCompleted && t.startDate && t.startDate < realTodayStr;
          if (activeFilter === 'no-date') return !t.startDate;
          if (activeFilter === 'today') return t.startDate === selectedDateStr;
          return false;
        });
    }

    // Apply Hide Completed Filter
    if (hideCompleted) {
        result = result.filter(t => !t.isCompleted);
    }

    // Sort: Frogs first, then Uncompleted first
    return result.sort((a, b) => {
        // 1. Frogs (Important) first
        if (a.isFrog !== b.isFrog) {
            return a.isFrog ? -1 : 1;
        }
        // 2. Uncompleted first (within same importance level)
        if (a.isCompleted !== b.isCompleted) {
             return a.isCompleted ? 1 : -1;
        }
        return 0;
    });
  }, [todos, activeFilter, viewMode, currentDate, hideCompleted]);

  const sortedObjectives = useMemo(() => {
    return categoryOrder
      .map(id => objectives.find(o => o.id === id))
      .filter((o): o is Objective => !!o);
  }, [categoryOrder, objectives]);

  const frogs = useMemo(() => todos.filter(t => t.isFrog && !t.isCompleted), [todos]);

  const poolTasks = useMemo(() => {
    if (poolCategory === 'uncategorized') {
        return tasks.filter(t => !t.category || t.category === 'none' || t.category === 'uncategorized' || !objectives.find(o => o.id === t.category));
    }
    return tasks.filter(t => t.category === poolCategory);
  }, [tasks, poolCategory, objectives]);

  // Helper to find task by ID - Define BEFORE usage in accumulators
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(t => map.set(t.id, t));
    return map;
  }, [tasks]);

  // Calculate Global Accumulated Progress for Templates
  const accumulatedStats = useMemo(() => {
    const stats: Record<string, number> = {};
    todos.forEach(t => {
        if (t.isCompleted && t.templateId) {
            // Determine value contribution of this completed task
            // Default to 1 (count) or targets.value (duration/count)
            // Use optional chaining carefully
            const taskTemplate = taskMap.get(t.templateId);
            const val = t.targets?.value || taskTemplate?.targets?.value || 1;
            stats[t.templateId] = (stats[t.templateId] || 0) + val;
        }
    });
    return stats;
  }, [todos, taskMap]);

  // Calculate task pool progress
  const poolProgressMap = useMemo(() => {
    const stats: Record<string, { type: 'long-term' | 'daily', value: number, total: number }> = {};
    const todayStr = formatDate(currentDate);

    // Helpers to aggregate data
    const dailyStats: Record<string, { completed: number, total: number }> = {};

    todos.forEach(t => {
        // Resolve Template ID
        let tid = t.templateId;
        if (!tid) {
            // Fallback by name
            const template = tasks.find(tsk => tsk.name === t.title);
            if (template) tid = template.id;
        }

        if (!tid) return;

        // Daily Aggregation
        if (t.startDate === todayStr) {
            if (!dailyStats[tid]) dailyStats[tid] = { total: 0, completed: 0 };
            dailyStats[tid].total += 1;
            if (t.isCompleted) dailyStats[tid].completed += 1;
        }
    });

    // Construct final stats map
    tasks.forEach(task => {
        if (task.targets?.totalValue && task.targets.totalValue > 0) {
             stats[task.id] = {
                 type: 'long-term',
                 value: accumulatedStats[task.id] || 0,
                 total: task.targets.totalValue
             };
        } else if (dailyStats[task.id]) {
             stats[task.id] = {
                 type: 'daily',
                 value: dailyStats[task.id].completed,
                 total: dailyStats[task.id].total
             };
        }
    });

    return stats;
  }, [todos, tasks, currentDate, accumulatedStats]);

  // Calculate the last completed date for each task template
  const taskLastDoneMap = useMemo(() => {
    const map: Record<string, string> = {}; // taskId -> max(completedAt)
    const nameMap: Record<string, string> = {}; // taskName -> max(completedAt)
    
    todos.forEach(t => {
        if (t.isCompleted && t.completedAt) {
            if (t.templateId) {
                const currentMax = map[t.templateId];
                if (!currentMax || t.completedAt > currentMax) {
                    map[t.templateId] = t.completedAt;
                }
            }
            if (t.title) {
                const trimmedName = t.title.trim();
                const currentNameMax = nameMap[trimmedName];
                if (!currentNameMax || t.completedAt > currentNameMax) {
                    nameMap[trimmedName] = t.completedAt;
                }
            }
        }
    });
    return { byId: map, byName: nameMap };
  }, [todos]);

  // --- 处理函数 ---
  
  const handleTemplateClick = (task: Task) => {
    if (isLongPress.current) return;
    if (window.innerWidth < 1024) {
        setIsTaskPoolOpen(false);
    }
    
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

  const handlePointerDown = (item: Task | Todo | Objective, type: 'task' | 'todo' | 'objective') => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (type === 'task') {
        setEditingTask(item as Task);
        setIsTaskEditorOpen(true);
      } else if (type === 'todo') {
        setEditingTodo(item as Todo);
        setIsTodoModalOpen(true);
      } else if (type === 'objective') {
        setEditingObjective(item as Objective);
        setIsObjModalOpen(true);
      }
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTodoClick = (t: Todo) => {
    if (isLongPress.current) return;

    const todayStr = formatDate(new Date());
    const isFuture = t.startDate && t.startDate > todayStr;
    
    if (isFuture && !t.isCompleted) {
         return; 
    }

    const newIsCompleted = !t.isCompleted;

    onUpdateTodo({ 
        ...t, 
        isCompleted: newIsCompleted, 
        completedAt: newIsCompleted ? todayStr : undefined 
    });

    // Handle Recurring Logic
    if (newIsCompleted) {
        let frequency = t.targets?.frequency;
        
        if (!frequency && t.templateId) {
            const template = tasks.find(task => task.id === t.templateId);
            frequency = template?.targets?.frequency;
        }

        if (frequency && frequency > 0) {
            let currentStartDate = new Date();
            // Safe Date Parsing
            if (t.startDate) {
                const parsed = parseISO(t.startDate);
                if (!isNaN(parsed.getTime())) {
                    currentStartDate = parsed;
                }
            }

            const nextStartDate = addDays(currentStartDate, frequency);
            const nextStartDateStr = formatDate(nextStartDate);

            const exists = todos.some(existing => {
                const sameDate = existing.startDate === nextStartDateStr;
                const sameId = t.templateId ? (existing.templateId === t.templateId) : (existing.title === t.title);
                return sameDate && sameId;
            });

            if (!exists) {
                const newSubTasks = t.subTasks?.map(st => ({ ...st, isCompleted: false })) || [];
                const newTodo: Todo = {
                    ...t,
                    id: generateId(),
                    isCompleted: false,
                    completedAt: undefined,
                    startDate: nextStartDateStr,
                    createdAt: new Date().toISOString(),
                    subTasks: newSubTasks,
                    currentValue: undefined, 
                    actualStartDate: undefined 
                };
                onAddTodo(newTodo);
            }
        }
    }
  };

  const toggleSubTask = (todo: Todo, subTaskId: string) => {
      const newSubTasks = todo.subTasks?.map(st => st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st) || [];
      onUpdateTodo({ ...todo, subTasks: newSubTasks });
  };

  const getTimeAgoLabel = (lastDoneDate: string | undefined) => {
      if (!lastDoneDate) return null;
      try {
          const diff = differenceInCalendarDays(new Date(), parseISO(lastDoneDate));
          if (diff === 0) return '今天';
          if (diff === 1) return '昨天';
          return `${diff}天前`;
      } catch (e) {
          return null;
      }
  };

  // --- 组件 ---

  const renderTodoCard = (t: Todo, isHighlighted: boolean) => {
    const objective = objectives.find(o => o.id === t.objectiveId);
    const borderColor = objective ? objective.color : '#e7e5e4';
    const todayStr = formatDate(new Date());
    const isFuture = !t.isCompleted && t.startDate && t.startDate > todayStr;
    const isRecurring = !!t.templateId || (t.targets?.frequency || 0) > 0;
    
    let totalGoal = t.targets?.totalValue;
    let currentVal = t.currentValue || 0;
    let hasProgress = !!totalGoal;
    
    if (t.templateId && totalGoal && totalGoal > 0) {
        const historyVal = accumulatedStats[t.templateId] || 0;
        if (t.isCompleted) {
            currentVal = historyVal;
        } else {
            currentVal = historyVal + (t.currentValue || 0);
        }
    }

    // Safe division
    const progressPercent = (totalGoal && totalGoal > 0) ? Math.min((currentVal / totalGoal) * 100, 100) : 0;
    
    const deadlineStr = t.targets?.deadline;
    let remainingDays: number | null = null;
    if (deadlineStr) {
        try {
            remainingDays = Math.max(differenceInCalendarDays(parseISO(deadlineStr), new Date()), 0);
        } catch (e) { remainingDays = null; }
    }

    const remainingAmount = totalGoal ? Math.max(totalGoal - currentVal, 0) : 0;
    const dailyTarget = (remainingDays !== null && remainingDays > 0) ? (remainingAmount / remainingDays).toFixed(1) : remainingAmount;
    
    let actualDuration: number | null = null;
    if (t.actualStartDate) {
        try {
            actualDuration = differenceInCalendarDays(new Date(), parseISO(t.actualStartDate)) + 1;
        } catch (e) { actualDuration = null; }
    }

    return (
        <div key={t.id} 
            onClick={() => handleTodoClick(t)} 
            onPointerDown={() => handlePointerDown(t, 'todo')}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={cn(
                "group rounded-xl py-1.5 px-3 flex flex-col gap-1 mb-1 shadow-sm transition-all select-none touch-manipulation border-l-[3px] border-t border-r border-b relative overflow-hidden",
                isFuture
                    ? "bg-stone-50/50 border-stone-100 border-dashed cursor-not-allowed grayscale opacity-80"
                    : (isHighlighted 
                        ? "bg-amber-50 border-t-amber-100 border-r-amber-100 border-b-amber-100 cursor-pointer" 
                        : "bg-white border-t-stone-100 border-r-stone-100 border-b-stone-100 cursor-pointer")
            )}
            style={{ borderLeftColor: isFuture ? '#d6d3d1' : (isHighlighted ? '#f59e0b' : borderColor) }}
        >
            {/* Integrated Progress Background */}
            {hasProgress && !isFuture && !t.isCompleted && !isNaN(progressPercent) && (
                <div 
                    className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0 opacity-10"
                    style={{ 
                        width: `${progressPercent}%`, 
                        backgroundColor: objective?.color || '#3b82f6'
                    }}
                />
            )}

            <div className="flex items-center gap-2.5 relative z-10">
                <div className="shrink-0">
                    {isFuture ? (
                        <Lock size={16} className="text-stone-300" />
                    ) : (
                        isHighlighted ? (
                            <Circle size={16} className="text-amber-400 fill-amber-50" strokeWidth={2} />
                        ) : (
                            <Circle size={16} className="text-stone-300 hover:text-indigo-500 transition-colors" strokeWidth={2} />
                        )
                    )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className={cn(
                        "text-xs font-bold leading-tight truncate",
                        isFuture ? "text-stone-400" : "text-stone-800",
                        t.isCompleted && "line-through text-stone-400"
                    )}>
                        {t.title}
                    </span>
                    
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                         {t.startDate && (
                            <span className={cn(
                                "text-[9px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded leading-none",
                                isFuture ? "bg-stone-100 text-stone-400" : "bg-stone-50 text-stone-400"
                            )}>
                                {isFuture && <CalendarClock size={8} />}
                                {t.startDate.substring(5)}
                            </span>
                         )}
                         {/* Simple Target Display if no progress bar */}
                         {t.targets && (t.targets.value > 0) && !hasProgress && (
                             <span className="text-[9px] font-medium text-stone-400 flex items-center gap-0.5 bg-stone-50 px-1 py-0.5 rounded leading-none">
                                 {t.targets?.mode === 'duration' ? <Clock size={8} /> : <Hash size={8} />}
                                 {t.targets?.value}
                             </span>
                         )}
                         
                         {/* Quantified Progress Indicators (Accumulated) */}
                         {hasProgress && (
                             <div className="flex gap-1">
                                <span className="text-[9px] font-black text-indigo-500 flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded leading-none border border-indigo-100">
                                    <Flag size={8} />
                                    {Number(currentVal.toFixed(1))}/{totalGoal}
                                    <span className="opacity-60 text-[8px] ml-0.5">{isNaN(progressPercent) ? 0 : Math.round(progressPercent)}%</span>
                                </span>
                                {remainingDays !== null && (
                                    <span className="text-[9px] font-black text-amber-500 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded leading-none border border-amber-100">
                                        <Hourglass size={8} />
                                        剩{remainingDays}天
                                    </span>
                                )}
                                {dailyTarget !== 0 && remainingDays !== null && remainingDays > 0 && (
                                    <span className="text-[9px] font-black text-emerald-500 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded leading-none border border-emerald-100">
                                        <TrendingUp size={8} />
                                        {Math.ceil(Number(dailyTarget))}/日
                                    </span>
                                )}
                             </div>
                         )}
                         
                         {/* Actual Days Display */}
                         {actualDuration !== null && (
                             <span className="text-[9px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded leading-none bg-blue-50 text-blue-400">
                                 <History size={8} />
                                 已行{actualDuration}天
                             </span>
                         )}

                         {isRecurring && (
                             <span className={cn(
                                 "text-[9px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded leading-none",
                                 isFuture ? "bg-purple-50 text-purple-300" : "bg-stone-50 text-stone-400"
                             )}>
                                 <Repeat size={8} />
                                 {t.targets?.frequency ? `${t.targets.frequency}d` : ''}
                             </span>
                         )}
                         {t.targets?.deadline && !hasProgress && (
                             <span className="text-[9px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded leading-none bg-rose-50 text-rose-400">
                                 <AlertCircle size={8} />
                                 {t.targets.deadline.substring(5)}
                             </span>
                         )}
                    </div>
                </div>

                <div className="flex items-center gap-0.5">
                    {!isFuture && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onUpdateTodo({ ...t, isFrog: !t.isFrog }); }}
                            className={cn("p-1.5 rounded-lg transition-colors z-10", t.isFrog ? "text-amber-400" : "text-stone-200 hover:text-amber-300")}
                            title={t.isFrog ? "取消重点" : "标记重点"}
                        >
                            <Star size={14} fill={t.isFrog ? "currentColor" : "none"} />
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteTodo(t.id); }} 
                        className="p-1.5 text-stone-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors z-10"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {t.subTasks && t.subTasks.length > 0 && !isFuture && (
                <div className="ml-7 space-y-1 mt-0.5 border-t border-dashed border-stone-100 pt-1.5 relative z-10" onClick={(e) => e.stopPropagation()}>
                    {t.subTasks.map(st => (
                         <div key={st.id} className="flex items-center gap-2 group/sub" onClick={() => toggleSubTask(t, st.id)}>
                            <div className={cn("shrink-0 transition-colors", st.isCompleted ? "text-emerald-500" : "text-stone-300")}>
                                <CheckSquare size={10} fill={st.isCompleted ? "currentColor" : "none"} className={st.isCompleted ? "text-white" : ""} />
                            </div>
                            <span className={cn("text-[9px] font-medium transition-all", st.isCompleted ? "text-stone-300 line-through" : "text-stone-500")}>
                                {st.title}
                            </span>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
  };

  const renderTaskPool = () => (
    <div className="flex flex-col h-full bg-stone-50/50">
        {/* Unified Compact Header & Category Tabs */}
        <div className="h-11 border-b border-stone-100 flex items-center bg-white sticky top-0 z-20 shrink-0 gap-2 px-2 shadow-sm">
             <div className="flex items-center justify-center w-8 h-8 shrink-0 text-stone-400" title="任务库">
                <LayoutGrid size={18} />
             </div>

             <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar mask-gradient-x items-center h-full">
                {sortedObjectives.map(obj => (
                    <button 
                        key={obj.id}
                        onClick={() => { if (!isLongPress.current) setPoolCategory(obj.id); }}
                        onPointerDown={() => handlePointerDown(obj, 'objective')}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-[9px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 select-none touch-manipulation",
                            poolCategory === obj.id ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
                        )}
                    >
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: obj.color }} />
                       {obj.title}
                    </button>
                ))}
                 <button 
                    onClick={() => setPoolCategory('uncategorized')}
                    className={cn(
                        "px-2.5 py-1 rounded-md text-[9px] font-bold whitespace-nowrap transition-all border",
                        poolCategory === 'uncategorized' ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
                    )}
                >
                    未分类
                </button>
             </div>

             <button 
                onClick={() => { 
                    const initialCat = poolCategory === 'uncategorized' ? '' : poolCategory;
                    const catObj = objectives.find(o => o.id === initialCat);
                    const initialColor = catObj ? catObj.color : '#3b82f6';
                    setEditingTask({ id: '', name: '', color: initialColor, category: initialCat } as Task);
                    setIsTaskEditorOpen(true); 
                }} 
                className="w-8 h-8 shrink-0 flex items-center justify-center bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 hover:text-stone-900 transition-all active:scale-95" 
                title="添加行为"
            >
                <Plus size={16} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <div className="grid grid-cols-1 gap-2">
                {poolTasks.length === 0 ? (
                    <div className="py-10 text-center">
                        <span className="text-[10px] text-stone-300 font-bold uppercase">此分类下暂无行为模板</span>
                    </div>
                ) : (
                    poolTasks.map(task => {
                        const lastDoneById = taskLastDoneMap.byId[task.id];
                        const lastDoneByName = taskLastDoneMap.byName[task.name.trim()];
                        const lastDoneDate = lastDoneById || lastDoneByName;
                        const lastDoneText = getTimeAgoLabel(lastDoneDate);
                        const displayStatus = lastDoneText || '未开始';
                        
                        // Pool Progress Logic
                        const stats = poolProgressMap[task.id];
                        const hasStats = !!stats;
                        
                        let progressPercent = 0;
                        let displayValue = "";
                        let isDone = false;

                        if (hasStats) {
                            const total = stats.total || 1;
                            progressPercent = Math.min((stats.value / total) * 100, 100);
                            isDone = stats.value >= stats.total;
                            
                            if (stats.type === 'long-term') {
                                const mode = task.targets?.mode || 'duration';
                                const unit = mode === 'duration' ? 'h' : '';
                                displayValue = `${Number(stats.value.toFixed(1))}/${stats.total}${unit}`;
                            } else {
                                displayValue = `${stats.value}/${stats.total}`;
                            }
                        } else {
                            displayValue = displayStatus;
                        }

                        return (
                            <div 
                                key={task.id} 
                                onClick={() => handleTemplateClick(task)} 
                                onPointerDown={() => handlePointerDown(task, 'task')}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                                className="group p-3 bg-white border border-stone-100 rounded-xl flex items-center justify-between hover:border-stone-300 transition-all cursor-pointer shadow-sm relative overflow-hidden select-none active:scale-95 touch-manipulation"
                            >
                                {/* Progress Background */}
                                {hasStats && !isNaN(progressPercent) && (
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0"
                                        style={{ 
                                            width: `${progressPercent}%`, 
                                            backgroundColor: `${task.color}15`
                                        }}
                                    />
                                )}

                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color }} />
                                
                                <div className="flex items-center gap-2 flex-1 min-w-0 ml-2 relative z-10">
                                    <span className="text-[12px] font-bold text-stone-800 truncate">{task.name}</span>
                                    {hasStats && (
                                        <span className="text-[9px] font-black text-stone-400 bg-white/50 px-1 rounded border border-stone-100/50">
                                            {stats.type === 'long-term' ? '总' : '今'} {displayValue}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 relative z-10">
                                    <div className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors",
                                        (hasStats && isDone)
                                            ? "bg-emerald-50 text-emerald-500 border-emerald-100"
                                            : (hasStats 
                                                ? "bg-amber-50 text-amber-500 border-amber-100"
                                                : "bg-stone-50 text-stone-400 border-stone-200")
                                    )}>
                                        {(hasStats && isDone) ? <CheckCircle2 size={10} /> : <History size={10} />}
                                        <span className="text-[9px] font-bold">
                                            {hasStats ? `${Math.round(progressPercent)}%` : displayValue}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsTaskEditorOpen(true); }}
                                        className="p-1.5 text-stone-300 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors z-20"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    </div>
  );

  const renderTodoListItems = () => (
    <div className="p-4 pb-32 space-y-2">
       {filteredTodos.length === 0 ? (
           <div className="py-12 flex flex-col items-center justify-center text-stone-300 opacity-60">
               <ListTodo size={48} strokeWidth={1} className="mb-2" />
               <p className="text-xs font-bold uppercase tracking-widest">
                   {viewMode === 'list' 
                       ? (activeFilter === 'today' ? '暂无任务 (或已隐藏)' : '列表为空')
                       : '此日暂无安排'
                   }
               </p>
           </div>
       ) : (
           filteredTodos.map(todo => renderTodoCard(todo, false))
       )}
    </div>
  );

  const WeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
        <div className="flex h-full">
             {days.map(day => {
                 const isSelected = isSameDay(day, currentDate);
                 const isToday = isSameDay(day, new Date());
                 const dayTodos = todos.filter(t => t.startDate === formatDate(day));
                 const hasTodos = dayTodos.length > 0;
                 const completionRate = hasTodos ? (dayTodos.filter(t => t.isCompleted).length / dayTodos.length) : 0;

                 return (
                     <div 
                        key={day.toString()} 
                        onClick={() => onDateChange && onDateChange(day)}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center cursor-pointer border-r border-stone-50 transition-all relative",
                            isSelected ? "bg-stone-50" : "hover:bg-stone-50/50"
                        )}
                     >
                         <span className={cn("text-[10px] font-black uppercase mb-1", isToday ? "text-primary" : "text-stone-400")}>
                             {format(day, 'EEE', { locale: zhCN })}
                         </span>
                         <div className={cn(
                             "w-8 h-8 flex items-center justify-center rounded-full text-sm font-black transition-all relative z-10",
                             isSelected ? "bg-primary text-white shadow-lg scale-110" : (isToday ? "text-primary bg-primary/10" : "text-stone-600")
                         )}>
                             {format(day, 'd')}
                         </div>
                         
                         <div className="flex gap-0.5 mt-1.5 h-1">
                             {hasTodos && (
                                 <div className={cn("w-1 h-1 rounded-full", completionRate === 1 ? "bg-emerald-400" : "bg-stone-300")} />
                             )}
                         </div>
                         
                         {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                     </div>
                 );
             })}
        </div>
    );
  };

  const MonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

    return (
        <div className="p-4 pb-0">
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-stone-300">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = isSameDay(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const dayTodos = todos.filter(t => t.startDate === formatDate(day));
                    const completed = dayTodos.filter(t => t.isCompleted).length;
                    const total = dayTodos.length;
                    
                    return (
                        <div 
                            key={day.toString()}
                            onClick={() => onDateChange && onDateChange(day)}
                            className={cn(
                                "aspect-square rounded-xl border flex flex-col items-center justify-between p-1 cursor-pointer transition-all relative overflow-hidden",
                                !isCurrentMonth && "opacity-30 grayscale",
                                isSelected 
                                    ? "bg-primary text-white shadow-md z-10 border-transparent" 
                                    : "border-stone-100 hover:border-stone-300 bg-white"
                            )}
                        >
                            <span className={cn(
                                "text-[12px] font-bold z-10", 
                                isSelected ? "text-white" : (isToday ? "text-primary" : "text-stone-600")
                            )}>
                                {format(day, 'd')}
                            </span>
                            
                            {total > 0 && (
                                <div className="w-full flex flex-col items-center gap-0.5 z-10">
                                     <div className="flex gap-0.5 max-w-full flex-wrap justify-center px-0.5">
                                         {dayTodos.slice(0, 3).map((t, i) => (
                                             <div key={i} className={cn("w-1 h-1 rounded-full", t.isCompleted ? "bg-emerald-400" : "bg-stone-300")} />
                                         ))}
                                         {total > 3 && <div className={cn("w-0.5 h-0.5 rounded-full", isSelected ? "bg-white/50" : "bg-stone-300")} />}
                                     </div>
                                </div>
                            )}

                            {total > 0 && !isSelected && (
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-stone-100 transition-all"
                                    style={{ height: `${(completed/total) * 100}%`, opacity: 0.3 }}
                                />
                            )}
                            {total > 0 && isSelected && (
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-white transition-all"
                                    style={{ height: `${(completed/total) * 100}%`, opacity: 0.2 }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* 统一视图控制 Toolbar - Only visible in List Mode */}
       {viewMode === 'list' && (
           <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 px-4 py-2 border-b border-stone-100 flex items-center justify-between shrink-0 gap-3 h-12">
              <div className="flex-1"></div>
              
              <div className="flex items-center gap-2 flex-1 justify-end">
                  {/* Hide Completed Toggle */}
                  <button 
                      onClick={() => setHideCompleted(!hideCompleted)}
                      className={cn(
                          "w-8 h-7 flex items-center justify-center rounded-lg border transition-all",
                          hideCompleted 
                              ? "bg-primary text-white border-primary shadow-sm" 
                              : "bg-white text-stone-400 border-stone-200 hover:text-stone-600"
                      )}
                      title={hideCompleted ? "显示已完成" : "隐藏已完成"}
                  >
                      {hideCompleted ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>

                  {/* Filters - Only for List View */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pl-2 min-w-0">
                      {filterOrder.map((range) => (
                          <button 
                            key={range} 
                            onClick={() => setActiveFilter(range)} 
                            className={cn(
                                "px-3.5 py-1.5 rounded-full text-[11px] font-black border transition-all uppercase whitespace-nowrap shrink-0", 
                                activeFilter === range ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                            )}
                          >
                            {filterLabels[range]}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
       )}

      {/* Main Content & Sidebar Layout */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-w-0">
            {/* Calendar Areas (Takes upper part in Week mode) */}
            {viewMode === 'week' && (
                <div className="shrink-0 h-20 border-b border-stone-200 shadow-sm z-10">
                    <WeekView />
                </div>
            )}
            
            {/* List Content */}
            {viewMode === 'list' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {renderTodoListItems()}
                </div>
            )}

            {viewMode === 'week' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {renderTodoListItems()}
                </div>
            )}

            {viewMode === 'month' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <MonthView />
                    <div className="min-h-[300px] border-t border-stone-100 bg-white">
                        <div className="px-5 py-3 border-b border-stone-50 bg-stone-50/30 sticky top-0 z-10 backdrop-blur-sm">
                            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                <CalendarDays size={12} /> {format(currentDate, 'M月d日')} 任务列表
                            </h3>
                        </div>
                        {renderTodoListItems()}
                    </div>
                </div>
            )}
        </div>

        {/* Desktop/Tablet Sidebar (Replaces Modal on large screens) */}
        {viewMode === 'list' && (
             <div className={cn(
                 "hidden lg:flex border-l border-stone-200 bg-stone-50/50 flex-col transition-all duration-300 ease-in-out shadow-[-10px_0_40px_rgba(0,0,0,0.03)]",
                 isTaskPoolOpen ? "w-[320px] opacity-100" : "w-0 opacity-0 overflow-hidden"
             )}>
                 {/* Re-using renderTaskPool with slight adjustments implied by its structure */}
                 {renderTaskPool()}
             </div>
        )}
      </div>

      {/* 移动端任务库抽屉 (仅在 List 视图下显示且是小屏幕) */}
      {viewMode === 'list' && isTaskPoolOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md h-[70vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
               <div className="flex justify-between items-center px-4 py-3 bg-stone-50 border-b border-stone-100 shrink-0">
                   <h3 className="font-black text-[10px] text-stone-800 uppercase tracking-widest leading-none">任务库</h3>
                   <button onClick={() => setIsTaskPoolOpen(false)} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 transition-colors"><X size={18} /></button>
               </div>
              <div className="flex-1 overflow-hidden">{renderTaskPool()}</div>
          </div>
        </div>
      )}

      {/* Floating Add Task Button (Bottom Right) */}
      <button 
        className="absolute bottom-6 right-6 z-[80] p-3 bg-primary text-white rounded-full shadow-xl shadow-primary/30 active:scale-90 transition-all animate-in zoom-in duration-200 flex items-center justify-center hover:opacity-90"
        onClick={() => {
            setEditingTodo({
                id: generateId(),
                title: '',
                objectiveId: 'none',
                isFrog: false,
                isCompleted: false,
                subTasks: [],
                createdAt: new Date().toISOString(),
                startDate: formatDate(currentDate)
            });
            setIsTodoModalOpen(true);
        }}
        title="新建任务"
      >
         <Plus size={24} />
      </button>

      {/* 弹窗层 */}
      <TodoEditorModal 
          isOpen={isTodoModalOpen} onClose={() => setIsTodoModalOpen(false)} 
          todo={editingTodo} objectives={objectives} 
          onSave={(todo) => {
            if (editingTodo && todos.find(t => t.id === todo.id)) {
                onUpdateTodo(todo);
            } else {
                onAddTodo(todo);
            }
          }} 
          onDelete={onDeleteTodo} frogCount={frogs.length} defaultDate={currentDate}
      />
      <TaskEditorModal 
        isOpen={isTaskEditorOpen} onClose={() => setIsTaskEditorOpen(false)} 
        task={editingTask} onSave={(t) => t.id ? onUpdateTask?.(t) : onAddTask?.(t)} 
        onDelete={onDeleteTask || (() => {})} objectives={objectives} simplified={false}
      />
      <ObjectiveEditorModal 
        isOpen={isObjModalOpen} 
        onClose={() => setIsObjModalOpen(false)} 
        objective={editingObjective} 
        onSave={(obj) => obj.id ? onUpdateObjective?.(obj) : undefined} 
        onDelete={onDeleteObjective} 
      />
    </div>
  );
};
