
import React, { useState, useMemo, useRef } from 'react';
import { Todo, Objective, Task } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, generateId, formatDate } from '../utils';
import { Plus, CheckCircle2, Circle, Star, X, LayoutGrid, Trash2, ChevronRight, ListTodo } from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth } from 'date-fns';

type FilterRange = 'unfinished' | 'today' | 'week' | 'month' | 'all';

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
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterRange>('today');
  
  // 使用 any 类型以兼容不同运行环境下的 setTimeout 返回值类型
  const longPressTimer = useRef<any>(null);

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

  // --- 处理函数 ---
  
  // 点击模板弹出弹窗，并立即关闭模板选择器（移动端抽屉）
  const handleTemplateClick = (task: Task) => {
    setIsTaskPoolOpen(false); // 关键：点击后关闭移动端“选择模板”抽屉
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

  // 长按逻辑
  const handleLongPress = (item: Task | Todo, type: 'task' | 'todo') => {
    if (type === 'task') {
      setEditingTask(item as Task);
      setIsTaskEditorOpen(true);
    } else {
      setEditingTodo(item as Todo);
      setIsTodoModalOpen(true);
    }
  };

  const startLongPress = (item: Task | Todo, type: 'task' | 'todo') => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(item, type);
      longPressTimer.current = null;
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const renderTaskPool = () => (
    <div className="flex flex-col h-full bg-stone-50/50">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
             <div className="flex items-center gap-2">
                <LayoutGrid size={14} className="text-stone-400" />
                <h3 className="text-[10px] font-black text-stone-900 uppercase tracking-widest leading-none">任务模板 (长按编辑)</h3>
             </div>
             <button onClick={() => { setEditingTask(null); setIsTaskEditorOpen(true); }} className="p-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-all">
                <Plus size={14} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <div className="grid grid-cols-1 gap-2">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTemplateClick(task)} 
                    onPointerDown={() => startLongPress(task, 'task')}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    className="group p-3 bg-white border border-stone-100 rounded-xl flex items-center justify-between hover:border-stone-300 transition-all cursor-pointer shadow-sm relative overflow-hidden select-none active:scale-95"
                  >
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color }} />
                      <span className="text-[12px] font-bold text-stone-800 ml-2">{task.name}</span>
                      <ChevronRight size={14} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
            </div>
        </div>
    </div>
  );

  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* 左侧：待办清单 */}
      <div className="flex-1 flex flex-col h-full border-r border-stone-100">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-100 px-5 py-3 flex items-center gap-2">
              <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {(Object.keys(filterLabels) as FilterRange[]).map((range) => (
                      <button key={range} onClick={() => setActiveFilter(range)} className={cn("px-3 py-1.5 rounded-full text-[10px] font-black border transition-all uppercase whitespace-nowrap", activeFilter === range ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-white text-stone-400 border-stone-100")}>{filterLabels[range]}</button>
                  ))}
              </div>
              <button onClick={() => { setEditingTodo(null); setIsTodoModalOpen(true); }} className="w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg shrink-0"><Plus size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-8 custom-scrollbar">
            {frogs.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">核心焦点 (长按编辑)</span>
                    </div>
                    {frogs.map(t => (
                        <div key={t.id} 
                            onClick={() => onUpdateTodo({ ...t, isCompleted: true, completedAt: formatDate(new Date()) })} 
                            onPointerDown={() => startLongPress(t, 'todo')}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3 mb-2 cursor-pointer hover:bg-amber-100 transition-all select-none"
                        >
                            <Circle size={20} className="text-amber-200" />
                            <span className="text-xs font-bold text-stone-800 flex-1">{t.title}</span>
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
                        onClick={() => onUpdateTodo({ ...t, isCompleted: true, completedAt: formatDate(new Date()) })} 
                        onPointerDown={() => startLongPress(t, 'todo')}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        className="group bg-white border border-stone-100 rounded-xl p-4 flex items-center gap-3 mb-2 shadow-sm cursor-pointer hover:border-stone-200 transition-all select-none"
                    >
                        <Circle size={20} className="text-stone-200" />
                        <span className="text-xs font-bold text-stone-800 flex-1">{t.title}</span>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteTodo(t.id); }} className="text-stone-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
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

      {/* 移动端任务库抽屉 */}
      {isTaskPoolOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md h-[70vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center px-6 py-4 bg-stone-50 border-b border-stone-100 shrink-0">
                  <h3 className="font-black text-[10px] text-stone-800 uppercase tracking-widest leading-none">选择模板</h3>
                  <button onClick={() => setIsTaskPoolOpen(false)} className="p-2 hover:bg-stone-200 rounded-full text-stone-400 transition-colors"><X size={20} /></button>
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
          onDelete={onDeleteTodo} frogCount={frogs.length}
      />
      <TaskEditorModal 
        isOpen={isTaskEditorOpen} onClose={() => setIsTaskEditorOpen(false)} 
        task={editingTask} onSave={(t) => t.id ? onUpdateTask?.(t) : onAddTask?.(t)} 
        onDelete={onDeleteTask || (() => {})} objectives={objectives} simplified={true}
      />
    </div>
  );
};
