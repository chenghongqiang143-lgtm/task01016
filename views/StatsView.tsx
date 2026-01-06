
import React, { useMemo, useState } from 'react';
import { Task, DayData, HOURS } from '../types';
import { Clock, TrendingUp, Target, X, Calendar as CalendarIcon, LayoutGrid, Award } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, startOfMonth, endOfMonth, zhCN } from 'date-fns';
import { formatDate, cn } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface StatsViewProps {
  tasks: Task[];
  scheduleData: DayData;
  recordData: DayData;
  allSchedules: Record<string, DayData>;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  dateObj: Date;
  isOpen: boolean;
  isModal?: boolean;
  onClose: () => void;
}

type StatsRange = 'day' | 'week' | 'month';

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  allRecords,
  dateObj,
  isOpen,
  isModal = true,
  onClose
}) => {
  const [range, setRange] = useState<StatsRange>('day');

  const selectedPeriod = useMemo(() => {
    if (range === 'day') return [dateObj];
    if (range === 'week') return eachDayOfInterval({ start: startOfWeek(dateObj, { weekStartsOn: 1 }), end: endOfWeek(dateObj, { weekStartsOn: 1 }) });
    return eachDayOfInterval({ start: startOfMonth(dateObj), end: endOfMonth(dateObj) });
  }, [dateObj, range]);

  const statsData = useMemo(() => {
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);

    selectedPeriod.forEach(day => {
      const dKey = formatDate(day);
      const dayRec = allRecords[dKey]?.hours || {};
      HOURS.forEach(h => {
        const actualRec = dayRec[h] || [];
        actualRec.forEach(tid => {
          if (stats[tid] !== undefined) stats[tid] += (1 / actualRec.length);
        });
      });
    });

    const periodDays = selectedPeriod.length;

    return tasks.map(t => {
      const actual = stats[t.id] || 0;
      const dailyGoal = t.targets ? (t.targets.value / t.targets.frequency) : 0;
      const periodGoal = dailyGoal * periodDays;
      const progress = periodGoal > 0 ? Math.min((actual / periodGoal) * 100, 100) : 0;

      return {
        ...t,
        actual,
        goal: periodGoal,
        progress
      };
    }).filter(t => t.actual > 0 || t.goal > 0).sort((a, b) => b.actual - a.actual);
  }, [selectedPeriod, allRecords, tasks]);

  const pieData = useMemo(() => {
    return statsData
      .filter(s => s.actual > 0)
      .map(s => ({ name: s.name, value: parseFloat(s.actual.toFixed(1)), color: s.color }));
  }, [statsData]);

  if (!isOpen) return null;

  const content = (
    <div className={cn(
        "bg-white flex flex-col overflow-hidden",
        isModal ? "rounded-xl w-full max-w-2xl h-[85vh] border border-stone-300 shadow-2xl animate-in zoom-in-95 duration-200" : "h-full w-full"
    )}>
        {!isModal && (
          <div className="px-6 py-4 bg-stone-100 border-b border-stone-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-900 text-white rounded-lg shadow-sm">
                      <TrendingUp size={18} />
                  </div>
                  <h3 className="font-black text-stone-900 text-sm">时间统计</h3>
              </div>
              <div className="flex bg-white p-0.5 rounded-lg border border-stone-200 shadow-sm">
                  {(['day', 'week', 'month'] as StatsRange[]).map((r) => (
                      <button 
                          key={r}
                          onClick={() => setRange(r)}
                          className={cn(
                              "px-3 py-1 text-[10px] font-black rounded-md transition-all",
                              range === r ? "bg-stone-900 text-white shadow-sm" : "text-stone-400 hover:text-stone-600"
                          )}
                      >
                          {r === 'day' ? '日' : r === 'week' ? '周' : '月'}
                      </button>
                  ))}
              </div>
          </div>
        )}

        {isModal && (
          <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                      <TrendingUp size={18} />
                  </div>
                  <div>
                      <h3 className="font-black text-stone-800 text-sm">时间统计</h3>
                  </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                  <X size={20} />
              </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-100/30 p-4 space-y-4 pb-32">
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                    <LayoutGrid size={12} /> 时长分布比例
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    <div className="h-48 w-48 shrink-0">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-stone-200 border-2 border-dashed border-stone-100 rounded-full">
                                <span className="text-[10px] font-bold uppercase">无数据</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3">
                        {statsData.filter(s => s.actual > 0).map(stat => (
                            <div key={stat.id} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold text-stone-600 truncate">{stat.name}</span>
                                    <span className="text-[11px] font-black text-stone-900 tabular-nums">{stat.actual.toFixed(1)}h</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                    <Award size={12} /> 目标达成
                </h3>
                <div className="space-y-4">
                    {statsData.filter(s => s.goal > 0).map(stat => (
                        <div key={stat.id} className="space-y-1.5">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[11px] font-bold text-stone-700">{stat.name}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[10px] font-black text-stone-900">{stat.actual.toFixed(1)} / {stat.goal.toFixed(1)}h</span>
                                    <span className="text-[9px] font-black text-stone-900">{Math.round(stat.progress)}%</span>
                                </div>
                            </div>
                            <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                        width: `${stat.progress}%`, 
                                        backgroundColor: stat.color 
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock size={12} /> 详细流水
                    </h3>
                </div>
                <div className="divide-y divide-stone-50">
                    {statsData.filter(s => s.actual > 0).map(stat => (
                        <div key={stat.id} className="px-6 py-3.5 flex items-center justify-between group hover:bg-stone-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                <span className="text-xs font-bold text-stone-800">{stat.name}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-stone-900">{stat.actual.toFixed(1)}</span>
                                <span className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">H</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );

  return isModal ? (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
        {content}
    </div>
  ) : content;
};
