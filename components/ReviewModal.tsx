
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  initialContent: string;
  onSave: (content: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  date,
  initialContent,
  onSave
}) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
    }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-stone-300">
        <div className="flex justify-between items-center px-6 py-4 bg-stone-50 border-b border-stone-200">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 rounded-full text-indigo-600 border border-indigo-100">
                <PenLine size={18} />
             </div>
             <div>
                 <h3 className="font-bold text-lg text-stone-800 leading-tight">每日复盘</h3>
                 <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">
                    {format(date, 'yyyy/MM/dd EEEE', { locale: zhCN })}
                 </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto bg-white">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="记录今天的心得、反思或明天的计划..."
                className="w-full h-64 p-4 bg-stone-50 rounded-xl border border-stone-200 focus:border-stone-400 focus:bg-white focus:outline-none transition-all text-stone-700 leading-relaxed resize-none text-sm font-medium"
                autoFocus
            />
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
             <button
                onClick={handleSave}
                className="px-6 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-all flex items-center gap-2 active:scale-95"
             >
                 <Save size={18} />
                 保存记录
             </button>
        </div>
      </div>
    </div>
  );
};
