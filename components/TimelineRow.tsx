
import React from 'react';
import { Task } from '../types';
import { getContrastColor, cn } from '../utils';

interface TimelineRowProps {
  hour: number;
  assignedScheduleIds: string[];
  assignedRecordIds: string[];
  allTasks: Task[];
  onScheduleClick: (hour: number) => void;
  onRecordClick: (hour: number) => void;
  isScheduleSelected?: boolean;
  isRecordSelected?: boolean;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  hour,
  assignedScheduleIds,
  assignedRecordIds,
  allTasks,
  onScheduleClick,
  onRecordClick,
  isScheduleSelected,
  isRecordSelected
}) => {
  const getTasksFromIds = (ids: string[]) => 
    ids.map(id => allTasks.find(t => t.id === id)).filter((t): t is Task => !!t);

  const scheduleTasks = getTasksFromIds(assignedScheduleIds);
  const recordTasks = getTasksFromIds(assignedRecordIds);

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  const renderTasks = (tasks: Task[], type: 'plan' | 'actual') => {
    const isSelected = (type === 'plan' && isScheduleSelected) || (type === 'actual' && isRecordSelected);
    
    if (tasks.length === 0) return (
        <div className={cn(
            "w-full h-full flex items-center justify-center transition-all duration-300",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
            <div className={cn(
                "w-1 h-1 rounded-full transition-colors",
                isSelected ? "bg-stone-300" : "bg-stone-200"
            )} />
        </div>
    );
    return (
      <div className="flex gap-0.5 w-full h-full overflow-hidden p-0.5">
        {tasks.map((task, idx) => (
          <div
            key={`${task.id}-${idx}`}
            className={cn(
                "flex-1 h-full rounded-[3px] flex items-center justify-center font-medium truncate leading-none transition-all border border-black/5",
                tasks.length > 3 ? "px-0 text-[9px]" : "px-1 text-[10px]"
            )}
            style={{ 
              backgroundColor: task.color, 
              color: getContrastColor(task.color)
            }}
          >
            {tasks.length <= 3 ? task.name : task.name.slice(0, 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-9 border-b border-stone-50 group transition-colors">
      <div 
        className={cn(
          "flex-1 flex transition-all duration-200 relative overflow-hidden",
          isScheduleSelected ? "bg-indigo-100 shadow-[inset_0_0_10px_rgba(99,102,241,0.15)]" : "hover:bg-stone-50/50"
        )}
        onClick={() => onScheduleClick(hour)}
      >
        {renderTasks(scheduleTasks, 'plan')}
        {scheduleTasks.length > 0 && <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-indigo-200/30" />}
      </div>

      <div className={cn(
        "w-12 flex-shrink-0 flex items-center justify-center text-[9px] font-mono transition-all duration-300 select-none z-10 border-x border-stone-100 bg-white",
        (isScheduleSelected || isRecordSelected) 
            ? "text-stone-900 font-bold scale-110 bg-stone-50" 
            : "text-stone-300 group-hover:text-stone-400"
      )}>
        {formatHour(hour)}
      </div>

      <div 
        className={cn(
          "flex-1 flex transition-all duration-200 relative overflow-hidden",
          isRecordSelected ? "bg-emerald-100 shadow-[inset_0_0_10px_rgba(16,185,129,0.15)]" : "hover:bg-stone-50/50"
        )}
        onClick={() => onRecordClick(hour)}
      >
        {renderTasks(recordTasks, 'actual')}
        {recordTasks.length > 0 && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-200/30" />}
      </div>
    </div>
  );
};
