
import React, { useState, useEffect } from 'react';
import { Todo, Objective, SubTask, TargetMode } from '../types';
import { X, Save, Plus, Trash2, CheckSquare, ListTodo, Calendar, Clock, Hash, LayoutList, Star, AlertCircle, Flag, Hourglass, History } from 'lucide-react';
import { cn, generateId, formatDate } from '../utils';
import { useModalBackHandler } from '../hooks';

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
  useModalBackHandler(isOpen, onClose);

  const [title, setTitle] = useState('');
  const [objectiveId, setObjectiveId] = useState('none');
  const [isFrog, setIsFrog] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Target & Frequency State
  const [targetMode, setTargetMode] = useState<TargetMode>('duration');
  const [targetValue, setTargetValue] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('1');
  
  // Long Term Goals
  const [totalValue, setTotalValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');

  // Initial load effect
  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setObjectiveId(todo.objectiveId || 'none');
        setIsFrog(todo.isFrog);
        setStartDate(todo.startDate || '');
        setActualStartDate(todo.actualStartDate || todo.startDate || ''); // Default actual start to planned start if missing
        setSubTasks(todo.subTasks || []);
        setShowDeleteConfirm(false);
        if (todo.targets) {
            setTargetValue(todo.targets.value ? todo.targets.value.toString() : '');
            setTargetFrequency(todo.targets.frequency.toString());
            setTargetMode(todo.targets.mode || 'duration');
            setTotalValue(todo.targets.totalValue ? todo.targets.totalValue.toString() : '');
            setDeadline(todo.targets.deadline || '');
        } else {
            setTargetValue(''); setTargetFrequency('1'); setTargetMode('duration');
            setTotalValue(''); setDeadline('');
        }
      } else {
        setTitle('');
        setObjectiveId('none');
        setIsFrog(false);
        const dateStr = formatDate(defaultDate);
        setStartDate(dateStr);
        setActualStartDate(dateStr);
        setSubTasks([]);
        setTargetValue(''); setTargetFrequency('1'); setTargetMode('duration');
        setTotalValue(''); setDeadline('');
        setShowDeleteConfirm(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, todo?.id]); 

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

    let targets = undefined;
    const val = parseFloat(targetValue);
    const freq = parseInt(targetFrequency);
    const total = parseFloat(totalValue);
    
    if (!isNaN(val) && val > 0 && !isNaN(freq) && freq > 0) {
        targets = { 
            mode: targetMode, 
            value: val, 
            frequency: freq,
            totalValue: (!isNaN(total) && total > 0) ? total : undefined,
            deadline: deadline || undefined
        };
    }

    onSave({
      id: todo ? todo.id : generateId(),
      title: title.trim(),
      objectiveId,
      templateId: todo?.templateId, 
      isFrog,
      isCompleted: todo ? todo.isCompleted : false,
      subTasks,
      startDate: startDate || undefined,
      actualStartDate: actualStartDate || undefined,
      createdAt: todo ? todo.createdAt : new Date().toISOString(),
      targets // Add targets
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-[380px] overflow-hidden border border-stone-300 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-5 bg-stone-50 border-b border-stone-200">
          <h3 className="font-black text-sm text-stone-800">
            {todo ? '编辑任务' : '新建任务'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* 标题 */}
          <div className="space-y-1">
            <div className="flex justify-between items-center pr-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">任务名称</label>
                <button
                    type="button"
                    onClick={() => setIsFrog(!isFrog)}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                        isFrog 
                            ? "bg-amber-50 text-amber-500 border-amber-200 shadow-sm" 
                            : "bg-white text-stone-400 border-stone-100 hover:text-stone-600 hover:border-stone-200"
                    )}
                >
                    <Star size={12} fill={isFrog ? "currentColor" : "none"} />
                    {isFrog ? "核心焦点" : "标记重点"}
                </button>
            </div>
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
                    ? "bg-primary text-white border-primary shadow-sm" 
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
                      ? "bg-primary text-white border-primary shadow-sm" 
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

          {/* 量化目标 (类似 Task Editor) */}
          <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-100 space-y-2.5">
              <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">单次目标 (可选)</span>
                  <div className="flex bg-white rounded-lg p-0.5 border border-stone-100">
                      <button type="button" onClick={() => setTargetMode('duration')} className={cn("px-2.5 py-1 rounded-md text-[9px] font-black transition-all", targetMode === 'duration' ? "bg-primary text-white" : "text-stone-400")}>时长</button>
                      <button type="button" onClick={() => setTargetMode('count')} className={cn("px-2.5 py-1 rounded-md text-[9px] font-black transition-all", targetMode === 'count' ? "bg-primary text-white" : "text-stone-400")}>次数</button>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                      <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5">{targetMode === 'duration' ? <Clock size={8} /> : <Hash size={8} />} {targetMode === 'duration' ? '每次(h)' : '次数'}</label>
                      <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300" placeholder="0" />
                  </div>
                  <div className="space-y-0.5">
                      <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5"><LayoutList size={8} /> 周期(天)</label>
                      <input type="number" value={targetFrequency} onChange={(e) => setTargetFrequency(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300" placeholder="1" />
                  </div>
              </div>

               {/* Long Term Goal Section */}
               <div className="pt-2 border-t border-stone-100/50 mt-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">长期目标与期限</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-0.5">
                          <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5">
                              <Flag size={8} /> 总量
                          </label>
                          <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={totalValue} onChange={(e) => setTotalValue(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300" placeholder="无" />
                      </div>
                      <div className="space-y-0.5">
                          <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5">
                             <Hourglass size={8} /> 截止日期
                          </label>
                          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300 min-h-[28px]" />
                      </div>
                      <div className="col-span-2 space-y-0.5">
                          <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5">
                             <History size={8} /> 项目起始日 (用于计算实际已行天数)
                          </label>
                          <input type="date" value={actualStartDate} onChange={(e) => setActualStartDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300 min-h-[28px]" />
                      </div>
                  </div>
              </div>
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
          {showDeleteConfirm ? (
              <div className="flex gap-2 flex-1 animate-in zoom-in-95 fade-in duration-200">
                  <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(false)} 
                      className="flex-1 py-3.5 bg-white border border-stone-200 text-stone-500 rounded-xl font-bold text-xs hover:bg-stone-50 transition-colors"
                  >
                      取消
                  </button>
                  <button 
                      type="button" 
                      onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          if (onDelete && todo) {
                              onDelete(todo.id); 
                              onClose(); 
                          }
                      }}
                      className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-1"
                  >
                      <Trash2 size={14} /> 确认删除
                  </button>
              </div>
          ) : (
             <>
                 {todo && onDelete && (
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 rounded-xl bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:bg-rose-50 hover:border-rose-100 transition-all flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
                  >
                    <Save size={18} /> 保存任务
                  </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};
