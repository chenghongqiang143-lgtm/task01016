
import React, { useState, useMemo, useRef } from 'react';
import { Todo, Objective, Task } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, generateId, formatDate } from '../utils';
import { Plus, CheckCircle2, Circle, Star, X, LayoutGrid, Trash2, ChevronRight, ListTodo, Columns, List } from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type FilterRange = 'unfinished' | 'today' | 'week' | 'month' | 'all';
type ViewMode = 'list' | 'week';

export interface TodoViewProps {
  todos: Todo[];
  objectives: Objective[];
  tasks: Task[];
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onAddTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  isTaskPoolOpen: boolean;
  setIsTaskPoolOpen: (open: boolean) => void;
  currentDate?: Date;
}

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  objectives,
  tasks,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isTaskPoolOpen,
  setIsTaskPoolOpen,
  currentDate = new Date()
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterRange>('today');
  const [poolCategory, setPoolCategory] = useState<string>('all');
  
  // Ref to track if current interaction is a long press
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterLabels: Record<FilterRange, string> = {
    unfinished: '未完成',
    today: '今日',
    week: '本周',
    month: '本月',
    all: '全部'
  };

  const filteredTodos = useMemo(() => {
    const todayStr = formatDate(new Date());
    return todos.filter(t => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'unfinished') return !t.isCompleted;
      if (t.startDate) {
        const date = parseISO(t.startDate);
        switch (activeFilter) {
          case 'today': return t.startDate === todayStr;
          case 'week': return isThisWeek(date, { weekStartsOn: 1 });
          case 'month': return isThisMonth(date);
          default: return false;
        }
      }
      return activeFilter === 'all';
    });
  }, [todos, activeFilter]);

  const frogs = filteredTodos.filter(t => t.isFrog && !t.isCompleted);
  const tadpoles = filteredTodos.filter(t => !t.isFrog && !t.isCompleted);
  const completedList = filteredTodos.filter(t => t.isCompleted);

  const poolTasks = useMemo(() => {
    if (poolCategory === 'all') return tasks;
    if (poolCategory === 'uncategorized') {
        return tasks.filter(t => !t.category || t.category === 'none' || t.category === 'uncategorized' || !objectives.find(o => o.id === t.category));
    }
    return tasks.filter(t => t.category === poolCategory);
  }, [tasks, poolCategory, objectives]);

  // --- 处理函数 ---
  
  const handleTemplateClick = (task: Task) => {
    // Only trigger if not a long press
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
        startDate: formatDate(currentDate)
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

  // --- 组件 ---

  const renderTaskPool = () => (
    <div className="flex flex-col h-full bg-stone-50/50">
        {/* Unified Compact Header & Category Tabs */}
        <div className="h-11 border-b border-stone-100 flex items-center bg-white sticky top-0 z-20 shrink-0 gap-2 px-2 shadow-sm">
             <div className="flex items-center justify-center w-8 h-8 shrink-0 text-stone-400" title="行为库">
                <LayoutGrid size={18} />
             </div>

             <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar mask-gradient-x items-center h-full">
                <button 
                    onClick={() => setPoolCategory('all')}
                    className={cn(
                        "px-2.5 py-1 rounded-md text-[9px] font-bold whitespace-nowrap transition-all border",
                        poolCategory === 'all' ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100"
                    )}
                >
                    全部
                </button>
                {objectives.map(obj => (
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
                    poolTasks.map(task => (
                    <div 
                        key={task.id} 
                        onClick={() => handleTemplateClick(task)} 
                        onPointerDown={() => handlePointerDown(task, 'task')}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="group p-3 bg-white border border-stone-100 rounded-xl flex items-center justify-between hover:border-stone-300 transition-all cursor-pointer shadow-sm relative overflow-hidden select-none active:scale-95 touch-manipulation"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color }} />
                        <span className="text-[12px] font-bold text-stone-800 ml-2">{task.name}</span>
                        <ChevronRight size={14} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );

  const WeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="flex h-full overflow-x-auto custom-scrollbar bg-stone-50 pb-32">
        {days.map(day => {
          const dayStr = formatDate(day);
          const dayTodos = todos.filter(t => t.startDate === dayStr && !t.isCompleted);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);

          return (
            <div key={dayStr} className={cn("min-w-[140px] flex-1 border-r border-stone-200/50 flex flex-col h-full", isSelected ? "bg-white" : "bg-stone-50/30")}>
               <div className={cn("sticky top-0 p-3 border-b border-stone-100 flex flex-col items-center justify-center gap-1 z-10", isSelected ? "bg-white" : "bg-stone-50/90 backdrop-blur")}>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isToday ? "text-indigo-500" : "text-stone-400")}>
                    {format(day, 'EEEE', { locale: zhCN })}
                  </span>
                  <span className={cn("text-lg font-black leading-none", isToday ? "text-indigo-600" : "text-stone-700")}>
                    {format(day, 'd')}
                  </span>
               </div>
               <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {dayTodos.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => { setEditingTodo(t); setIsTodoModalOpen(true); }}
                      className={cn(
                        "p-2.5 rounded-lg border text-xs font-bold cursor-pointer shadow-sm active:scale-95 transition-all",
                        t.isFrog ? "bg-amber-50 border-amber-100 text-stone-800" : "bg-white border-stone-100 text-stone-700"
                      )}
                    >
                       {t.isFrog && <Star size={10} className="text-amber-400 fill-amber-400 mb-1" />}
                       <p className="line-clamp-2">{t.title}</p>
                    </div>
                  ))}
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
                        startDate: dayStr
                      });
                      setIsTodoModalOpen(true);
                    }}
                    className="w-full py-2 border border-dashed border-stone-200 rounded-lg text-stone-300 hover:text-stone-500 hover:border-stone-300 transition-all flex justify-center"
                  >
                    <Plus size={16} />
                  </button>
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ListView = () => (
    <div className="flex h-full">
      {/* 左侧：待办清单 */}
      <div className="flex-1 flex flex-col h-full border-r border-stone-100 bg-white">
          <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-8 custom-scrollbar">
            {frogs.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">核心焦点 (长按编辑)</span>
                    </div>
                    {frogs.map(t => (
                        <div key={t.id} 
                            onClick={() => { if(!isLongPress.current) onUpdateTodo({ ...t, isCompleted: true, completedAt: formatDate(new Date()) }); }} 
                            onPointerDown={() => handlePointerDown(t, 'todo')}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            className="group bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3 mb-2 cursor-pointer hover:bg-amber-100 transition-all select-none touch-manipulation relative"
                        >
                            <Circle size={20} className="text-amber-200 shrink-0" />
                            <span className="text-xs font-bold text-stone-800 flex-1 leading-tight">{t.title}</span>
                            
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateTodo({ ...t, isFrog: false }); }}
                                    className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-200/50 rounded-lg transition-colors"
                                    title="取消重点"
                                >
                                    <Star size={16} fill="currentColor" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteTodo(t.id); }} 
                                    className="p-2 text-amber-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <ListTodo size={12} className="text-stone-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">待办任务 (长按编辑)</span>
                </div>
                {tadpoles.map(t => (
                    <div key={t.id} 
                        onClick={() => { if(!isLongPress.current) onUpdateTodo({ ...t, isCompleted: true, completedAt: formatDate(new Date()) }); }} 
                        onPointerDown={() => handlePointerDown(t, 'todo')}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="group bg-white border border-stone-100 rounded-xl p-4 flex items-center gap-3 mb-2 shadow-sm cursor-pointer hover:border-stone-200 transition-all select-none touch-manipulation"
                    >
                        <Circle size={20} className="text-stone-200 shrink-0" />
                        <span className="text-xs font-bold text-stone-800 flex-1 leading-tight">{t.title}</span>
                        
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateTodo({ ...t, isFrog: true }); }}
                                className="p-2 text-stone-300 hover:text-amber-400 hover:bg-amber-50 rounded-lg transition-colors"
                                title="标记重点"
                            >
                                <Star size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteTodo(t.id); }} className="p-2 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
                {tadpoles.length === 0 && frogs.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-stone-300 gap-2">
                    <ListTodo size={24} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">暂无记录</span>
                  </div>
                )}
            </section>

            {completedList.length > 0 && (
                <section className="opacity-50">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">已完成</span>
                    </div>
                    {completedList.map(t => (
                        <div key={t.id} className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex items-center gap-3 mb-2">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                            <span className="text-xs font-bold text-stone-400 line-through flex-1">{t.title}</span>
                        </div>
                    ))}
                </section>
            )}
          </div>
      </div>

      {/* 右侧：常驻任务模板库（桌面端） */}
      <aside className="hidden lg:flex w-80 flex-col border-l border-stone-100 shadow-sm overflow-hidden">
          {renderTaskPool()}
      </aside>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* 统一视图控制 Toolbar - 极简模式 */}
       <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 px-4 py-2 border-b border-stone-100 flex items-center justify-between shrink-0 gap-3 h-12">
          {/* View Mode Switcher */}
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 shrink-0">
              {(['list', 'week'] as ViewMode[]).map(m => (
                  <button 
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={cn(
                          "px-2.5 py-1 text-[10px] font-black rounded-md transition-all flex items-center gap-1",
                          viewMode === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                      )}
                  >
                      {m === 'list' && <List size={12} />}
                      {m === 'week' && <Columns size={12} />}
                      <span className="hidden sm:inline">{m === 'list' ? '列表' : '周'}</span>
                  </button>
              ))}
          </div>
          
          {/* Filters - Only for List View */}
          {viewMode === 'list' && (
              <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar mask-gradient items-center justify-end">
                  {(Object.keys(filterLabels) as FilterRange[]).map((range) => (
                      <button 
                        key={range} 
                        onClick={() => setActiveFilter(range)} 
                        className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black border transition-all uppercase whitespace-nowrap", 
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

      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'list' && <ListView />}
        {viewMode === 'week' && <WeekView />}
      </div>

      {/* 移动端任务库抽屉 (仅在 List 视图下显示) */}
      {viewMode === 'list' && isTaskPoolOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md h-[70vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
               {/* Mobile Task Pool also uses the new compact header */}
               <div className="flex justify-between items-center px-4 py-3 bg-stone-50 border-b border-stone-100 shrink-0">
                   <h3 className="font-black text-[10px] text-stone-800 uppercase tracking-widest leading-none">选择行为</h3>
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
