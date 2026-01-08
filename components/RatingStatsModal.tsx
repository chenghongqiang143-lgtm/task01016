
import React, { useState, useMemo } from 'react';
import { DayRating, RatingItem } from '../types';
import { X, TrendingUp, Calendar, ChevronLeft, ChevronRight, Star, MessageSquareQuote } from 'lucide-react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  eachWeekOfInterval,
  format, 
  startOfMonth, 
  endOfMonth,
  isSameDay,
  isSameMonth,
  isWithinInterval
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, formatDate } from '../utils';
import { useModalBackHandler } from '../hooks';

interface RatingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratings: Record<string, DayRating>;
  ratingItems: RatingItem[];
  currentDate: Date;
}

export const RatingStatsModal: React.FC<RatingStatsModalProps> = ({
  isOpen,
  onClose,
  ratings,
  ratingItems,
  currentDate
}) => {
  useModalBackHandler(isOpen, onClose);

  const [range, setRange] = useState<'week' | 'month'>('week');

  const periodInterval = useMemo(() => {
    if (range === 'week') {
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
  }, [currentDate, range]);

  // 根据模式生成列（天 或 周）
  const timeColumns = useMemo(() => {
    if (range === 'week') {
      return eachDayOfInterval(periodInterval);
    } else {
      // 月视图按周聚合
      return eachWeekOfInterval(periodInterval, { weekStartsOn: 1 });
    }
  }, [periodInterval, range]);

  const statsSummary = useMemo(() => {
    let total = 0;
    let count = 0;
    
    // 无论当前视图如何，汇总总是基于每一天的实际数据
    const daysToCalc = eachDayOfInterval(periodInterval);
    
    daysToCalc.forEach(day => {
      const key = formatDate(day);
      const rating = ratings[key];
      if (rating && rating.scores) {
        const daySum = Object.values(rating.scores).reduce<number>((a, b) => a + (b as number), 0);
        total += daySum;
        count++;
      }
    });
    return { total, count, avg: count > 0 ? (total / count).toFixed(1) : '0' };
  }, [periodInterval, ratings]);

  const getScoreColor = (score: number, isAggregated: boolean = false) => {
    if (score === 0) return 'bg-stone-200 text-stone-500';
    
    if (score > 0) {
        // 对于周汇总，分数可能很高，根据强度调整颜色
        if (isAggregated) {
            if (score >= 10) return 'bg-emerald-700 text-white';
            if (score >= 5) return 'bg-emerald-600 text-white';
            return 'bg-emerald-400 text-white';
        }
        // 单日分数 (1, 2)
        return score === 2 ? 'bg-emerald-600 text-white' : 'bg-emerald-400 text-white';
    } else {
        // 负分
        if (isAggregated) {
            if (score <= -10) return 'bg-rose-700 text-white';
            if (score <= -5) return 'bg-rose-600 text-white';
            return 'bg-rose-400 text-white';
        }
        return score === -2 ? 'bg-rose-600 text-white' : 'bg-rose-400 text-white';
    }
  };

  const calculateColumnScore = (date: Date, itemId: string) => {
      if (range === 'week') {
          // 单日直接取值
          return ratings[formatDate(date)]?.scores?.[itemId];
      } else {
          // 周汇总：计算该周内所有天的总和
          const weekStart = date;
          const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
          // 确保不超过本月范围
          const actualStart = weekStart < periodInterval.start ? periodInterval.start : weekStart;
          const actualEnd = weekEnd > periodInterval.end ? periodInterval.end : weekEnd;
          
          let sum = 0;
          let hasData = false;
          
          // 遍历这周的每一天
          const daysInWeek = eachDayOfInterval({ start: actualStart, end: actualEnd });
          for (const day of daysInWeek) {
              const score = ratings[formatDate(day)]?.scores?.[itemId];
              if (score !== undefined) {
                  sum += score;
                  hasData = true;
              }
          }
          return hasData ? sum : undefined;
      }
  };

  // Get weekly reviews
  const weeklyReviews = useMemo(() => {
    if (range !== 'week') return [];
    
    return timeColumns.map(day => {
        const key = formatDate(day);
        const comment = ratings[key]?.comment;
        return { date: day, comment };
    }).filter(item => item.comment && item.comment.trim() !== '');
  }, [range, timeColumns, ratings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] border border-stone-300 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        <header className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-black text-stone-800 text-sm">打分统计</h3>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                {format(periodInterval.start, 'M月d日')} - {format(periodInterval.end, 'M月d日')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button 
                  onClick={() => setRange('week')}
                  className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", range === 'week' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400")}
                >
                  本周
                </button>
                <button 
                  onClick={() => setRange('month')}
                  className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", range === 'month' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400")}
                >
                  本月
                </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/30 p-4 sm:p-6 space-y-6">
          
          {/* 总分卡片 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-1">
              <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">周期得分汇总</span>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-black tabular-nums tracking-tighter", statsSummary.total >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {statsSummary.total > 0 ? `+${statsSummary.total}` : statsSummary.total}
                </span>
                <span className="text-[10px] font-bold text-stone-300">PTS</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-1">
              <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">日均评估表现</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums tracking-tighter text-stone-800">{statsSummary.avg}</span>
                <Star size={16} className="text-amber-400 fill-current" />
              </div>
            </div>
          </div>

          {/* 各维度详细矩阵 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Calendar size={14} className="text-stone-300" />
              <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">维度热力 ({range === 'month' ? '按周' : '每日'})</h4>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm overflow-x-auto no-scrollbar">
              <div className="w-full">
                {/* 日期头部 */}
                <div className="flex mb-3">
                  <div className="w-20 shrink-0"></div>
                  <div className="flex-1 flex justify-between gap-1">
                    {timeColumns.map((d, idx) => (
                      <div key={d.toString()} className="flex-1 flex flex-col items-center gap-0.5 min-w-[2rem]">
                        <span className="text-[8px] font-black text-stone-300 uppercase">
                            {range === 'week' 
                                ? format(d, 'EE', { locale: zhCN }).replace('周', '') 
                                : `W${idx + 1}`
                            }
                        </span>
                        <span className={cn(
                          "text-[9px] font-bold whitespace-nowrap",
                          range === 'week' && isSameDay(d, new Date()) ? "text-primary" : "text-stone-400"
                        )}>
                            {format(d, range === 'week' ? 'd' : 'M.d')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 维度行 */}
                <div className="space-y-2">
                  {ratingItems.map(item => (
                    <div key={item.id} className="flex items-center group h-8">
                      <div className="w-20 shrink-0 pr-2">
                        <div className="text-[10px] font-black text-stone-600 truncate group-hover:text-stone-900 transition-colors">
                          {item.name}
                        </div>
                      </div>
                      <div className="flex-1 flex justify-between gap-1">
                        {timeColumns.map(date => {
                          const score = calculateColumnScore(date, item.id);
                          const hasData = score !== undefined;
                          
                          return (
                            <div 
                              key={date.toString()}
                              className={cn(
                                "flex-1 min-w-[2rem] h-full rounded-md flex items-center justify-center text-[9px] font-black transition-all border shadow-sm",
                                hasData ? getScoreColor(score!, range === 'month') : "bg-stone-50 border-stone-100 opacity-20"
                              )}
                            >
                              {hasData ? (score! > 0 ? `+${score}` : score) : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Weekly Reviews List */}
          {range === 'week' && (
             <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <MessageSquareQuote size={14} className="text-stone-300" />
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">本周复盘记录</h4>
                </div>
                
                {weeklyReviews.length > 0 ? (
                    <div className="space-y-3">
                        {weeklyReviews.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex gap-3">
                                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5 w-12 border-r border-stone-50 pr-3">
                                    <span className="text-[9px] font-black text-stone-300 uppercase">
                                        {format(item.date, 'EE', { locale: zhCN })}
                                    </span>
                                    <span className="text-xs font-black text-stone-800">
                                        {format(item.date, 'd')}
                                    </span>
                                </div>
                                <p className="text-xs text-stone-600 font-medium leading-relaxed whitespace-pre-wrap">
                                    {item.comment}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-100">
                        <span className="text-[10px] font-bold text-stone-300">本周暂无复盘内容</span>
                    </div>
                )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
