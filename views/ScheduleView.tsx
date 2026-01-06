
import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { TimelineRow } from '../components/TimelineRow';
import { cn } from '../utils';
import { Repeat, LayoutList, ChevronRight } from 'lucide-react';

interface ScheduleViewProps {
  tasks: Task[];
  dayData: DayData;
  recurringData: Record<number, string[]>;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  recordData?: DayData; 
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  tasks,
  dayData,
  recurringData,
  onUpdateHour,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask,
  recordData = { hours: {} }
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [showTaskPool, setShowTaskPool] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  useEffect(() => {
      if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) setSelectedTaskId(null);
  }, [tasks, selectedTaskId]);

  const taskStats = useMemo(() => {
    const stats: Record<string, { actual: number; goal: number }> = {};
    tasks.forEach(t => stats[t.id] = { actual: 0, goal: t.targets?.value || 0 });
    HOURS.forEach(h => {
        const actual = recordData.hours[h] || [];
        actual.forEach(tid => { if(stats[tid]) stats[tid].actual += (1 / (actual.length || 1)); });
    });
    return stats;
  }, [tasks, recordData]);

  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const handleTaskClick = (taskId: string) => {
      setSelectedTaskId(selectedTaskId === taskId ? null : taskId);
  };

  const handleHourClick = (hour: number) => {
      if (!selectedTaskId) {
          // If no task selected, maybe show the task pool to help user
          if (!showTaskPool) setShowTaskPool(true);
          return;
      }
      if (isRepeatMode) {
         const current = recurringData[hour] || [];
         if (current.includes(selectedTaskId)) onUpdateRecurring(hour, current.filter(id => id !== selectedTaskId));
         else onUpdateRecurring(hour, current.length < 4 ? [...current, selectedTaskId] : [...current.slice(1), selectedTaskId]);
      } else {
         const current = dayData.hours[hour] || [];
         if (current.includes(selectedTaskId)) onUpdateHour(hour, current.filter(id => id !== selectedTaskId));
         else onUpdateHour(hour, current.length < 4 ? [...current, selectedTaskId] : [...current.slice(1), selectedTaskId]);
      }
  };

  return (
    <div className="flex h-full bg-white">
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative h-full pb-32 border-r border-stone-100 custom-scrollbar">
         <div className={cn("sticky top-0 backdrop-blur-md z-20 px-3 py-2 flex justify-between items-center border-b transition-colors", isRepeatMode ? "bg-purple-50/95 border-purple-100" : "bg-white/95 border-stone-50")}>
             <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold tracking-wider uppercase", isRepeatMode ? "text-purple-600" : "text-primary")}>
                    {isRepeatMode ? "循环设定" : "今日日程"}
                </span>
                {selectedTaskId && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">已选中</span>}
             </div>
             
             {!showTaskPool && (
               <button 
                 onClick={() => setShowTaskPool(true)}
                 className="p-1.5 text-stone-400 hover:text-primary transition-colors"
                 title="打开任务池"
               >
                 <LayoutList size={18} />
               </button>
             )}
        </div>
        <div className="pt-1">
          {HOURS.map(hour => (
            // Fix: Updated TimelineRow props to match the component's expected interface
            <TimelineRow 
              key={hour} 
              hour={hour} 
              assignedScheduleIds={dayData.hours[hour] || []} 
              assignedRecordIds={recordData.hours[hour] || []}
              allTasks={tasks} 
              onScheduleClick={handleHourClick} 
              onRecordClick={() => {}}
            />
          ))}
        </div>
      </div>

      {showTaskPool && (
        <div className="w-[180px] sm:w-[240px] md:w-[300px] bg-[#fafaf9] flex flex-col h-full shrink-0 border-l border-stone-100 animate-in slide-in-from-right duration-300">
          <div className="p-2 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTaskPool(false)} className="p-1 text-stone-400 hover:text-stone-600 transition-colors">
                <ChevronRight size={16} />
              </button>
              <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">任务池</h2>
            </div>
            <button onClick={() => setIsRepeatMode(!isRepeatMode)} className={cn("px-2 py-0.5 rounded-md border text-[9px] font-bold flex items-center gap-1", isRepeatMode ? "bg-purple-600 text-white border-purple-600" : "bg-white text-stone-500 border-stone-100")}>
                <Repeat size={10} /> 重复
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-1.5 pb-32 space-y-3 pt-3 custom-scrollbar">
            {categories.map(cat => (
              <div key={cat}>
                 <div className="flex items-center gap-2 mb-2 px-1">
                    <h3 className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">{cat}</h3>
                    <div className="h-px bg-stone-200 flex-1"></div>
                 </div>
                 <div className="grid grid-cols-1 gap-1.5">
                    {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
                      const stats = taskStats[task.id];
                      const goalCompletion = stats.goal > 0 ? (stats.actual / stats.goal) * 100 : 0;
                      return (
                        <div 
                          key={task.id} 
                          onClick={() => handleTaskClick(task.id)} 
                          onDoubleClick={() => { setEditingTask(task); setIsEditModalOpen(true); }}
                          className={cn(
                              "group bg-white rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden flex items-center gap-3", 
                              selectedTaskId === task.id ? "ring-2 ring-primary border-transparent shadow-sm" : "border-stone-100 hover:border-stone-200"
                          )}
                        >
                           {/* Integrated Progress Fill */}
                           {stats.goal > 0 && (
                              <div 
                                  className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out z-0"
                                  style={{ 
                                      width: `${Math.min(goalCompletion, 100)}%`, 
                                      backgroundColor: task.color,
                                      opacity: 0.12
                                  }} 
                              />
                           )}

                           <div className="w-1.5 h-1.5 rounded-full shrink-0 relative z-10" style={{ backgroundColor: task.color }} />
                           
                           <div className="flex-1 min-w-0 relative z-10 flex justify-between items-center">
                               <span className="text-[11px] font-bold text-stone-700 truncate">{task.name}</span>
                               {stats.goal > 0 && (
                                   <span className="text-[9px] font-mono font-bold text-stone-400 ml-2">
                                       {Math.round(goalCompletion)}%
                                   </span>
                               )}
                           </div>

                           {/* Selection Dot Overlay */}
                           {selectedTaskId === task.id && (
                               <div className="absolute right-1.5 top-1.5 w-1.5 h-1.5 bg-primary rounded-full shadow-sm z-20" />
                           )}
                        </div>
                      );
                    })}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} />
    </div>
  );
};
