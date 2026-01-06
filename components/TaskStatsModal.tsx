
import React, { useMemo } from 'react';
import { Todo, Objective } from '../types';
import { X, CalendarDays, CheckCircle2, LayoutGrid } from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  isSameMonth
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, formatDate } from '../utils';

interface TaskStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
  objectives: Objective[];
  currentDate: Date;
}

export const TaskStatsModal: React.FC<TaskStatsModalProps> = ({
  isOpen,
  onClose,
  todos,
  objectives,
  currentDate
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // 生成热力图数据
  const heatmapData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map(day => {
      const dayStr = formatDate(day);
      const completedCount = todos.filter(t => t.isCompleted && t.completedAt === dayStr).length;
      return {
        date: day,
        count: completedCount
      };
    });
  }, [todos, monthStart, monthEnd]);

  // 计算日历网格（补齐前后的空白格子）
  const calendarGrid = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // 分类统计
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    objectives.forEach(obj => stats[obj.id] = 0);
    stats['none'] = 0;

    todos.forEach(t => {
      if (t.isCompleted && t.completedAt) {
        const compDate = new Date(t.completedAt);
        if (isSameMonth(compDate, currentDate)) {
          const key = t.objectiveId || 'none';
          stats[key] = (stats[key] || 0) + 1;
        }
      }
    });

    return Object.entries(stats)
      .map(([id, count]) => ({
        id,
        count,
        title: id === 'none' ? '无分类' : objectives.find(o => o.id === id)?.title || '未知',
        color: id === 'none' ? '#cbd5e1' : objectives.find(o => o.id === id)?.color || '#cbd5e1'
      }))
      .filter(s => s.count > 0 || s.id !== 'none')
      .sort((a, b) => b.count - a.count);
  }, [todos, objectives, currentDate]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-stone-50 border-stone-100';
    if (count <= 2) return 'bg-indigo-100 border-indigo-200 text-indigo-400';
    if (count <= 4) return 'bg-indigo-300 border-indigo-400 text-white';
    if (count <= 6) return 'bg-indigo-500 border-indigo-600 text-white';
    return 'bg-indigo-700 border-indigo-800 text-white';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[85vh] border border-stone-300 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        <header className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="font-black text-stone-800 text-sm">任务统计</h3>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                {format(currentDate, 'yyyy年 MMMM', { locale: zhCN })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/30 p-6 space-y-8">
          
          {/* 热力图展示 */}
          <section className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">任务达成热力图</h4>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-stone-300 font-bold">少</span>
                <div className="w-2 h-2 bg-stone-100 rounded-[2px]" />
                <div className="w-2 h-2 bg-indigo-200 rounded-[2px]" />
                <div className="w-2 h-2 bg-indigo-400 rounded-[2px]" />
                <div className="w-2 h-2 bg-indigo-600 rounded-[2px]" />
                <span className="text-[8px] text-stone-300 font-bold">多</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['一', '二', '三', '四', '五', '六', '日'].map(day => (
                <div key={day} className="text-[8px] font-black text-stone-300 text-center mb-1">{day}</div>
              ))}
              {calendarGrid.map(day => {
                const data = heatmapData.find(d => isSameDay(d.date, day));
                const isThisMonthDay = isSameMonth(day, currentDate);
                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "aspect-square rounded-[3px] border flex items-center justify-center text-[8px] font-bold transition-all relative group",
                      isThisMonthDay ? getHeatmapColor(data?.count || 0) : "opacity-10 border-transparent bg-transparent"
                    )}
                  >
                    {isThisMonthDay && data && data.count > 0 && data.count}
                    {isThisMonthDay && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-2 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
                        {format(day, 'M月d日')}: 完成 {data?.count || 0}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 分类统计 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <LayoutGrid size={14} className="text-stone-300" />
              <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">本月分类达成统计</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {categoryStats.map(stat => (
                <div key={stat.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-2 group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-[11px] font-black text-stone-600 truncate">{stat.title}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-stone-800 tracking-tighter group-hover:text-indigo-600 transition-colors">
                      {stat.count}
                    </span>
                    <span className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">项任务</span>
                  </div>
                  <div className="h-1 bg-stone-50 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        backgroundColor: stat.color, 
                        width: `${Math.min((stat.count / Math.max(...categoryStats.map(s => s.count), 1)) * 100, 100)}%` 
                      }} 
                    />
                  </div>
                </div>
              ))}
              {categoryStats.filter(s => s.count > 0).length === 0 && (
                <div className="col-span-2 py-12 flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-100 rounded-2xl bg-white/50">
                  <CheckCircle2 size={32} className="opacity-20 mb-2" />
                  <p className="text-[10px] font-bold">本月暂无完成记录</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
