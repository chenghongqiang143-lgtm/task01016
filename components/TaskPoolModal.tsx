import React, { useState, useRef } from 'react';
import { Task, Objective } from '../types';
import { X, Plus, Edit2, Layers, CheckCircle } from 'lucide-react';
import { cn } from '../utils';
import { useModalBackHandler } from '../hooks';
import { TaskEditorModal } from './TaskEditorModal';
import { ObjectiveEditorModal } from './ObjectiveEditorModal';

interface TaskPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  objectives: Objective[];
  categoryOrder: string[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddObjective: (obj: Objective) => void;
  onUpdateObjective: (obj: Objective) => void;
  onDeleteObjective: (id: string) => void;
  onUpdateCategoryOrder: (order: string[]) => void;
  onSelectTask?: (task: Task) => void;
}

export const TaskPoolModal: React.FC<TaskPoolModalProps> = ({
  isOpen,
  onClose,
  tasks,
  objectives,
  categoryOrder,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
  onUpdateCategoryOrder,
  onSelectTask
}) => {
  useModalBackHandler(isOpen, onClose);
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  
  // Ref for long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isOpen) return null;

  const sortedObjectives = [...objectives].sort((a, b) => {
        const idxA = categoryOrder.indexOf(a.id);
        const idxB = categoryOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  const getObjectiveTitle = (id: string) => {
    if (id === 'all') return '全部';
    if (id === 'none') return '未分类';
    return objectives.find(o => o.id === id)?.title || '未分类';
  };

  const visibleTasks = tasks.filter(t => {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'none') return !t.category || t.category === 'none' || t.category === 'uncategorized';
      return t.category === activeCategory;
  });

  const handleTaskPointerDown = (task: Task) => {
    longPressTimer.current = setTimeout(() => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
        longPressTimer.current = null;
    }, 600);
  };

  const handleTaskPointerUp = (task: Task) => {
    if (longPressTimer.current) {
        // Short press detected
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        if (onSelectTask) {
            onSelectTask(task);
        } else {
             // Fallback if no select handler, just edit
             setEditingTask(task);
             setIsTaskModalOpen(true);
        }
    }
  };
  
  const handleTaskPointerLeave = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg h-[85vh] border border-stone-300 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <header className="flex flex-col border-b border-stone-100 bg-white shrink-0">
            <div className="px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-stone-900" />
                    <h3 className="font-black text-stone-800 text-[13px]">任务库</h3>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400"><X size={18} /></button>
            </div>
            
            {/* Category Scroll Bar */}
            <div className="px-4 pb-3 flex overflow-x-auto no-scrollbar gap-2">
                <button 
                    onClick={() => setActiveCategory('all')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0",
                        activeCategory === 'all' ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100"
                    )}
                >
                    全部
                </button>
                {sortedObjectives.map(obj => (
                    <button 
                        key={obj.id}
                        onClick={() => setActiveCategory(obj.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5",
                            activeCategory === obj.id ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100"
                        )}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setEditingObjective(obj);
                            setIsObjModalOpen(true);
                        }}
                    >
                        <div className={cn("w-1.5 h-1.5 rounded-full", activeCategory === obj.id ? "bg-white" : "")} style={{ backgroundColor: activeCategory === obj.id ? undefined : obj.color }} />
                        {obj.title}
                    </button>
                ))}
                <button 
                    onClick={() => setActiveCategory('none')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0",
                        activeCategory === 'none' ? "bg-primary text-white border-primary" : "bg-stone-50 text-stone-400 border-stone-100"
                    )}
                >
                    未分类
                </button>
                <button 
                    onClick={() => { setEditingObjective(null); setIsObjModalOpen(true); }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border shrink-0 bg-white border-dashed border-stone-200 text-stone-400 hover:text-primary hover:border-primary"
                >
                    + 分类
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-stone-50/30">
            <div className="grid grid-cols-2 gap-2.5">
                {visibleTasks.map(task => (
                    <div 
                        key={task.id}
                        onPointerDown={() => handleTaskPointerDown(task)}
                        onPointerUp={() => handleTaskPointerUp(task)}
                        onPointerLeave={handleTaskPointerLeave}
                        className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex items-center gap-3 active:scale-95 transition-transform cursor-pointer select-none group relative overflow-hidden"
                    >
                        <div className="w-1.5 h-full absolute left-0 top-0 bottom-0" style={{ backgroundColor: task.color }} />
                        <div className="flex-1 min-w-0 pl-1">
                            <h4 className="font-black text-stone-800 text-xs truncate">{task.name}</h4>
                            <p className="text-[9px] text-stone-400 truncate mt-0.5">
                                {task.targets?.value ? `目标: ${task.targets.value}${task.targets.mode === 'duration' ? 'h' : '次'}` : '无量化目标'}
                            </p>
                        </div>
                        {/* Hint for long press */}
                        <Edit2 size={10} className="text-stone-200 opacity-0 group-hover:opacity-100 absolute right-2 top-2" />
                    </div>
                ))}
                
                <button 
                    onClick={() => { 
                        setEditingTask({ id: '', name: '', color: '#3b82f6', category: activeCategory !== 'all' && activeCategory !== 'none' ? activeCategory : 'none', targets: undefined } as Task); 
                        setIsTaskModalOpen(true); 
                    }} 
                    className="h-14 rounded-xl border border-dashed border-stone-200 flex items-center justify-center gap-1.5 text-stone-400 hover:border-primary hover:text-primary hover:bg-white transition-all active:scale-95"
                >
                    <Plus size={16} /> <span className="text-[10px] font-black">新建任务</span>
                </button>
            </div>
        </div>
        
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 text-center shrink-0">
             <span className="text-[9px] font-bold text-stone-400">长按卡片可编辑任务详情，点击添加到今日</span>
        </div>
      </div>

      <TaskEditorModal 
          isOpen={isTaskModalOpen} 
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} 
          task={editingTask} 
          onSave={(task) => { 
             if (editingTask && editingTask.id) onUpdateTask(task);
             else onAddTask(task);
          }} 
          onDelete={onDeleteTask} 
          objectives={objectives}
          onAddObjective={onAddObjective} 
      />
      
      <ObjectiveEditorModal 
          isOpen={isObjModalOpen} 
          onClose={() => { setIsObjModalOpen(false); setEditingObjective(null); }} 
          objective={editingObjective} 
          onSave={(obj) => {
             if (editingObjective) onUpdateObjective(obj);
             else onAddObjective(obj);
          }}
          onDelete={onDeleteObjective}
          zIndex={210} 
      />
    </div>
  );
};
