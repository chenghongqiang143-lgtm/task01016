
import React, { useState, useMemo, useRef } from 'react';
import { Task, DayData, Objective, HOURS, RolloverSettings } from '../types';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { Plus, ArrowUp, ArrowDown, Edit2, Check, Copy, ClipboardPaste, Trash2, Database, X, AlertCircle, CalendarClock, Target, Save, FileJson, Layers, ChevronDown } from 'lucide-react';
import { cn, formatDate } from '../utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useModalBackHandler } from '../hooks';

interface SettingsTabProps {
  tasks: Task[];
  categoryOrder: string[]; 
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateCategoryOrder: (newOrder: string[]) => void;
  showInstallButton: boolean;
  onInstall: () => void;
  onExportData: () => void;
  onImportData: (dataStr: string) => void;
  onClearData: () => void;
  allSchedules: Record<string, DayData>;
  allRecords: Record<string, DayData>;
  currentDate: Date;
  objectives?: Objective[];
  onAddObjective?: (obj: Objective) => void;
  onUpdateObjective?: (obj: Objective) => void;
  onDeleteObjective?: (id: string) => void;
  rolloverSettings: RolloverSettings;
  onUpdateRolloverSettings: (settings: RolloverSettings) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tasks,
  categoryOrder,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateCategoryOrder,
  objectives = [],
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
  allRecords,
  currentDate,
  onExportData,
  onImportData,
  onClearData,
  rolloverSettings,
  onUpdateRolloverSettings
}) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [isDataOverlayOpen, setIsDataOverlayOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [importText, setImportText] = useState('');
  
  // Default to false (folded) as requested
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Hook for inline modals
  useModalBackHandler(isDataOverlayOpen, () => setIsDataOverlayOpen(false));
  useModalBackHandler(isBackupModalOpen, () => setIsBackupModalOpen(false));

  const taskProgress = useMemo(() => {
    const dKey = formatDate(currentDate);
    const todayRecord = allRecords[dKey] || { hours: {} };
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);
    
    HOURS.forEach(h => {
      const ids = todayRecord.hours[h] || [];
      ids.forEach(tid => {
        if (stats[tid] !== undefined) {
          const task = tasks.find(t => t.id === tid);
          if (task?.targets?.mode === 'count') {
            stats[tid] += 1;
          } else {
            stats[tid] += (1 / Math.max(ids.length, 1));
          }
        }
      });
    });
    return stats;
  }, [tasks, allRecords, currentDate]);

  const sortedObjectives = useMemo(() => {
    return [...objectives].sort((a, b) => {
        const idxA = categoryOrder.indexOf(a.id);
        const idxB = categoryOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [objectives, categoryOrder]);

  const uncategorizedTasks = useMemo(() => {
      return tasks.filter(t => !t.category || t.category === 'none' || t.category === 'uncategorized' || !objectives.find(o => o.id === t.category));
  }, [tasks, objectives]);

  const moveObjective = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sortedObjectives.map(o => o.id)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onUpdateCategoryOrder(newOrder);
  };

  const handleImportSubmit = () => {
      if (importText.trim()) {
          onImportData(importText);
          setIsBackupModalOpen(false);
          setImportText('');
      }
  };

  const blockClass = "bg-white px-3 py-2 rounded-lg border border-stone-100 flex items-center justify-between group hover:border-stone-200 transition-all cursor-pointer shadow-sm active:scale-[0.98] relative overflow-hidden min-h-[2.5rem]";
  const titleClass = "font-black text-stone-800 text-[10px] leading-tight whitespace-normal break-words text-left";

  const sectionTitleClass = "text-sm font-black text-stone-900 uppercase tracking-tight leading-none";

  const renderTaskItem = (task: Task) => {
    const currentVal = taskProgress[task.id] || 0;
    const target = task.targets;
    const dailyTarget = target ? (target.value / target.frequency) : 0;
    const progress = dailyTarget > 0 ? Math.min((currentVal / dailyTarget) * 100, 100) : 0;
    const isCompleted = progress >= 100;

    return (
        <div 
            key={task.id} 
            onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} 
            className={cn(blockClass, "bg-white border-stone-100/60")}
        >
            <div 
                className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0"
                style={{ 
                    width: `${progress}%`, 
                    backgroundColor: `${task.color}10`
                }}
            />

            <div className="flex items-center gap-2 relative z-10 flex-1 min-w-0 pr-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm mt-0.5" style={{ backgroundColor: task.color }} />
                <span className={titleClass}>{task.name}</span>
            </div>
            <div className="relative z-10 flex items-center gap-1 shrink-0 ml-1">
                {isCompleted ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <Check size={8} strokeWidth={4} />
                    </div>
                ) : dailyTarget > 0 && (
                    <span className="text-[8px] font-black text-stone-300 tabular-nums">
                        {Math.round(progress)}%
                    </span>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full bg-stone-50 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-3xl mx-auto p-4 space-y-4 pb-32">
        
        {/* 系统规则设置区域 */}
        <section className="space-y-2">
           <div className="px-1">
              <h3 className={sectionTitleClass}>系统规则</h3>
           </div>

           <div className="bg-white rounded-xl border border-stone-100 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg transition-colors", rolloverSettings.enabled ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400")}>
                          <CalendarClock size={16} />
                      </div>
                      <div>
                          <h4 className="font-black text-stone-800 text-xs">待办自动顺延</h4>
                          <p className="text-[9px] font-medium text-stone-400">未完成任务自动移动到下一天</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => onUpdateRolloverSettings({ ...rolloverSettings, enabled: !rolloverSettings.enabled })}
                      className={cn(
                          "w-8 h-5 rounded-full p-0.5 transition-colors duration-300 ease-in-out relative",
                          rolloverSettings.enabled ? "bg-stone-900" : "bg-stone-200"
                      )}
                  >
                      <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300",
                          rolloverSettings.enabled ? "translate-x-3" : "translate-x-0"
                      )} />
                  </button>
              </div>

              {rolloverSettings.enabled && (
                  <div className="pt-3 border-t border-stone-50 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-stone-500">最大顺延天数</span>
                          <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-stone-900">{rolloverSettings.maxDays} 天</span>
                              <input 
                                  type="range" 
                                  min="1" 
                                  max="7" 
                                  step="1"
                                  value={rolloverSettings.maxDays}
                                  onChange={(e) => onUpdateRolloverSettings({ ...rolloverSettings, maxDays: parseInt(e.target.value) })}
                                  className="w-20 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
                              />
                          </div>
                      </div>
                  </div>
              )}
           </div>
        </section>

        {/* 分类管理 (可折叠) */}
        <section className="space-y-2">
           <div 
             className="flex justify-between items-center px-1 cursor-pointer select-none group"
             onClick={() => setIsCategoryManagerOpen(!isCategoryManagerOpen)}
           >
             <div className="flex items-center gap-2">
                <h3 className={sectionTitleClass}>分类管理</h3>
                <ChevronDown size={16} className={cn("text-stone-300 transition-transform duration-300 group-hover:text-stone-500", isCategoryManagerOpen ? "rotate-180" : "")} />
             </div>
             
             <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setEditingObjective(null); 
                  setIsObjModalOpen(true); 
                }} 
                className="px-2 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-sm active:scale-90 flex items-center gap-1"
             >
                <Plus size={12} /> <span className="text-[9px] font-bold">新分类</span>
             </button>
           </div>

           {isCategoryManagerOpen && (
               <div className="space-y-3 animate-in slide-in-from-top-4 fade-in duration-300 origin-top">
                  {/* Categorized Tasks */}
                  {sortedObjectives.map((obj, idx) => {
                    const categoryTasks = tasks.filter(t => t.category === obj.id);
                    return (
                      <div key={obj.id} className="bg-white rounded-xl border border-stone-100 p-4 shadow-sm relative overflow-hidden group/card transition-all hover:shadow-md">
                        {/* Category Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div 
                                className="flex items-center gap-3 cursor-pointer group/title select-none flex-1 min-w-0"
                                onClick={() => { setEditingObjective(obj); setIsObjModalOpen(true); }}
                            >
                                <div className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover/title:scale-110" style={{ backgroundColor: obj.color + '20' }}>
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: obj.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-stone-800 text-xs leading-none flex items-center gap-2 flex-wrap">
                                        {obj.title}
                                        <Edit2 size={8} className="text-stone-300 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                    </h4>
                                    {obj.description && (
                                        <p className="text-[9px] font-medium text-stone-400 mt-1 truncate">
                                            {obj.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button onClick={() => moveObjective(idx, 'up')} className="p-1.5 text-stone-300 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition-colors active:scale-95" disabled={idx === 0}><ArrowUp size={14} /></button>
                                <button onClick={() => moveObjective(idx, 'down')} className="p-1.5 text-stone-300 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition-colors active:scale-95" disabled={idx === sortedObjectives.length - 1}><ArrowDown size={14} /></button>
                            </div>
                        </div>

                        {/* Tasks Grid - Responsive Columns */}
                        <div className="grid grid-cols-2 gap-2">
                            {categoryTasks.map(task => renderTaskItem(task))}
                            
                            {/* Add Task Button for this Category */}
                            <button 
                                onClick={() => { 
                                    setEditingTask({ id: '', name: '', color: obj.color, category: obj.id, targets: undefined } as Task); 
                                    setIsTaskModalOpen(true); 
                                }} 
                                className="h-10 rounded-lg border border-dashed border-stone-100 flex items-center justify-center gap-1 text-stone-300 hover:border-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-all active:scale-[0.98]"
                            >
                                <Plus size={12} /> <span className="text-[9px] font-bold">添加行为</span>
                            </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Uncategorized Tasks */}
                  {uncategorizedTasks.length > 0 && (
                      <div className="bg-stone-50/50 rounded-xl border border-stone-100 p-4 relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-3">
                                <Layers size={14} className="text-stone-400" />
                                <h4 className="font-black text-stone-400 text-xs leading-none">未分类行为</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {uncategorizedTasks.map(task => renderTaskItem(task))}
                          </div>
                      </div>
                  )}
               </div>
           )}
        </section>

        {/* 数据安全与维护区域 */}
        <section className="space-y-2">
           <div className="px-1">
              <h3 className={sectionTitleClass}>数据安全</h3>
           </div>
           
           <div className="bg-white rounded-xl border border-stone-100 p-4 shadow-sm flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 w-full">
                  <div className="p-3 bg-stone-50 text-stone-900 rounded-xl shadow-inner border border-stone-100 shrink-0">
                      <Database size={18} />
                  </div>
                  <div className="flex-1">
                      <h4 className="font-black text-stone-900 text-xs tracking-tight leading-tight">本地存储</h4>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                          所有数据均保存在本地
                      </p>
                  </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsBackupModalOpen(true); }}
                    className="w-full py-3 px-3 bg-stone-50 border border-stone-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-stone-800 hover:bg-stone-100 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                  >
                    <FileJson size={14} /> 备份恢复
                  </button>
                  <button 
                      onClick={() => setIsDataOverlayOpen(true)}
                      className="w-full py-3 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-stone-800"
                  >
                      清空记录
                  </button>
              </div>
           </div>
        </section>
      </div>

      {/* 备份与恢复弹窗 */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[1.5rem] w-full max-w-sm overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[80vh]">
                 <div className="px-6 py-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <FileJson size={16} className="text-stone-900" />
                        <h3 className="font-black text-stone-900 text-[13px]">数据备份</h3>
                    </div>
                    <button onClick={() => { setIsBackupModalOpen(false); setImportText(''); }} className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">导出数据</label>
                        <button 
                            onClick={() => { onExportData(); }}
                            className="w-full py-3.5 bg-stone-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Copy size={14} /> 复制到剪切板
                        </button>
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-stone-100"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-stone-300 font-bold uppercase text-[10px]">恢复数据</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">粘贴备份数据</label>
                        <textarea 
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder='请将备份的JSON文本粘贴到此处...'
                            className="w-full h-24 p-3 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-stone-600 focus:outline-none focus:border-stone-400 resize-none"
                        />
                        <button 
                            onClick={handleImportSubmit}
                            disabled={!importText.trim()}
                            className="w-full py-3.5 bg-white border-2 border-stone-100 text-stone-600 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ClipboardPaste size={14} /> 恢复数据
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 清空数据警告弹窗 */}
      {isDataOverlayOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[1.5rem] w-full max-w-sm overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database size={16} className="text-stone-900" />
                        <h3 className="font-black text-stone-900 text-[13px]">数据清除</h3>
                    </div>
                    <button onClick={() => { setIsDataOverlayOpen(false); setShowClearConfirm(false); }} className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="pt-2">
                        <button 
                            onClick={() => {
                                if (showClearConfirm) {
                                    onClearData();
                                    setIsDataOverlayOpen(false);
                                    setShowClearConfirm(false);
                                } else {
                                    setShowClearConfirm(true);
                                }
                            }}
                            className={cn(
                                "w-full py-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider",
                                showClearConfirm 
                                    ? "bg-rose-600 text-white shadow-xl scale-105" 
                                    : "bg-white border-2 border-rose-50 text-rose-500 hover:bg-rose-50"
                            )}
                        >
                            {showClearConfirm ? (
                                <><AlertCircle size={16} strokeWidth={3} /> 确认清除记录？</>
                            ) : (
                                <><Trash2 size={16} /> 清除所有记录</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
                    <p className="text-[9px] text-stone-400 font-bold leading-relaxed text-center uppercase tracking-[0.1em]">
                        警告：此操作将清空所有历史数据<br/>但会保留您的任务模板与分类设置
                    </p>
                </div>
            </div>
        </div>
      )}

      <ObjectiveEditorModal isOpen={isObjModalOpen} onClose={() => setIsObjModalOpen(false)} objective={editingObjective} onSave={(obj) => obj.id ? onUpdateObjective?.(obj) : onAddObjective?.(obj)} onDelete={onDeleteObjective} />
      <TaskEditorModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        task={editingTask} 
        onSave={(t) => t.id ? onUpdateTask(t) : onAddTask(t)} 
        onDelete={onDeleteTask} 
        objectives={objectives} 
        simplified={false}
      />
    </div>
  );
};
