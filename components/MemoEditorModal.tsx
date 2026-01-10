import React, { useState, useEffect } from 'react';
import { MemoItem } from '../types';
import { X, Save, Trash2, Calendar, FileText, StickyNote } from 'lucide-react';
import { cn, generateId, formatDate } from '../utils';
import { useModalBackHandler } from '../hooks';

interface MemoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: MemoItem | null;
  onSave: (memo: MemoItem) => void;
  onDelete?: (id: string) => void;
}

export const MemoEditorModal: React.FC<MemoEditorModalProps> = ({
  isOpen,
  onClose,
  memo,
  onSave,
  onDelete
}) => {
  useModalBackHandler(isOpen, onClose);

  const [title, setTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lastDone, setLastDone] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (memo) {
        setTitle(memo.title);
        setRemarks(memo.remarks || '');
        setLastDone(memo.lastDone || formatDate(new Date()));
      } else {
        setTitle('');
        setRemarks('');
        setLastDone(formatDate(new Date()));
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, memo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: memo ? memo.id : generateId(),
      title: title.trim(),
      remarks: remarks.trim(),
      lastDone,
      createdAt: memo ? memo.createdAt : new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-5 py-4 bg-stone-50 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
             <StickyNote size={16} className="text-stone-900" />
             <h3 className="font-black text-[13px] text-stone-800 tracking-tight">
                {memo ? '编辑记事' : '新建记事'}
             </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5 bg-white">
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">事项内容</label>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-bold text-sm text-stone-800"
                    placeholder="例如：给绿萝浇水"
                    autoFocus
                />
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Calendar size={10} /> 上次执行日期
                </label>
                <input 
                    type="date" 
                    value={lastDone}
                    onChange={(e) => setLastDone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-bold text-xs text-stone-800"
                />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <FileText size={10} /> 备注信息
                </label>
                <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full h-24 px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:bg-white focus:border-stone-900 transition-all font-medium text-xs text-stone-600 resize-none"
                    placeholder="备注..."
                />
            </div>
          </div>
          
          <div className="pt-2 flex gap-2">
             {memo && onDelete && (
                 <div className={cn("flex transition-all duration-300 overflow-hidden", showDeleteConfirm ? "flex-1 gap-2" : "w-11")}>
                     {!showDeleteConfirm ? (
                         <button 
                             type="button" 
                             onClick={() => setShowDeleteConfirm(true)} 
                             className="w-11 h-11 shrink-0 rounded-xl bg-stone-50 border border-stone-100 text-stone-400 hover:text-red-500 hover:bg-rose-50 flex items-center justify-center transition-all"
                         >
                             <Trash2 size={18} />
                         </button>
                     ) : (
                         <>
                             <button 
                                 type="button" 
                                 onClick={() => setShowDeleteConfirm(false)} 
                                 className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                             >
                                 取消
                             </button>
                             <button 
                                 type="button" 
                                 onClick={() => { onDelete(memo.id); onClose(); }} 
                                 className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                             >
                                 删除
                             </button>
                         </>
                     )}
                 </div>
             )}
             
             {!showDeleteConfirm && (
                 <button 
                    type="submit" 
                    disabled={!title.trim()}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                 >
                   <Save size={16} /> 保存
                 </button>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};