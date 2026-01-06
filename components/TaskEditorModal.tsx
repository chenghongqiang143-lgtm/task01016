
import React, { useState, useEffect } from 'react';
import { Task, TargetMode, Objective } from '../types';
import { X, Target, Type, Trash2, Save, LayoutList, Hash, Clock, Tag, Plus } from 'lucide-react';
import { cn, generateId } from '../utils';
import { ObjectiveEditorModal } from './ObjectiveEditorModal';

interface TaskEditorModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  objectives?: Objective[];
  simplified?: boolean;
  onAddObjective?: (obj: Objective) => void;
  onDeleteObjective?: (id: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#64748b', '#78716c', '#57534e', '#1e293b'
];

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  objectives = [],
  simplified = false,
  onAddObjective,
  onDeleteObjective
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCatDeleteConfirm, setShowCatDeleteConfirm] = useState(false);
  const [targetMode, setTargetMode] = useState<TargetMode>('duration');
  const [targetValue, setTargetValue] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('1');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (task) {
          setName(task.name);
          setColor(task.color);
          const catId = task.category || '';
          setCategoryId(catId);
          const matchedObj = objectives.find(o => o.id === catId);
          setCategoryInput(matchedObj ? matchedObj.title : (catId === 'uncategorized' ? '' : catId));
          setShowDeleteConfirm(false);
          setShowCatDeleteConfirm(false);
          if (task.targets) {
              setTargetValue(task.targets.value ? task.targets.value.toString() : '');
              setTargetFrequency(task.targets.frequency.toString());
              setTargetMode(task.targets.mode || 'duration');
          } else {
              setTargetValue(''); setTargetFrequency('1'); setTargetMode('duration');
          }
        } else {
          setName(''); setCategoryId(''); setCategoryInput(''); setColor('#3b82f6');
          setTargetValue(''); setTargetFrequency('1'); setTargetMode('duration');
          setShowDeleteConfirm(false); setShowCatDeleteConfirm(false);
        }
    }
  }, [isOpen, task, objectives]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let targets = undefined;
    if (!simplified) {
        const val = parseFloat(targetValue);
        const freq = parseInt(targetFrequency);
        if (!isNaN(val) && val > 0 && !isNaN(freq) && freq > 0) {
            targets = { mode: targetMode, value: val, frequency: freq };
        }
    }
    const matchedObj = objectives.find(o => o.title === categoryInput.trim());
    const finalCategory = matchedObj ? matchedObj.id : (categoryId || categoryInput.trim());
    onSave({ id: task ? task.id : '', name: name.trim(), color, category: finalCategory, targets });
    onClose();
  };

  const handleCategoryInputChange = (val: string) => {
      setCategoryInput(val);
      setShowCatDeleteConfirm(false);
      const obj = objectives.find(o => o.title === val);
      if (obj) { setCategoryId(obj.id); setColor(obj.color); } 
      else { setCategoryId(''); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[320px] overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-5 py-4 bg-stone-50 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-stone-900 text-white rounded-lg"><Target size={12} /></div>
            <h3 className="font-black text-[13px] text-stone-800 tracking-tight">{simplified ? '新建待办模板' : '行为模板设定'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 transition-colors"><X size={18} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar space-y-5 bg-white">
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">模板名称</label>
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors"><Type size={12} /></div>
                    <input type="text" value={name} onChange={(e) => {setName(e.target.value); setShowDeleteConfirm(false);}} className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-bold text-xs text-stone-800 shadow-sm" placeholder="你想做什么？" autoFocus />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">分类标签</label>
                <div className="flex gap-2">
                    <div className="relative group flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors"><Tag size={12} /></div>
                        <input list="cat-opts" value={categoryInput} onChange={(e) => handleCategoryInputChange(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-bold text-xs text-stone-700 shadow-sm" placeholder="输入或选择分类..." />
                        <datalist id="cat-opts">{objectives.map(obj => (<option key={obj.id} value={obj.title} />))}</datalist>
                    </div>
                    {onAddObjective && (
                        <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors border border-stone-200"><Plus size={14} /></button>
                    )}
                </div>
            </div>
          </div>

          {!simplified && (
            <>
              <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">量化目标</span>
                      <div className="flex bg-white rounded-lg p-0.5 border border-stone-100">
                          <button type="button" onClick={() => setTargetMode('duration')} className={cn("px-2.5 py-1 rounded-md text-[9px] font-black transition-all", targetMode === 'duration' ? "bg-stone-900 text-white" : "text-stone-400")}>时长</button>
                          <button type="button" onClick={() => setTargetMode('count')} className={cn("px-2.5 py-1 rounded-md text-[9px] font-black transition-all", targetMode === 'count' ? "bg-stone-900 text-white" : "text-stone-400")}>次数</button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-0.5">
                          <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5">{targetMode === 'duration' ? <Clock size={8} /> : <Hash size={8} />} {targetMode === 'duration' ? '目标(h)' : '次数'}</label>
                          <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300" placeholder="0" />
                      </div>
                      <div className="space-y-0.5">
                          <label className="text-[8px] font-black text-stone-300 uppercase flex items-center gap-1 ml-0.5"><LayoutList size={8} /> 周期(天)</label>
                          <input type="number" value={targetFrequency} onChange={(e) => setTargetFrequency(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-stone-300" placeholder="1" />
                      </div>
                  </div>
              </div>
              
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">标识色彩</label>
                <div className="grid grid-cols-10 gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button 
                      type="button" 
                      key={c} 
                      onClick={() => setColor(c)} 
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center",
                        color === c ? "border-stone-900 scale-110 shadow-sm" : "border-transparent hover:scale-110"
                      )} 
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </form>

        <div className="p-5 bg-stone-50 border-t border-stone-100 flex gap-2 shrink-0">
             {task && task.id && (
                 <button type="button" onClick={() => {if (showDeleteConfirm) {onDelete(task.id); onClose();} else {setShowDeleteConfirm(true);}}} className={cn("px-4 rounded-xl transition-all flex items-center justify-center", showDeleteConfirm ? "bg-red-500 text-white flex-1" : "bg-white border border-stone-200 text-stone-300 hover:text-red-500 hover:bg-rose-50")}>
                     {showDeleteConfirm ? <span className="font-black text-[10px] whitespace-nowrap px-1">确认删除?</span> : <Trash2 size={16} />}
                 </button>
             )}
             {!showDeleteConfirm && (
                <button type="submit" onClick={handleSubmit} className="flex-1 py-3.5 rounded-xl bg-stone-900 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg active:scale-[0.98]"><Save size={14} /> 保存设定</button>
             )}
        </div>
      </div>
      
      <ObjectiveEditorModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} objective={null} onSave={(obj) => {
            if (onAddObjective) {
                const newObj = { ...obj, id: `obj_${generateId()}` };
                onAddObjective(newObj); setCategoryId(newObj.id); setCategoryInput(newObj.title); setColor(newObj.color);
            }
        }} zIndex={210} />
    </div>
  );
};
