
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Todo, Objective, Task } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, generateId, formatDate } from '../utils';
import { Plus, Circle, Star, X, LayoutGrid, Trash2, ChevronRight, List, Clock, Repeat, Hash, CheckSquare, History, Layers, CalendarRange, CalendarDays, ListTodo, CheckCircle2, Lock, CalendarClock } from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, differenceInCalendarDays, subDays, addDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type FilterRange = 'today' | 'unfinished' | 'no-date' | 'recurring' | 'all';
type ViewMode = 'list' | 'week' | 'month';

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
  isTaskPoolOpen: boolean;
  setIsTaskPoolOpen: (open: boolean) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
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
  isTaskPoolOpen,
  setIsTaskPoolOpen,
  currentDate = new Date(),
  onDateChange
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
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
  const filterOrder: FilterRange[] = ['today', 'unfinished', 'no-date', 'recurring', 'all'];
  
  const filterLabels: Record<FilterRange, string> = {
    today: '今日',
    unfinished: '未完成',
    'no-date': '无日期',
    recurring: '循环',
    all: '全部'
  };

  const filteredTodos = useMemo(() => {
    // If in List mode, use filters. If in Week/Month, show selected date's tasks.
    if (viewMode !== 'list') {
        const selectedDateStr = formatDate(currentDate);
        return todos.filter(t => t.startDate === selectedDateStr);
    }

    const todayStr = formatDate(new Date());
    return todos.filter(t => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'recurring') return !!t.templateId || (t.targets?.frequency || 0) > 0; // Fix: Show tasks with frequency
      if (activeFilter === 'unfinished') return !t.isCompleted;
      if (activeFilter === 'no-date') return !t.startDate;
      if (activeFilter === 'today') return t.startDate === todayStr;
      
      return false;
    });
  }, [todos, activeFilter, viewMode, currentDate]);

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

  // Calculate the last completed date for each task template
  const taskLastDoneMap = useMemo(() => {
    const map: Record<string, string> = {}; // taskId -> max(completedAt)
    const nameMap: Record<string, string> = {}; // taskName -> max(completedAt)
    
    todos.forEach(t => {
        if (t.isCompleted && t.completedAt) {
            // Priority 1: Template ID match
            if (t.templateId) {
                const currentMax = map[t.templateId];
                if (!currentMax || t.completedAt > currentMax) {
                    map[t.templateId] = t.completedAt;
                }
            }
            
            // Priority 2: Name match (fallback for legacy or manual tasks)
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
    setIsTaskPoolOpen(false); 
    setEditingTodo({
        id: generateId(),
        title: task.name,
        objectiveId: task.category || 'none',
        templateId: task.id,
        isFrog: false,
        isCompleted: false,
        subTasks: [],
        createdAt: new Date().toISOString(),
        startDate: formatDate(currentDate), // Use selected date
        targets: task.targets
    });
    setIsTodoModalOpen(true);
  };

  const handlePointerDown = (item: Task | Todo, type: 'task' | 'todo') => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (type === 'task') {
        setEditingTask(item as Task);
        setIsTaskEditorOpen(true);
      } else {
        setEditingTodo(item as Todo);
        setIsTodoModalOpen(true);
      }
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 核心逻辑：处理任务完成/取消完成，并自动生成循环任务
  const handleTodoClick = (t: Todo) => {
    if (isLongPress.current) return;

    // 1. 检查是否为未来任务 (锁定状态)
    const todayStr = formatDate(new Date());
    const isFuture = t.startDate && t.startDate > todayStr;
    
    if (isFuture && !t.isCompleted) {
         // 可选：添加震动反馈或提示
         return; 
    }

    const newIsCompleted = !t.isCompleted;

    // 2. 更新当前任务状态
    onUpdateTodo({ 
        ...t, 
        isCompleted: newIsCompleted, 
        completedAt: newIsCompleted ? todayStr : undefined 
    });

    // 3. 如果是完成操作，且任务是循环任务（有模板ID或明确的频率），则生成下一个周期的任务
    if (newIsCompleted) {
        // 获取周期频率 - 优先从实例获取，其次从模板获取
        let frequency = t.targets?.frequency;
        
        if (!frequency && t.templateId) {
            const template = tasks.find(task => task.id === t.templateId);
            frequency = template?.targets?.frequency;
        }

        // 只有当频率存在且大于0时才生成
        if (frequency && frequency > 0) {
            const currentStartDate = t.startDate ? parseISO(t.startDate) : new Date();
            const nextStartDate = addDays(currentStartDate, frequency);
            const nextStartDateStr = formatDate(nextStartDate);

            // 检查是否已经存在同一天、同一模板(或标题)的未来任务，防止重复生成
            // 如果有templateId，用templateId判重；否则用title判重
            const exists = todos.some(existing => {
                const sameDate = existing.startDate === nextStartDateStr;
                const sameId = t.templateId ? (existing.templateId === t.templateId) : (existing.title === t.title);
                return sameDate && sameId;
            });

            if (!exists) {
                // 重置子任务状态
                const newSubTasks = t.subTasks?.map(st => ({ ...st, isCompleted: false })) || [];

                const newTodo: Todo = {
                    ...t,
                    id: generateId(),
                    isCompleted: false,
                    completedAt: undefined,
                    startDate: nextStartDateStr,
                    createdAt: new Date().toISOString(),
                    subTasks: newSubTasks
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
      const diff = differenceInCalendarDays(new Date(), parseISO(lastDoneDate));
      if (diff === 0) return '今天';
      if (diff === 1) return '昨天';
      return `${diff}天前`;
  };

  // --- 组件 ---

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
                        onClick={() => setPoolCategory(obj.id)}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-[9px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5",
                            poolCategory === obj.id ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
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
                        poolCategory === 'uncategorized' ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
                    )}
                >
                    未分类
                </button>
             </div>

             <button onClick={() => { setEditingTask(null); setIsTaskEditorOpen(true); }} className="w-8 h-8 shrink-0 flex items-center justify-center bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 hover:text-stone-900 transition-all active:scale-95" title="添加行为">
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
                        const isStarted = !!lastDoneText;
                        
                        return (
                            <div 
                                key={task.id} 
                                onClick={() => handleTemplateClick(task)} 
                                onPointerDown={() => handlePointerDown(task, 'task')}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                                className="group p-3 bg-white border border-stone-100 rounded-xl flex items-center justify-between hover:border-stone-300 transition-all cursor-pointer shadow-sm relative overflow-hidden select-none active:scale-95 touch-manipulation"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color }} />
                                <div className="flex items-center gap-2 flex-1 min-w-0 ml-2">
                                    <span className="text-[12px] font-bold text-stone-800 truncate">{task.name}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors",
                                        isStarted 
                                            ? "bg-indigo-50 text-indigo-500 border-indigo-100" 
                                            : "bg-stone-50 text-stone-400 border-stone-200"
                                    )}>
                                        <History size={10} />
                                        <span className="text-[9px] font-bold">{displayStatus}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    </div>
  );

  const renderTodoCard = (t: Todo, isHighlighted: boolean) => {
    const objective = objectives.find(o => o.id === t.objectiveId);
    const borderColor = objective ? objective.color : '#e7e5e4';
    const hasTargets = t.targets && (t.targets.value > 0);
    
    // Future Task Logic
    const todayStr = formatDate(new Date());
    const isFuture = !t.isCompleted && t.startDate && t.startDate > todayStr;
    const isRecurring = !!t.templateId || (t.targets?.frequency || 0) > 0;

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
            <div className="flex items-center gap-2.5">
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
                
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={cn(
                        "text-xs font-bold leading-tight truncate",
                        isFuture ? "text-stone-400" : "text-stone-800"
                    )}>
                        {t.title}
                    </span>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                         {t.startDate && (
                            <span className={cn(
                                "text-[9px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded leading-none",
                                isFuture ? "bg-stone-100 text-stone-400" : "bg-stone-50 text-stone-400"
                            )}>
                                {isFuture && <CalendarClock size={8} />}
                                {format(parseISO(t.startDate), 'MM-dd')}
                            </span>
                         )}
                         {hasTargets && (
                             <span className="text-[9px] font-medium text-stone-400 flex items-center gap-0.5 bg-stone-50 px-1 py-0.5 rounded leading-none">
                                 {t.targets?.mode === 'duration' ? <Clock size={8} /> : <Hash size={8} />}
                                 {t.targets?.value}
                             </span>
                         )}
                         {isRecurring && (
                             <span className={cn(
                                 "text-[9px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded leading-none",
                                 isFuture ? "bg-purple-50 text-purple-300" : "bg-stone-50 text-stone-400"
                             )}>
                                 <Repeat size={8} />
                                 {t.targets?.frequency ? `${t.targets.frequency}天` : ''}
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
                <div className="ml-7 space-y-1 mt-0.5 border-t border-dashed border-stone-100 pt-1.5" onClick={(e) => e.stopPropagation()}>
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

  const WeekView = () => {
    // Mobile-first centered week: 3 days before, today, 3 days after
    const days = useMemo(() => {
       const start = subDays(currentDate, 3);
       return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [currentDate]);

    return (
      <div className="flex h-full overflow-x-auto no-scrollbar bg-stone-50 pb-32">
        {days.map(day => {
          const dayStr = formatDate(day);
          const dayTodos = todos.filter(t => t.startDate === dayStr);
          const hasRecurring = dayTodos.some(t => !!t.templateId);
          const hasManual = dayTodos.some(t => !t.templateId);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);

          return (
            <div 
                key={dayStr} 
                onClick={() => onDateChange?.(day)}
                className={cn(
                    "min-w-[56px] flex-1 border-r border-stone-200/50 flex flex-col h-full cursor-pointer transition-colors", 
                    isSelected ? "bg-white" : "bg-stone-50/30"
                )}
            >
               <div className={cn("sticky top-0 p-3 border-b border-stone-100 flex flex-col items-center justify-center gap-1 z-10", isSelected ? "bg-white" : "bg-stone-50/90 backdrop-blur")}>
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", isToday ? "text-indigo-500" : "text-stone-400")}>
                    {format(day, 'EEE', { locale: zhCN })}
                  </span>
                  <div className={cn("w-7 h-7 flex items-center justify-center rounded-full text-sm font-black leading-none transition-all", isSelected ? "bg-stone-900 text-white shadow-lg" : (isToday ? "text-indigo-600" : "text-stone-700"))}>
                    {format(day, 'd')}
                  </div>
                  {/* Status Dots */}
                  <div className="flex gap-0.5 h-1.5 mt-0.5">
                     {hasRecurring && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title="循环/模板任务" />}
                     {hasManual && <div className="w-1.5 h-1.5 rounded-full bg-stone-300" title="普通任务" />}
                  </div>
               </div>
               
               {/* Click area filler */}
               <div className="flex-1"></div>
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
    const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

    return (
        <div className="flex flex-col h-full bg-stone-50 pb-32 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 border-b border-stone-200 bg-white sticky top-0 z-10 shadow-sm">
                {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-black text-stone-400">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
                {days.map(day => {
                    const dayStr = formatDate(day);
                    const isSelected = isSameDay(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    
                    const dayTodos = todos.filter(t => t.startDate === dayStr);
                    const hasRecurring = dayTodos.some(t => !!t.templateId);
                    const hasManual = dayTodos.some(t => !t.templateId);
                    
                    return (
                        <div 
                            key={dayStr}
                            onClick={() => onDateChange?.(day)}
                            className={cn(
                                "aspect-[0.8] border-b border-r border-stone-200/50 flex flex-col items-center justify-start py-2 gap-1 cursor-pointer active:bg-stone-100",
                                isSelected ? "bg-white ring-inset ring-2 ring-stone-900 z-10" : (isCurrentMonth ? "bg-white" : "bg-stone-50/50")
                            )}
                        >
                            <span className={cn(
                                "text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full", 
                                isSelected ? "bg-stone-900 text-white" : (isToday ? "text-indigo-600 bg-indigo-50" : (isCurrentMonth ? "text-stone-700" : "text-stone-300"))
                            )}>
                                {format(day, 'd')}
                            </span>
                             <div className="flex gap-0.5">
                                {hasRecurring && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                {hasManual && <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const ListView = () => {
    // Separate active and completed, but include future tasks in active for "Recurring" filter
    // For normal views, "future" tasks might be hidden or shown based on filter.
    // However, filteredTodos is already filtered by date for 'today' filter.
    
    // Sort logic: 
    // 1. Frogs first
    // 2. Then normal tasks
    // 3. Future tasks last (if they appear in the filter)
    
    const activeTodos = filteredTodos.filter(t => !t.isCompleted);
    const completedTodos = filteredTodos.filter(t => t.isCompleted);
    const uncategorizedTodos = activeTodos.filter(t => !t.objectiveId || t.objectiveId === 'none' || !objectives.find(o => o.id === t.objectiveId));
    
    // Header for Calendar Selection Mode
    const isCalendarMode = viewMode !== 'list';
    
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col h-full border-r border-stone-100 bg-white">
            {isCalendarMode && (
                <div className="px-5 py-3 border-b border-stone-50 bg-stone-50/30">
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays size={12} /> {format(currentDate, 'M月d日')} 任务列表
                    </h3>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-6 custom-scrollbar">
              
              {sortedObjectives.map(obj => {
                  const objTodos = activeTodos.filter(t => t.objectiveId === obj.id);
                  if (objTodos.length === 0) return null;
                  
                  // Sort: Frogs -> Normal -> Future (by start date)
                  const sortedObjTodos = [...objTodos].sort((a, b) => {
                      if (a.isFrog !== b.isFrog) return Number(b.isFrog) - Number(a.isFrog);
                      return (a.startDate || '').localeCompare(b.startDate || '');
                  });

                  return (
                      <section key={obj.id}>
                          <div className="flex items-center gap-2 mb-2 px-1">
                               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: obj.color }} />
                               <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{obj.title}</span>
                          </div>
                          {sortedObjTodos.map(t => renderTodoCard(t, t.isFrog))}
                      </section>
                  );
              })}

              {uncategorizedTodos.length > 0 && (
                  <section>
                      <div className="flex items-center gap-2 mb-2 px-1">
                           <Layers size={10} className="text-stone-300" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">未分类</span>
                      </div>
                      {uncategorizedTodos.sort((a,b) => (Number(b.isFrog) - Number(a.isFrog))).map(t => renderTodoCard(t, t.isFrog))}
                  </section>
              )}

              {activeTodos.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-stone-300 gap-2">
                      <ListTodo size={24} strokeWidth={1.5} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                          {isCalendarMode ? '该日无任务' : '当前无任务'}
                      </span>
                      {isCalendarMode && (
                          <button 
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
                            className="mt-2 text-indigo-500 text-xs font-bold flex items-center gap-1"
                          >
                              <Plus size={12} /> 添加任务
                          </button>
                      )}
                  </div>
              )}

              {completedTodos.length > 0 && (
                  <section className="opacity-60 grayscale border-t border-stone-100 pt-6 mt-4">
                      <div className="flex items-center gap-2 mb-3 px-1">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">已完成 ({completedTodos.length})</span>
                      </div>
                      {completedTodos.map(t => (
                          <div key={t.id} className="bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 flex items-center gap-3 mb-1.5">
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-stone-400 line-through flex-1 truncate">{t.title}</span>
                          </div>
                      ))}
                  </section>
              )}
            </div>
        </div>

        {/* Desktop Task Pool */}
        <aside className="hidden lg:flex w-80 flex-col border-l border-stone-100 shadow-sm overflow-hidden">
            {renderTaskPool()}
        </aside>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* 统一视图控制 Toolbar */}
       <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 px-4 py-2 border-b border-stone-100 flex items-center justify-between shrink-0 gap-3 h-12">
          {/* View Mode Switcher */}
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 shrink-0">
              {(['list', 'week', 'month'] as ViewMode[]).map(m => (
                  <button 
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={cn(
                          "px-2.5 py-1 text-[10px] font-black rounded-md transition-all flex items-center gap-1",
                          viewMode === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                      )}
                  >
                      {m === 'list' && <List size={12} />}
                      {m === 'week' && <CalendarRange size={12} />}
                      {m === 'month' && <CalendarDays size={12} />}
                      <span className="hidden sm:inline">{m === 'list' ? '列表' : (m === 'week' ? '周视图' : '月视图')}</span>
                  </button>
              ))}
          </div>
          
          {/* Filters - Only for List View */}
          {viewMode === 'list' && (
              <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar mask-gradient items-center justify-end">
                  {filterOrder.map((range) => (
                      <button 
                        key={range} 
                        onClick={() => setActiveFilter(range)} 
                        className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black border transition-all uppercase whitespace-nowrap shrink-0", 
                            activeFilter === range ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-100"
                        )}
                      >
                        {filterLabels[range]}
                      </button>
                  ))}
                  <button onClick={() => { setEditingTodo(null); setIsTodoModalOpen(true); }} className="w-6 h-6 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg shrink-0 ml-1 active:scale-95">
                      <Plus size={14} />
                  </button>
              </div>
          )}
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Calendar Areas (Takes upper part in Week/Month mode) */}
        {viewMode === 'week' && (
            <div className="shrink-0 h-20 border-b border-stone-200 shadow-sm z-10">
                <WeekView />
            </div>
        )}
        
        {viewMode === 'month' && (
            <div className="flex-1 overflow-hidden">
                <MonthView />
            </div>
        )}
        
        {/* List Content */}
        {(viewMode === 'list' || viewMode === 'week') && (
            <div className="flex-1 overflow-hidden">
                <ListView />
            </div>
        )}
        
        {/* Special handling for Month view to show list below */}
        {viewMode === 'month' && (
            <div className="h-40 border-t border-stone-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                 <ListView />
            </div>
        )}
      </div>

      {/* 移动端任务库抽屉 (仅在 List 视图下显示) */}
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
    </div>
  );
};
