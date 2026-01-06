
import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn } from '../utils';
import { LayoutList, ChevronRight } from 'lucide-react';

interface RecordViewProps {
  tasks: Task[];
  dayData: DayData;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const RecordView: React.FC<RecordViewProps> = ({
  tasks,
  dayData,
  onUpdateHour,
  onUpdateTask,
  onDeleteTask
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showTaskSelection, setShowTaskSelection] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  useEffect(() => {
      if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) setSelectedTaskId(null);
  }, [tasks, selectedTaskId]);

  // Calculate today's goal completion for each task to show integrated progress
  const taskStats = useMemo(() => {
    const stats: Record<string, { actual: number; goal: number }> = {};
    tasks.forEach(t => stats[t.id] = { actual: 0, goal: t.targets?.value || 0 });
    HOURS.forEach(h => {
        const actual = dayData.hours[h] || [];
        actual.forEach(tid => { if(stats[tid]) stats[tid].actual += (1 / (actual.length || 1)); });
    });
    return stats;
  }, [tasks, dayData]);

  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId === selectedTaskId ? null : taskId);
  };

  const handleHourClick = (hour: number) => {
    if (!selectedTaskId) {
        if (!showTaskSelection) setShowTaskSelection(true);
        return;
    }
    const current = dayData.hours[hour] || [];
    if (current.includes(selectedTaskId)) {
        onUpdateHour(hour, current.filter(id => id !== selectedTaskId));
    } else {
        onUpdateHour(hour, current.length < 4 ? [...current, selectedTaskId] : [...current.slice(1), selectedTaskId]);
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left: Real-time Record Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white h-full pb-32 border-r border-stone-100 custom-scrollbar">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-3 py-2.5 flex justify-between items-center border-b border-stone-50 shadow-sm">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-secondary tracking-wider uppercase">真实记录</span>
                {selectedTaskId && <span className="text-[9px] text-secondary font-bold bg-secondary/5 px-2 py-0.5 rounded-full border border-secondary/10">点击时间轴添加</span>}
             </div>
             
             {!showTaskSelection && (
               <button 
                 onClick={() => setShowTaskSelection(true)}
                 className="p-1.5 text-stone-400 hover:text-secondary transition-colors"
                 title="选择任务"
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
              assignedScheduleIds={[]} 
              assignedRecordIds={dayData.hours[hour] || []} 
              allTasks={tasks} 
              onScheduleClick={() => {}}
              onRecordClick={handleHourClick} 
            />
          ))}
        </div>
      </div>

      {/* Right: Task Pool with integrated progress background */}
      {showTaskSelection && (
        <div className="w-[180px] sm:w-[240px] md:w-[300px] bg-[#fafaf9] flex flex-col h-full shrink-0 transition-all duration-300 border-l border-stone-100 animate-in slide-in-from-right duration-300">
          <div className="p-2 sm:p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTaskSelection(false)} className="p-1 text-stone-400 hover:text-stone-600 transition-colors">
                <ChevronRight size={16} />
              </button>
              <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">任务选择</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 pb-32 space-y-4 pt-3 custom-scrollbar">
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
                              selectedTaskId === task.id ? "ring-2 ring-secondary border-transparent shadow-sm" : "border-stone-100 hover:border-stone-200"
                          )}
                        >
                           {/* Integrated Goal Progress Fill */}
                           {stats.goal > 0 && (
                              <div 
                                  className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out z-0"
                                  style={{ 
                                      width: `${Math.min(goalCompletion, 100)}%`, 
                                      backgroundColor: task.color,
                                      opacity: 0.15
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

                           {/* Selection Indicator Overlay */}
                           {selectedTaskId === task.id && (
                               <div className="absolute right-1.5 top-1.5 w-1.5 h-1.5 bg-secondary rounded-full shadow-sm z-20" />
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
