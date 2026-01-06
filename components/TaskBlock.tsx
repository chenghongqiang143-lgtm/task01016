
import React from 'react';
import { Task } from '../types';
import { getContrastColor, cn } from '../utils';
import { Edit2, Target } from 'lucide-react';

interface TaskBlockProps {
  task: Task;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
  selected?: boolean;
  className?: string;
  showEditIcon?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const TaskBlock: React.FC<TaskBlockProps> = ({ 
  task, 
  onClick, 
  onDoubleClick, 
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  selected, 
  className,
  showEditIcon = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const textColor = getContrastColor(task.color);
  const hasTargets = task.targets && (task.targets.value > 0 || (task.targets as any).duration > 0);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart) {
      onDragStart(e, task);
    }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer select-none border border-black/5",
        selected ? "ring-2 ring-offset-1 ring-primary shadow-lg scale-[1.02]" : "hover:scale-[1.01] hover:shadow-md",
        "active:scale-95",
        className
      )}
      style={{ backgroundColor: task.color }}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <span 
            className="font-medium text-[13px] sm:text-[14px] truncate leading-tight tracking-wide"
            style={{ color: textColor }}
        >
          {task.name}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {hasTargets && (
            <Target size={14} color={textColor} className="opacity-70" />
        )}
        
        {showEditIcon && (
            <div 
                className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full",
                    textColor === '#ffffff' ? "hover:bg-white/20" : "hover:bg-black/10"
                )}
            >
                <Edit2 size={14} color={textColor} />
            </div>
        )}
      </div>
      
      {selected && (
        <div className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm" />
      )}
    </div>
  );
};
