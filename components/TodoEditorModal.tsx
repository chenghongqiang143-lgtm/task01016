
import React, { useState, useEffect } from 'react';
import { Todo, Objective, SubTask } from '../types';
import { X, Save, Plus, Trash2, CheckSquare, ListTodo, Calendar } from 'lucide-react';
import { cn, generateId, formatDate } from '../utils';

interface TodoEditorModalProps {
  todo: Todo | null;
  objectives: Objective[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  onDelete?: (id: string) => void;
  frogCount: number;
  defaultDate?: Date;
}

export const TodoEditorModal: React.FC<TodoEditorModalProps> = ({
  todo,
  objectives,
  isOpen,
  onClose,
  onSave,
  onDelete,
  frogCount,
  defaultDate = new Date()
}) => {
  const [title, setTitle] = useState('');
  const [objectiveId, setObjectiveId] = useState('none');
  const [isFrog, setIsFrog] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setObjectiveId(todo.objectiveId || 'none');
        setIsFrog(todo.isFrog);
        setStartDate(todo.startDate || '');
        setSubTasks(todo.subTasks || []);
      } else {
        setTitle('');
        setObjectiveId('none');
        setIsFrog(false);
        // 锁定预设内容为传入的 defaultDate (当前选中的日期)
        setStartDate(formatDate(defaultDate));
        setSubTasks([]);
      }
    }
  }, [isOpen, todo, objectives, defaultDate]);

  if (!isOpen) return null;

  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    setSubTasks([...subTasks, { id: generateId(), title: newSubTaskTitle.trim(), isCompleted: false }]);
    setNewSubTaskTitle('');
  };

  const handleRemoveSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
  };

  const handleToggleSubTask = (id: string) => {
    setSubTasks(subTasks.map(st => st.id === id ? { ...st, isCompleted: !st.isCompleted } : st));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: todo ? todo.id : generateId(),
      title: title.trim(),
      objectiveId,
      isFrog,
      isCompleted: todo ? todo.isCompleted : false,
      subTasks,
      startDate: startDate || undefined,
      createdAt: todo ? todo.createdAt : new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-[380px] overflow-hidden border border-stone-300 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-5 bg-stone-50 border-b border-stone-200">
          <h3 className="font-black text-sm text-stone-800">
            {todo ? '编辑待办' : '新建待办'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* 标题 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">任务名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:border-stone-400 transition-all font-bold text-sm"
              placeholder="你想完成什么？"
              autoFocus
            />
          </div>

          {/* 目标分类选择 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">所属分类</label>
            <div className="flex flex-wrap gap-2">
              <button
                key="none"
                type="button"
                onClick={() => setObjectiveId('none')}
                className={cn(
                  "px-4 py-2 rounded-lg border text-[10px] font-black transition-all",
                  objectiveId === 'none' 
                    ? "bg-stone-900 text-white border-stone-900 shadow-sm" 
                    : "bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200"
                )}
              >
                无分类
              </button>
              {objectives.map(obj => (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setObjectiveId(obj.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-[10px] font-black transition-all flex items-center gap-2",
                    objectiveId === obj.id 
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm" 
                      : "bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200"
                  )}
                >
                  {obj.title}
                </button>
              ))}
            </div>
          </div>

          {/* 日期 - 直接显示 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Calendar size={10} /> 日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:border-stone-400 transition-all font-bold text-sm"
            />
          </div>

          {/* 子任务 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1 flex items-center gap-2">
               <ListTodo size={12} /> 任务拆解
            </label>
            <div className="space-y-2">
              {subTasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 group">
                  <button 
                    type="button" 
                    onClick={() => handleToggleSubTask(st.id)}
                    className={cn("p-1 rounded transition-colors", st.isCompleted ? "text-emerald-500" : "text-stone-300")}
                  >
                    <CheckSquare size={16} fill={st.isCompleted ? "currentColor" : "none"} className={st.isCompleted ? "text-white" : ""} />
                  </button>
                  <span className={cn("text-xs font-bold flex-1", st.isCompleted ? "text-stone-300 line-through" : "text-stone-600")}>
                    {st.title}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSubTask(st.id)}
                    className="p-1 text-stone-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubTask())}
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:outline-none text-xs font-bold"
                  placeholder="添加步骤..."
                />
                <button 
                  type="button" 
                  onClick={handleAddSubTask}
                  className="p-2 bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="p-5 bg-stone-50 border-t border-stone-200 flex gap-2">
          {todo && onDelete && (
            <button 
              type="button" 
              onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  onDelete(todo.id); 
                  onClose(); 
              }}
              className="p-3 rounded-lg bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            type="button" 
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg bg-stone-900 text-white font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> 保存任务
          </button>
        </div>
      </div>
    </div>
  );
};
