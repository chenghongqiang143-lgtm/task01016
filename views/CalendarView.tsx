
import React, { useState, useMemo } from 'react';
import { Todo, DayData, Task, Objective } from '../types';
import { cn, formatDate } from '../utils';
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, 
  startOfMonth, endOfMonth, isSameDay, isSameMonth, 
  addMonths, subMonths, addWeeks, subWeeks 
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, CheckCircle2, Clock, Calendar } from 'lucide-react';

interface CalendarViewProps {
  todos: Todo[];
  allRecords: Record<string, DayData>;
  tasks: Task[];
  objectives: Objective[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  todos,
  allRecords,
  tasks,
  objectives,
  currentDate,
  onDateChange
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');

  // Helper to get day data
  const getDaySummary = (date: Date) => {
    const dateStr = formatDate(date);
    const dayTodos = todos.filter(t => t.isCompleted && t.completedAt === dateStr);
    const dayRecord = allRecords[dateStr];
    
    let totalHours = 0;
    if (dayRecord && dayRecord.hours) {
        Object.values(dayRecord.hours).forEach((ids: string[]) => {
            if (ids && ids.length > 0) totalHours += 1;
        });
    }

    return {
      completedCount: dayTodos.length,
      recordedHours: totalHours,
      todos: dayTodos
    };
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks = ['一', '二', '三', '四', '五', '六', '日'];

    return (
      <div className="flex flex-col h-full bg-white animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
        {/* Calendar Grid */}
        <div className="p-4 shrink-0">
           <div className="grid grid-cols-7 mb-2">
              {weeks.map(w => (
                  <div key={w} className="text-center text-[10px] font-black text-stone-300 py-2">{w}</div>
              ))}
           </div>
           <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map(day => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, currentDate);
                  const summary = getDaySummary(day);
                  
                  return (
                      <button 
                          key={day.toString()}
                          onClick={() => onDateChange(day)}
                          className={cn(
                              "aspect-[4/5] sm:aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 sm:pt-2 transition-all relative border",
                              isSelected 
                                ? "bg-primary text-white border-primary z-10" 
                                : (isCurrentMonth ? "bg-white border-stone-100 text-stone-700 hover:border-stone-300" : "bg-stone-50/50 border-transparent text-stone-300")
                          )}
                      >
                          <span className={cn("text-xs font-bold leading-none", isToday && !isSelected ? "text-primary" : "")}>
                              {format(day, 'd')}
                          </span>
                          
                          {/* Activity Dots */}
                          <div className="mt-auto mb-1.5 flex gap-0.5 justify-center flex-wrap px-1 w-full">
                              {summary.completedCount > 0 && (
                                  <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/70" : "bg-emerald-400")} />
                              )}
                              {summary.recordedHours > 0 && (
                                  <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/70" : "bg-blue-400")} />
                              )}
                              {summary.completedCount > 3 && (
                                  <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/70" : "bg-stone-300")} />
                              )}
                          </div>
                      </button>
                  );
              })}
           </div>
        </div>

        {/* Selected Day Detail - Removed its own overflow to scroll with the grid */}
        <div className="flex-1 bg-stone-50 border-t border-stone-100 p-6 pb-40">
            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CalendarDays size={12} /> {format(currentDate, 'M月d日')} 概览
            </h3>
            
            <div className="space-y-4">
                {getDaySummary(currentDate).todos.length > 0 ? (
                    getDaySummary(currentDate).todos.map(todo => {
                        const obj = objectives.find(o => o.id === todo.objectiveId);
                        return (
                            <div key={todo.id} className="bg-white p-3 rounded-xl border border-stone-100 flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={12} strokeWidth={3} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-stone-800 truncate">{todo.title}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: obj?.color || '#ccc' }} />
                                            <span className="text-[9px] text-stone-400">{obj?.title || '未分类'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-xl">
                        <span className="text-[10px] font-bold text-stone-400">当日无完成任务</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="flex flex-col h-full bg-stone-50 animate-in slide-in-from-right-4 duration-300">
         {/* Added pb-32 to prevent bottom navigation bar overlap */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40 custom-scrollbar">
            {weekDays.map(day => {
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, currentDate);
                const summary = getDaySummary(day);
                const hasContent = summary.completedCount > 0 || summary.recordedHours > 0;
                
                return (
                    <div 
                        key={day.toString()} 
                        onClick={() => onDateChange(day)}
                        className={cn("flex gap-3 cursor-pointer", !hasContent && !isToday && !isSelected && "opacity-60")}
                    >
                        {/* Date Column */}
                        <div className="flex flex-col items-center w-12 shrink-0 pt-1">
                            <span className={cn("text-[9px] font-black uppercase mb-0.5", isToday ? "text-primary" : "text-stone-400")}>
                                {format(day, 'EEE', { locale: zhCN })}
                            </span>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                                isSelected ? "bg-primary text-white" : (isToday ? "bg-white text-primary border border-stone-100" : "bg-white text-stone-700 border border-stone-100")
                            )}>
                                {format(day, 'd')}
                            </div>
                            {hasContent && <div className="w-0.5 h-full bg-stone-200 mt-2 -mb-4 rounded-full" />}
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 pb-4">
                            <div className={cn(
                                "bg-white rounded-2xl p-4 border space-y-3 transition-all",
                                isSelected ? "border-primary ring-1 ring-primary" : "border-stone-100"
                            )}>
                                {summary.completedCount === 0 && summary.recordedHours === 0 ? (
                                    <span className="text-[10px] font-bold text-stone-300 italic">无记录</span>
                                ) : (
                                    <>
                                        {summary.recordedHours > 0 && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold flex items-center gap-1">
                                                    <Clock size={10} /> 记录 {summary.recordedHours}h
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            {summary.todos.map(todo => (
                                                <div key={todo.id} className="flex items-center gap-2">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", todo.isCompleted ? "bg-emerald-400" : "bg-stone-300")} />
                                                    <span className={cn("text-xs font-medium text-stone-700", todo.isCompleted && "line-through text-stone-400")}>
                                                        {todo.title}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
         </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
       {/* Header */}
       <div className="px-4 py-3 bg-white border-b border-stone-100 flex justify-between items-center shrink-0">
           <div className="flex bg-stone-100 p-0.5 rounded-xl border border-stone-200">
               <button 
                  onClick={() => setViewMode('month')}
                  className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5", viewMode === 'month' ? "bg-primary text-white border border-primary" : "text-stone-400 border border-transparent")}
               >
                   <Calendar size={12} /> 月
               </button>
               <button 
                  onClick={() => setViewMode('week')}
                  className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5", viewMode === 'week' ? "bg-primary text-white border border-primary" : "text-stone-400 border border-transparent")}
               >
                   <LayoutList size={12} /> 周
               </button>
           </div>

           <div className="flex items-center gap-2">
               <button 
                   onClick={() => onDateChange(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))}
                   className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors"
               >
                   <ChevronLeft size={18} />
               </button>
               <span className="text-sm font-black text-stone-800 w-24 text-center">
                   {format(currentDate, viewMode === 'month' ? 'yyyy年 M月' : 'M月', { locale: zhCN })}
                   {viewMode === 'week' && <span className="text-[9px] text-stone-400 ml-1">第{format(currentDate, 'w')}周</span>}
               </span>
               <button 
                   onClick={() => onDateChange(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))}
                   className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors"
               >
                   <ChevronRight size={18} />
               </button>
           </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-hidden">
           {viewMode === 'month' ? renderMonthView() : renderWeekView()}
       </div>
    </div>
  );
};
