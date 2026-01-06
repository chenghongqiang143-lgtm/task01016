
import React, { useState, useMemo, useRef } from 'react';
import { Task, DayData, Objective, HOURS, RolloverSettings } from '../types';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { Plus, ArrowUp, ArrowDown, Edit2, Check, Download, Upload, Trash2, Database, X, AlertCircle, CalendarClock, Target } from 'lucide-react';
import { cn, formatDate } from '../utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
  onImportData: (file: File) => void;
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const moveObjective = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sortedObjectives.map(o => o.id)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onUpdateCategoryOrder(newOrder);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
      setIsDataOverlayOpen(false);
    }
  };

  const blockClass = "bg-white h-12 px-4 rounded-xl border border-stone-100 flex items-center justify-between group hover:border-stone-200 transition-all cursor-pointer shadow-sm active:scale-[0.98] relative overflow-hidden";
  const titleClass = "font-black text-stone-800 text-[11px] truncate leading-none";

  // Section title class updated for larger size (text-lg)
  const sectionTitleClass = "text-lg font-black text-stone-900 uppercase tracking-tight leading-none";

  return (
    <div className="h-full bg-stone-50 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-3xl mx-auto p-6 sm:p-8 space-y-8 pb-32">
        
        {/* 系统规则设置区域 */}
        <section className="space-y-4">
           <div className="px-1">
              <h3 className={sectionTitleClass}>系统规则</h3>
           </div>

           <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={cn("p-2.5 rounded-xl transition-colors", rolloverSettings.enabled ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400")}>
                          <CalendarClock size={20} />
                      </div>
                      <div>
                          <h4 className="font-black text-stone-800 text-[14px]">待办自动顺延</h4>
                          <p className="text-[10px] font-medium text-stone-400">未完成任务自动移动到下一天</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => onUpdateRolloverSettings({ ...rolloverSettings, enabled: !rolloverSettings.enabled })}
                      className={cn(
                          "w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out relative",
                          rolloverSettings.enabled ? "bg-stone-900" : "bg-stone-200"
                      )}
                  >
                      <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300",
                          rolloverSettings.enabled ? "translate-x-4" : "translate-x-0"
                      )} />
                  </button>
              </div>

              {rolloverSettings.enabled && (
                  <div className="pt-4 border-t border-stone-50 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-bold text-stone-500">最大顺延天数</span>
                          <div className="flex items-center gap-3">
                              <span className="text-[11px] font-black text-stone-900">{rolloverSettings.maxDays} 天</span>
                              <input 
                                  type="range" 
                                  min="1" 
                                  max="7" 
                                  step="1"
                                  value={rolloverSettings.maxDays}
                                  onChange={(e) => onUpdateRolloverSettings({ ...rolloverSettings, maxDays: parseInt(e.target.value) })}
                                  className="w-24 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
                              />
                          </div>
                      </div>
                  </div>
              )}
           </div>
        </section>

        {/* 领域分类管理 */}
        <section className="space-y-4">
           <div className="flex justify-between items-end px-1">
             <h3 className={sectionTitleClass}>分类编辑</h3>
             <button onClick={() => { setEditingObjective(null); setIsObjModalOpen(true); }} className="p-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg active:scale-90">
                <Plus size={16} />
             </button>
           </div>

           <div className="grid grid-cols-2 gap-3">
              {sortedObjectives.map((obj, idx) => (
                <div 
                    key={obj.id} 
                    className={cn(blockClass, "hover:bg-stone-50")}
                    onClick={() => { setEditingObjective(obj); setIsObjModalOpen(true); }}
                >
                   <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                      <div className="w-2 h-2 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: obj.color }} />
                      <div className="flex flex-col min-w-0">
                         <h4 className={titleClass}>{obj.title}</h4>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all relative z-10 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); moveObjective(idx, 'up'); }} className="p-1.5 text-stone-300 hover:text-stone-900 transition-colors">
                        <ArrowUp size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveObjective(idx, 'down'); }} className="p-1.5 text-stone-300 hover:text-stone-900 transition-colors">
                        <ArrowDown size={12} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* 行为模板管理 */}
        <section className="space-y-4">
           <div className="flex justify-between items-end px-1">
             <h3 className={sectionTitleClass}>行为模板管理</h3>
             <button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }} className="p-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg active:scale-90">
                <Plus size={16} />
             </button>
           </div>

           <div className="space-y-4">
              {sortedObjectives.map(obj => {
                const filteredTasks = tasks.filter(t => t.category === obj.id);
                if (filteredTasks.length === 0) return null;
                return (
                  <div key={obj.id} className="space-y-2.5">
                    <div className="flex items-center gap-3 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{obj.title}</span>
                        <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {filteredTasks.map(task => {
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

                                    <div className="flex items-center gap-2 truncate relative z-10 flex-1 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: task.color }} />
                                        <span className={titleClass}>{task.name}</span>
                                    </div>
                                    <div className="relative z-10 flex items-center gap-1 shrink-0 ml-1">
                                        {isCompleted ? (
                                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        ) : dailyTarget > 0 && (
                                            <span className="text-[8px] font-black text-stone-300 tabular-nums">
                                                {Math.round(progress)}%
                                            </span>
                                        )}
                                        <Edit2 size={10} className="text-stone-300 group-hover:text-stone-900 transition-colors ml-0.5" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                );
              })}
           </div>
        </section>

        {/* 数据安全与维护区域 - Optimized layout and typography */}
        <section className="space-y-4">
           <div className="px-1">
              <h3 className={sectionTitleClass}>数据安全与维护</h3>
           </div>
           
           <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm flex flex-col items-center gap-6">
              <div className="flex items-center gap-5 w-full">
                  <div className="p-4 bg-stone-50 text-stone-900 rounded-2xl shadow-inner border border-stone-100 shrink-0">
                      <Database size={24} />
                  </div>
                  <div className="flex-1">
                      <h4 className="font-black text-stone-900 text-base tracking-tight leading-tight">本地存储管理</h4>
                      <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.1em] mt-1">
                          您的所有记录均保存在此浏览器中
                      </p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={onExportData}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white border border-stone-100 rounded-2xl text-[12px] font-black uppercase tracking-wider text-stone-700 hover:bg-stone-50 transition-all shadow-sm active:scale-95"
                  >
                    <Download size={16} /> 导出备份
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white border border-stone-100 rounded-2xl text-[12px] font-black uppercase tracking-wider text-stone-700 hover:bg-stone-50 transition-all shadow-sm active:scale-95"
                  >
                    <Upload size={16} /> 导入恢复
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                  </button>
              </div>

              <button 
                  onClick={() => setIsDataOverlayOpen(true)}
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-stone-800"
              >
                  进入管理模式
              </button>
           </div>
        </section>
      </div>

      {isDataOverlayOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Database size={18} className="text-stone-900" />
                        <h3 className="font-black text-stone-900 text-[14px]">数据清除</h3>
                    </div>
                    <button onClick={() => { setIsDataOverlayOpen(false); setShowClearConfirm(false); }} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="pt-2">
                        <button 
                            onClick={() => {
                                if (showClearConfirm) {
                                    onClearData();
                                } else {
                                    setShowClearConfirm(true);
                                }
                            }}
                            className={cn(
                                "w-full py-5 rounded-2xl font-black text-[13px] transition-all flex items-center justify-center gap-2 uppercase tracking-wider",
                                showClearConfirm 
                                    ? "bg-rose-600 text-white shadow-xl scale-105" 
                                    : "bg-white border-2 border-rose-50 text-rose-500 hover:bg-rose-50"
                            )}
                        >
                            {showClearConfirm ? (
                                <><AlertCircle size={18} strokeWidth={3} /> 确认彻底清空？</>
                            ) : (
                                <><Trash2 size={18} /> 清空本地所有数据</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
                    <p className="text-[9px] text-stone-400 font-bold leading-relaxed text-center uppercase tracking-[0.2em]">
                        警告：此操作不可撤销
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
