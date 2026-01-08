
import React, { useState, useEffect } from 'react';
import { Objective } from '../types';
import { X, Save, Target, AlignLeft, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';
import { useModalBackHandler } from '../hooks';

interface ObjectiveEditorModalProps {
  objective: Objective | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (objective: Objective) => void;
  onDelete?: (id: string) => void;
  zIndex?: number;
}

export const ObjectiveEditorModal: React.FC<ObjectiveEditorModalProps> = ({
  objective,
  isOpen,
  onClose,
  onSave,
  onDelete,
  zIndex = 200
}) => {
  useModalBackHandler(isOpen, onClose);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#64748b');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (objective) {
        setTitle(objective.title);
        setDescription(objective.description || '');
        setColor(objective.color);
      } else {
        setTitle('');
        setDescription('');
        setColor('#64748b');
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, objective]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ 
      id: objective ? objective.id : '', 
      title: title.trim(), 
      description: description.trim(), 
      color 
    });
    onClose();
  };

  return (
    <div className={cn("fixed inset-0 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm")} style={{ zIndex }}>
      <div className="bg-white rounded-2xl w-full max-w-[320px] overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-5 py-4 bg-stone-50 border-b border-stone-100 shrink-0">
          <h3 className="font-black text-[13px] text-stone-800 tracking-tight">
             {objective ? '编辑领域分类' : '新增领域分类'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5 bg-white">
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">分类名称</label>
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-900 transition-colors">
                        <Target size={14} />
                    </div>
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setShowDeleteConfirm(false);
                        }}
                        className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-100 rounded-lg focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-bold text-xs text-stone-800"
                        placeholder="例如：自我成长"
                        autoFocus
                    />
                </div>
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">分类描述</label>
                <div className="relative group">
                    <div className="absolute left-3 top-3 text-stone-300 group-focus-within:text-stone-900 transition-colors">
                        <AlignLeft size={14} />
                    </div>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-100 rounded-lg focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-medium text-xs text-stone-600 resize-none h-24"
                        placeholder="描述此分类包含的活动..."
                    />
                </div>
            </div>
          </div>
          
          <div className="pt-2 flex gap-2">
             {objective && onDelete && (
                 <button 
                    type="button" 
                    onClick={() => {
                        if (showDeleteConfirm) {
                            onDelete(objective.id);
                            onClose();
                        } else {
                            setShowDeleteConfirm(true);
                        }
                    }} 
                    className={cn(
                        "px-4 rounded-xl transition-all flex items-center justify-center gap-2",
                        showDeleteConfirm 
                            ? "bg-red-500 text-white flex-1 animate-in slide-in-from-right-2" 
                            : "bg-stone-50 border border-stone-100 text-stone-400 hover:text-red-500 hover:bg-rose-50"
                    )}
                 >
                     {showDeleteConfirm ? (
                         <span className="font-black text-[10px] whitespace-nowrap px-1">确认删除？</span>
                     ) : (
                         <Trash2 size={18} />
                     )}
                 </button>
             )}
             
             {!showDeleteConfirm && (
                 <button 
                    type="submit" 
                    disabled={!title.trim()}
                    className="flex-1 py-3.5 rounded-xl bg-stone-900 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                 >
                   <Save size={16} /> 保存设定
                 </button>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};
