import React, { useState, useMemo } from 'react';
import { DayRating } from '../types';
import { X, MessageSquareQuote, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths,
  isSameMonth
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, formatDate } from '../utils';
import { useModalBackHandler } from '../hooks';

interface ReviewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratings: Record<string, DayRating>;
}

export const ReviewHistoryModal: React.FC<ReviewHistoryModalProps> = ({
  isOpen,
  onClose,
  ratings
}) => {
  useModalBackHandler(isOpen, onClose);
  
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const periodRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
    }
  }, [viewMode, currentDate]);

  const reviewList = useMemo(() => {
    const days = eachDayOfInterval(periodRange);
    
    // Sort descending (newest first)
    return days.reverse().map(day => {
      const key = formatDate(day);
      const rating = ratings[key];
      const hasContent = rating && rating.comment && rating.comment.trim().length > 0;
      return {
        date: day,
        content: hasContent ? rating.comment : null,
        hasContent
      };
    }).filter(item => item.hasContent);
  }, [periodRange, ratings]);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[85vh] border border-stone-300 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        <header className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white border border-stone-100 text-stone-700 rounded-lg shadow-sm">
              <MessageSquareQuote size={18} />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-sm">复盘记录</h3>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                {viewMode === 'week' ? 'Weekly Review' : 'Monthly Review'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={20} />
          </button>
        </header>

        {/* Filters & Navigation */}
        <div className="px-6 py-3 bg-white border-b border-stone-50 flex items-center justify-between shrink-0">
             <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button 
                  onClick={() => setViewMode('week')}
                  className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", viewMode === 'week' ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600")}
                >
                  按周查看
                </button>
                <button 
                  onClick={() => setViewMode('month')}
                  className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", viewMode === 'month' ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600")}
                >
                  按月查看
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate('prev')} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-black text-stone-700 tabular-nums w-24 text-center">
                    {viewMode === 'week' 
                        ? `${format(periodRange.start, 'M.d')} - ${format(periodRange.end, 'M.d')}`
                        : format(currentDate, 'yyyy年 M月', { locale: zhCN })
                    }
                </span>
                <button onClick={() => handleNavigate('next')} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/30 p-4 sm:p-6 space-y-4">
            {reviewList.length > 0 ? (
                reviewList.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-3 group hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-2 pb-2 border-b border-stone-50">
                            <Calendar size={14} className="text-primary/70" />
                            <span className="text-[11px] font-black text-stone-900">
                                {format(item.date, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                            </span>
                        </div>
                        <div className="text-xs font-medium text-stone-600 leading-relaxed whitespace-pre-wrap pl-1">
                            {item.content}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <MessageSquareQuote size={32} className="text-stone-300 mb-2" />
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        该时段暂无复盘内容
                    </span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
