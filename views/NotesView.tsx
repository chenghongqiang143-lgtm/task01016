import React, { useState, useMemo } from 'react';
import { MemoItem } from '../types';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import { formatDate } from '../utils';
import { Plus, Clock, Edit2, CheckCircle2, Search } from 'lucide-react';
import { MemoEditorModal } from '../components/MemoEditorModal';
import { cn } from '../utils';

interface NotesViewProps {
  memos: MemoItem[];
  onAddMemo: (memo: MemoItem) => void;
  onUpdateMemo: (memo: MemoItem) => void;
  onDeleteMemo: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  memos = [],
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpdateLastDone = (e: React.MouseEvent, memo: MemoItem) => {
    e.stopPropagation();
    const today = formatDate(new Date());
    if (memo.lastDone !== today) {
        onUpdateMemo({ ...memo, lastDone: today });
    }
  };

  const getDaysAgo = (dateStr: string) => {
    if (!dateStr) return '未执行';
    try {
        const date = parseISO(dateStr);
        if (!isValid(date)) return '日期无效';
        
        const diff = differenceInCalendarDays(new Date(), date);
        if (diff === 0) return '今天';
        if (diff === 1) return '昨天';
        return `${diff} 天前`;
    } catch (e) {
        return '日期无效';
    }
  };

  const getDaysAgoColor = (dateStr: string) => {
      if (!dateStr) return 'text-stone-400 bg-stone-50 border-stone-100';
      try {
          const date = parseISO(dateStr);
          if (!isValid(date)) return 'text-stone-400 bg-stone-50 border-stone-100';

          const diff = differenceInCalendarDays(new Date(), date);
          if (diff === 0) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
          if (diff <= 3) return 'text-blue-500 bg-blue-50 border-blue-100';
          if (diff <= 7) return 'text-amber-500 bg-amber-50 border-amber-100';
          return 'text-rose-500 bg-rose-50 border-rose-100';
      } catch (e) {
          return 'text-stone-400 bg-stone-50 border-stone-100';
      }
  };

  const sortedMemos = useMemo(() => {
      return [...memos]
        .filter(m => m && m.title && m.title.toLowerCase().includes((searchTerm || '').toLowerCase()))
        .sort((a, b) => {
            // Sort by days ago descending (longest time not done first)
            let diffA = -1;
            let diffB = -1;
            try {
                if (a.lastDone) diffA = differenceInCalendarDays(new Date(), parseISO(a.lastDone));
            } catch(e) {}
            try {
                if (b.lastDone) diffB = differenceInCalendarDays(new Date(), parseISO(b.lastDone));
            } catch(e) {}
            
            // Put "never done" or invalid dates at the top or bottom? 
            // Let's put never done (undefined/invalid) at the top as they might be urgent
            if (!a.lastDone && b.lastDone) return -1;
            if (a.lastDone && !b.lastDone) return 1;
            
            return diffB - diffA;
        });
  }, [memos, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Bar */}
      <div className="px-6 py-4 bg-white border-b border-stone-100 sticky top-0 z-10 shrink-0">
          <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索记事..." 
                  className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-300 transition-all"
              />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 pb-32 bg-stone-50/30">
        {sortedMemos.map(memo => (
            <div 
                key={memo.id}
                onClick={() => { setEditingMemo(memo); setIsModalOpen(true); }}
                className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-start justify-between gap-4 group active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden"
            >
                <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="text-sm font-black text-stone-800 truncate">{memo.title}</h3>
                    {memo.remarks && (
                        <p className="text-[10px] text-stone-400 line-clamp-2 font-medium leading-relaxed bg-stone-50 p-1.5 rounded-lg">
                            {memo.remarks}
                        </p>
                    )}
                    <div className="flex items-center gap-1 text-[9px] font-bold text-stone-300 pt-1">
                        <Clock size={10} /> 上次: {memo.lastDone || '未记录'}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1", getDaysAgoColor(memo.lastDone))}>
                        {getDaysAgo(memo.lastDone)}
                    </div>
                    <button 
                        onClick={(e) => handleUpdateLastDone(e, memo)}
                        className="w-10 h-10 rounded-full bg-stone-50 text-stone-300 border border-stone-100 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg transition-all active:scale-90 z-10"
                        title="标记为今天执行"
                    >
                        <CheckCircle2 size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        ))}

        {sortedMemos.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-stone-300">
                <Clock size={40} className="mb-4 opacity-20" />
                <span className="text-xs font-black uppercase tracking-widest">
                    {searchTerm ? '无匹配结果' : '暂无记事'}
                </span>
            </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 z-20 md:hidden">
          <button 
              onClick={() => { setEditingMemo(null); setIsModalOpen(true); }}
              className="w-14 h-14 bg-stone-900 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all"
          >
              <Plus size={24} />
          </button>
      </div>
      
      {/* Desktop Add Button */}
      <div className="hidden md:block absolute bottom-8 right-8 z-20">
           <button 
              onClick={() => { setEditingMemo(null); setIsModalOpen(true); }}
              className="w-14 h-14 bg-stone-900 text-white rounded-full shadow-float flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
              <Plus size={24} />
          </button>
      </div>

      <MemoEditorModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          memo={editingMemo} 
          onSave={(item) => {
              if (editingMemo) onUpdateMemo(item);
              else onAddMemo(item);
          }}
          onDelete={onDeleteMemo}
      />
    </div>
  );
};
