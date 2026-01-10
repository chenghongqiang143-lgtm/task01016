
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Todo, Objective, Task, ViewMode } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { cn, generateId, formatDate, getContrastColor } from '../utils';
import { Plus, Circle, Star, X, LayoutGrid, Trash2, ChevronRight, List, Clock, Repeat, Hash, CheckSquare, History, Layers, CalendarRange, CalendarDays, ListTodo, CheckCircle2, Lock, CalendarClock, Flag, AlertCircle, Edit2, TrendingUp, Hourglass, Eye, EyeOff, Search } from 'lucide-react';
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
  viewMode?: ViewMode; 
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
  const [poolCategory, setPoolCategory] = useState<string>('all'); // Default to all
  
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterOrder: FilterRange[] = ['today', 'expired', 'no-date', 'recurring', 'all'];
  
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

    // In calendar views, we still only want to show tasks for that specific day if listed
    // For List view, we filter based on activeFilter
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

    if (hideCompleted) {
        result = result.filter(t => !t.isCompleted);
    }

    return result.sort((a, b) => {
        if (a.isFrog !== b.isFrog) {
            return a.isFrog ? -1 : 1;
        }
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
    if (poolCategory === 'all') return tasks;
    if (poolCategory === 'uncategorized') {
        return tasks.filter(t => !t.category || t.category === 'none' || t.category === 'uncategorized' || !objectives.find(o => o.id === t.category));
    }
    return tasks.filter(t => t.category === poolCategory);
  }, [tasks, poolCategory, objectives]);

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
  };

  const toggleSubTask = (todo: Todo, subTaskId: string) => {
      const newSubTasks = todo.subTasks?.map(st => st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st) || [];
      onUpdateTodo({ ...todo, subTasks: newSubTasks });
  };

  const renderTodoCard = (t: Todo, isHighlighted: boolean) => {
    const objective = objectives.find(o => o.id === t.objectiveId);
    const borderColor = objective ? objective.color : '#e7e5e4';
    const todayStr = formatDate(new Date());
    const isFuture = !t.isCompleted && t.startDate && t.startDate > todayStr;
    const isRecurring = !!t.templateId || (t.targets?.frequency || 0) > 0;
    
    let totalGoal = t.targets?.totalValue;
    let currentVal = t.currentValue || 0;
    const progressPercent = (totalGoal && totalGoal > 0) ? Math.min((currentVal / totalGoal) * 100, 100) : 0;
    
    // Flat Card Style
    return (
        <div key={t.id} 
            onClick={() => handleTodoClick(t)} 
            onPointerDown={() => handlePointerDown(t, 'todo')}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={cn(
                "group rounded-2xl p-4 flex flex-col gap-2 mb-3 transition-all select-none touch-manipulation border relative overflow-hidden",
                isFuture
                    ? "bg-stone-50 border-stone-100 opacity-60"
                    : (isHighlighted 
                        ? "bg-amber-50 border-amber-200" 
                        : (t.isCompleted ? "bg-stone-50/50 border-stone-100" : "bg-white border-stone-100 hover:border-stone-300"))
            )}
        >
             {progressPercent > 0 && !isFuture && !t.isCompleted && (
                <div 
                    className="absolute left-0 bottom-0 top-0 pointer-events-none transition-all duration-300 z-0 opacity-10"
                    style={{ 
                        width: `${progressPercent}%`, 
                        backgroundColor: objective?.color || '#3b82f6'
                    }}
                />
            )}

            <div className="flex items-center gap-3 relative z-10">
                <div className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    t.isCompleted ? "bg-primary border-primary" : (isHighlighted ? "border-amber-400 text-amber-500" : "border-stone-200 text-stone-300 hover:border-primary hover:text-primary")
                )}>
                    {t.isCompleted && <CheckSquare size={14} className="text-white" />}
                    {!t.isCompleted && isHighlighted && <Star size={12} fill="currentColor" />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        "text-[13px] font-bold leading-tight truncate",
                        t.isCompleted ? "text-stone-400 line-through" : "text-stone-800"
                    )}>
                        {t.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        {objective && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-stone-50 border border-stone-100/50" style={{ color: objective.color }}>
                                {objective.title}
                            </span>
                        )}
                        {isFuture && <span className="text-[9px] text-stone-400 font-bold bg-stone-100 px-1.5 py-0.5 rounded-md border border-stone-100">锁定</span>}
                        {isRecurring && <span className="text-[9px] text-stone-400 font-bold bg-stone-100 px-1.5 py-0.5 rounded-md border border-stone-100 flex items-center gap-0.5"><Repeat size={8} /> 循环</span>}
                    </div>
                </div>

                {!isFuture && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateTodo({ ...t, isFrog: !t.isFrog }); }}
                        className={cn("p-1.5 rounded-lg transition-colors", t.isFrog ? "bg-amber-100 text-amber-500" : "text-stone-300 hover:bg-stone-50 hover:text-stone-500")}
                    >
                        <Star size={16} fill={t.isFrog ? "currentColor" : "none"} strokeWidth={t.isFrog ? 0 : 2} />
                    </button>
                )}
            </div>

            {t.subTasks && t.subTasks.length > 0 && !isFuture && !t.isCompleted && (
                 <div className="pl-9 space-y-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                    {t.subTasks.map(st => (
                         <div key={st.id} className="flex items-center gap-2 group/sub cursor-pointer" onClick={() => toggleSubTask(t, st.id)}>
                             <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors", st.isCompleted ? "bg-primary border-primary text-white" : "border-stone-200 bg-white")}>
                                 {st.isCompleted && <CheckSquare size={9} />}
                             </div>
                             <span className={cn("text-[11px] font-medium transition-all", st.isCompleted ? "text-stone-300 line-through" : "text-stone-600")}>
                                 {st.title}
                             </span>
                         </div>
                    ))}
                 </div>
            )}
        </div>
    );
  };

  const renderTaskPool = (onClose?: () => void) => (
    <div className="flex flex-col h-full bg-stone-50">
        <div className="p-3 bg-white sticky top-0 z-20 shrink-0 border-b border-stone-100 flex gap-2 items-center">
             <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2 items-center pr-2">
                <button 
                    onClick={() => setPoolCategory('all')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border",
                        poolCategory === 'all'
                            ? "bg-primary text-white border-primary" 
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                    )}
                >
                   全部
                </button>
                {sortedObjectives.map(obj => (
                    <button 
                        key={obj.id}
                        onClick={() => setPoolCategory(obj.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5",
                            poolCategory === obj.id 
                                ? "bg-white border-transparent shadow-sm ring-1 ring-stone-100" 
                                : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                        )}
                        style={poolCategory === obj.id ? { color: obj.color, borderColor: obj.color } : {}}
                    >
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: obj.color }} />
                       {obj.title}
                    </button>
                ))}
                <button 
                    onClick={() => setPoolCategory('uncategorized')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border",
                        poolCategory === 'uncategorized'
                            ? "bg-primary text-white border-primary" 
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                    )}
                >
                   未分类
                </button>
             </div>
             
             <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-stone-100">
                <button 
                    onClick={() => { 
                        setEditingTask({ id: '', name: '', color: '#3b82f6', category: 'uncategorized' } as Task);
                        setIsTaskEditorOpen(true); 
                    }} 
                    className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                </button>
                {onClose && (
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-stone-50 text-stone-400 hover:bg-stone-100 flex items-center justify-center transition-colors">
                        <X size={18} />
                    </button>
                )}
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex flex-col gap-2">
                {poolTasks.map(task => {
                    const textColor = getContrastColor(task.color);
                    return (
                        <div 
                            key={task.id} 
                            onClick={() => handleTemplateClick(task)} 
                            onPointerDown={() => handlePointerDown(task, 'task')}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-100 hover:border-stone-300 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: task.color + '20' }}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.color }} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-bold text-stone-700 block truncate">{task.name}</span>
                                {task.targets?.value ? (
                                    <span className="text-[9px] font-bold text-stone-400 flex items-center gap-1 mt-0.5">
                                        {task.targets.mode === 'duration' ? <Clock size={8} /> : <Hash size={8} />}
                                        {task.targets.value} {task.targets.mode === 'duration' ? 'h' : '次'}
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-medium text-stone-300">无目标</span>
                                )}
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsTaskEditorOpen(true); }}
                                className="p-1.5 text-stone-300 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Edit2 size={12} />
                            </button>
                        </div>
                    );
                })}
                {poolTasks.length === 0 && (
                     <div className="py-12 flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-200 rounded-2xl">
                        <ListTodo size={32} className="mb-2 opacity-50" />
                        <span className="text-[10px] font-bold uppercase">这里没有任务</span>
                     </div>
                )}
            </div>
        </div>
    </div>
  );

  const renderTodoListItems = () => (
    <div className="p-4 pb-32">
       {filteredTodos.length === 0 ? (
           <div className="py-12 flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-100 rounded-2xl m-4 bg-stone-50/50">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                  <ListTodo size={24} className="text-stone-300" />
               </div>
               <p className="text-xs font-bold uppercase tracking-widest font-mono text-stone-400">
                   今日暂无任务
               </p>
               <button 
                 onClick={() => setIsTaskPoolOpen(true)}
                 className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-primary/20"
               >
                 从任务库添加
               </button>
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
        <div className="flex h-full border-b border-stone-100 bg-white">
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
                            "flex-1 flex flex-col items-center justify-center cursor-pointer relative group transition-colors",
                            isSelected ? "bg-stone-50" : "hover:bg-stone-50/50"
                        )}
                     >
                         <span className={cn("text-[10px] font-black uppercase mb-1.5 transition-colors", isSelected ? "text-stone-900" : "text-stone-400")}>
                             {format(day, 'EEE', { locale: zhCN })}
                         </span>
                         <div className={cn(
                             "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-black transition-all",
                             isSelected 
                                ? "bg-primary text-white shadow-sm" 
                                : (isToday ? "text-primary border border-primary/20" : "text-stone-600 border border-stone-100")
                         )}>
                             {format(day, 'd')}
                         </div>
                         
                         <div className="mt-2 h-1 w-8 flex justify-center gap-0.5">
                             {hasTodos && (
                                 <div className={cn("h-1 w-1 rounded-full", completionRate === 1 ? "bg-emerald-500" : "bg-stone-300")} />
                             )}
                         </div>
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
        <div className="p-4 pb-0 bg-white">
            <div className="grid grid-cols-7 mb-3">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-stone-300">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
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
                                "aspect-square rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative overflow-hidden border",
                                !isCurrentMonth && "opacity-20 grayscale",
                                isSelected 
                                    ? "bg-primary text-white border-primary shadow-lg z-10" 
                                    : "border-transparent hover:border-stone-200 bg-stone-50"
                            )}
                        >
                            <span className={cn(
                                "text-[10px] font-bold z-10", 
                                isSelected ? "text-white" : (isToday ? "text-stone-900" : "text-stone-600")
                            )}>
                                {format(day, 'd')}
                            </span>
                            
                            {total > 0 && (
                                <div className="mt-1 flex gap-0.5">
                                    <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/50" : (completed === total ? "bg-emerald-400" : "bg-stone-300"))} />
                                </div>
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
       <div className="sticky top-0 bg-white z-40 px-6 py-2 border-b border-stone-100 flex items-center justify-start gap-4 shrink-0 h-16">
          {viewMode === 'list' ? (
              <div className="flex bg-stone-50 p-1 rounded-lg border border-stone-100 overflow-x-auto no-scrollbar">
                  {filterOrder.map((range) => (
                      <button 
                        key={range} 
                        onClick={() => setActiveFilter(range)} 
                        className={cn(
                            "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all uppercase whitespace-nowrap", 
                            activeFilter === range 
                                ? "bg-primary text-white shadow-sm" 
                                : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        {filterLabels[range]}
                      </button>
                  ))}
              </div>
          ) : (
              <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-stone-800">{format(currentDate, 'yyyy年 M月')}</h2>
              </div>
          )}

          <div className="flex-1"></div>

          {viewMode === 'list' && (
              <button 
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-lg border transition-all shrink-0",
                      hideCompleted 
                          ? "bg-primary text-white border-primary" 
                          : "bg-white text-stone-400 border-stone-100 hover:border-stone-300 hover:text-stone-600"
                  )}
                  title={hideCompleted ? "显示已完成" : "隐藏已完成"}
              >
                  {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
          )}
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-row">
        
        <div className="flex-1 overflow-hidden relative flex flex-col min-w-0 bg-white">
            {viewMode === 'week' && (
                <div className="shrink-0 h-24 border-b border-stone-100 z-10 bg-white">
                    <WeekView />
                </div>
            )}
            
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
                    <div className="min-h-[300px] border-t border-stone-100 bg-white mt-4 rounded-t-3xl shadow-flat">
                        <div className="px-6 py-4 border-b border-stone-100 bg-white sticky top-0 z-10 rounded-t-3xl flex items-center justify-between">
                            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                <CalendarDays size={14} /> {format(currentDate, 'M月d日')}
                            </h3>
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
                                className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-stone-900 hover:bg-stone-100 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        {renderTodoListItems()}
                    </div>
                </div>
            )}
        </div>

        {/* Sidebar enabled for ALL views now */}
        <div className={cn(
             "hidden lg:flex border-l border-stone-100 bg-stone-50 flex-col transition-all duration-300 ease-in-out",
             isTaskPoolOpen ? "w-[320px] opacity-100" : "w-0 opacity-0 overflow-hidden"
         )}>
             {renderTaskPool()}
         </div>
      </div>

      {/* Task Pool Modal for Mobile/Tablet - enabled for ALL views */}
      {isTaskPoolOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex-1 overflow-hidden bg-white">{renderTaskPool(() => setIsTaskPoolOpen(false))}</div>
          </div>
        </div>
      )}

      {/* Floating Add Task Button (Bottom Right) */}
      <button 
        className="absolute bottom-24 right-6 z-[80] w-14 h-14 bg-primary text-white rounded-2xl shadow-float hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
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
         <Plus size={28} strokeWidth={2.5} />
      </button>

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
