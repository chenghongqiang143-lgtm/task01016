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
  
  const [targetMode, setTargetMode] = useState<TargetMode>('duration');
  const [targetValue, setTargetValue] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('1');
  
  const [totalValue, setTotalValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setObjectiveId(todo.objectiveId || 'none');
        setIsFrog(todo.isFrog);
        setStartDate(todo.startDate || '');
        setActualStartDate(todo.actualStartDate || todo.startDate || ''); 
        setSubTasks(todo.subTasks || []);
        setShowDeleteConfirm(false);
        if (todo.targets) {
            // Fix: Added safety check for toString calls
            setTargetValue(todo.targets.value !== undefined ? todo.targets.value.toString() : '');
            setTargetFrequency(todo.targets.frequency !== undefined ? todo.targets.frequency.toString() : '1');
            setTargetMode(todo.targets.mode || 'duration');
            setTotalValue(todo.targets.totalValue !== undefined ? todo.targets.totalValue.toString() : '');
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
      targets
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4">
      <div className="bg-white rounded-3xl w-full max-w-[380px] overflow-hidden border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 bg-stone-50 border-b border-stone-100 shrink-0">
          <h3 className="font-black text-sm text-stone-800">
            {todo ? '编辑任务' : '新建任务'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full text-stone-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          <div className="space-y-2">
            <div className="flex justify-between items-center pr-1">
                <label className="text-xs font-bold text-stone-50 ml-1 opacity-0">任务名称</label>
                <button
                    type="button"
                    onClick={() => setIsFrog(!isFrog)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
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
              className="w-full px-4 py-3 bg-white border-2 border-stone-100 rounded-xl focus:outline-none focus:border-primary transition-all font-bold text-sm text-stone-900"
              placeholder="你想完成什么？"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 ml-1">所属分类</label>
            <div className="flex flex-wrap gap-2">
              <button
                key="none"
                type="button"
                onClick={() => setObjectiveId('none')}
                className={cn(
                  "px-4 py-2 rounded-lg border text-[11px] font-bold transition-all",
                  objectiveId === 'none' 
                    ? "bg-primary text-white border-primary shadow-sm" 
                    : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
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
                    "px-4 py-2 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-2",
                    objectiveId === obj.id 
                      ? "bg-white border-primary text-primary shadow-md ring-1 ring-primary" 
                      : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                  )}
                  style={objectiveId === obj.id ? { borderColor: 'rgb(var(--color-primary))' } : {}}
                >
                  <div className={cn("w-2 h-2 rounded-full", objectiveId === obj.id ? "" : "bg-stone-300")} style={{ backgroundColor: objectiveId === obj.id ? obj.color : undefined }} />
                  {obj.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-1">
              <Calendar size={12} /> 日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-stone-100 rounded-xl focus:outline-none focus:border-primary transition-all font-bold text-sm text-stone-800"
            />
          </div>

          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">单次目标</span>
                  <div className="flex bg-white rounded-lg p-0.5 border border-stone-100">
                      <button type="button" onClick={() => setTargetMode('duration')} className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", targetMode === 'duration' ? "bg-primary text-white" : "text-stone-400")}>时长</button>
                      <button type="button" onClick={() => setTargetMode('count')} className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", targetMode === 'count' ? "bg-primary text-white" : "text-stone-400")}>次数</button>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-stone-400 flex items-center gap-1 ml-1">{targetMode === 'duration' ? <Clock size={10} /> : <Hash size={10} />} {targetMode === 'duration' ? '每次(h)' : '次数'}</label>
                      <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-100 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-primary" placeholder="0" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-bold text-stone-400 flex items-center gap-1 ml-1"><LayoutList size={10} /> 周期(天)</label>
                      <input type="number" value={targetFrequency} onChange={(e) => setTargetFrequency(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-100 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-primary" placeholder="1" />
                  </div>
              </div>

               <div className="pt-3 border-t border-stone-200 mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">长期目标</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <label className="text-[9px] font-bold text-stone-400 flex items-center gap-1 ml-1">
                              <Flag size={10} /> 总量
                          </label>
                          <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={totalValue} onChange={(e) => setTotalValue(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-100 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-primary" placeholder="无" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-bold text-stone-400 flex items-center gap-1 ml-1">
                             <Hourglass size={10} /> 截止日期
                          </label>
                          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-100 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-primary min-h-[34px]" />
                      </div>
                  </div>
              </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 ml-1 flex items-center gap-2">
               <ListTodo size={12} /> 任务拆解
            </label>
            <div className="space-y-2">
              {subTasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 group bg-stone-50 p-2 rounded-xl border border-transparent hover:border-stone-100 transition-all">
                  <button 
                    type="button" 
                    onClick={() => handleToggleSubTask(st.id)}
                    className={cn("p-1 rounded-lg transition-colors", st.isCompleted ? "text-white bg-primary" : "text-stone-300 bg-white border border-stone-100")}
                  >
                    <CheckSquare size={16} />
                  </button>
                  <span className={cn("text-xs font-bold flex-1", st.isCompleted ? "text-stone-300 line-through" : "text-stone-600")}>
                    {st.title}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSubTask(st.id)}
                    className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
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
                  className="flex-1 px-4 py-3 bg-white border-2 border-stone-100 rounded-xl focus:outline-none text-xs font-bold focus:border-primary transition-all"
                  placeholder="添加步骤..."
                />
                <button 
                  type="button" 
                  onClick={handleAddSubTask}
                  className="w-10 flex items-center justify-center bg-stone-100 text-stone-500 rounded-xl hover:bg-primary hover:text-white transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="p-5 bg-stone-50 border-t border-stone-100 flex gap-3 shrink-0">
          {showDeleteConfirm ? (
              <div className="flex gap-3 flex-1 animate-in zoom-in-95 fade-in duration-200">
                  <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(false)} 
                      className="flex-1 py-3 bg-white border border-stone-200 text-stone-500 rounded-xl font-bold text-xs hover:bg-stone-50 transition-colors"
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
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-1"
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
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
                  >
                    <Save size={16} /> 保存任务
                  </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};
