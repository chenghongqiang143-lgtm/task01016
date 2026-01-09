
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, ListTodo, LayoutGrid, ClipboardCheck, Settings, BarChart2, CalendarDays, RotateCcw, Loader2, Star, TrendingUp, Hexagon, Plus, Calendar, Menu, X, List, CalendarRange, Columns } from 'lucide-react';
import { format, addDays, subDays, differenceInCalendarDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData, Objective, Todo, RatingItem, ShopItem, DayRating, ViewMode } from './types';
import { loadState, saveState, getInitialState } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { TrackerView } from './views/TrackerView';
import { TodoView } from './views/TodoView';
import { SettingsTab } from './views/SettingsTab';
import { StatsView } from './views/StatsView';
import { RatingView } from './views/RatingView';
import { TaskStatsModal } from './components/TaskStatsModal';
import { RatingStatsModal } from './components/RatingStatsModal';
import { TodoEditorModal } from './components/TodoEditorModal';

// 最小加载时间 (ms)，防止闪屏
const MIN_LOADING_TIME = 800;
// 加载超时时间 (ms)，防止卡死
const LOADING_TIMEOUT = 5000;

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '99 102 241';
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('arrange');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // 视图状态提升到 App
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 控制侧边栏抽屉
  const [isTaskStatsOpen, setIsTaskStatsOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false); // 时间轴统计弹窗
  const [isRatingStatsOpen, setIsRatingStatsOpen] = useState(false); // 打分趋势弹窗
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTaskPoolOpen, setIsTaskPoolOpen] = useState(false); 
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AppState | null>(null);

  // 初始化加载数据
  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const init = async () => {
      try {
        // 创建数据加载Promise
        const dataPromise = new Promise<AppState>((resolve) => {
            const loaded = loadState();
            // 处理待办顺延逻辑
            if (loaded.rolloverSettings?.enabled) {
              const today = new Date();
              const todayStr = formatDate(today);
              let hasChanges = false;
              const updatedTodos = loaded.todos.map(todo => {
                if (!todo.isCompleted && todo.startDate && todo.startDate < todayStr) {
                  const startDate = new Date(todo.startDate);
                  const diffDays = differenceInCalendarDays(today, startDate);
                  if (diffDays <= (loaded.rolloverSettings?.maxDays || 3)) {
                    hasChanges = true;
                    return { ...todo, startDate: todayStr };
                  }
                }
                return todo;
              });
              if (hasChanges) loaded.todos = updatedTodos;
            }
            resolve(loaded);
        });

        // 创建最小等待时间Promise
        const minWaitPromise = new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME));

        // 创建超时Promise
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOADING_TIMEOUT));

        // 竞速：数据加载 vs 超时，同时等待最小时间
        // 这里我们要等待 (数据加载完成) 和 (最小时间) 都满足，或者 (超时) 发生
        const [loadedData] = await Promise.all([
           Promise.race([dataPromise, timeoutPromise]),
           minWaitPromise
        ]);

        if (isMounted) {
            if (loadedData) {
                setState(loadedData);
            } else {
                console.warn("Loading timed out or failed, using initial state");
                setState(getInitialState());
            }
            setIsLoaded(true);
            // 移除 index.html 中的骨架屏（如果存在）
            const shell = document.getElementById('initial-loader');
            if (shell) {
                shell.style.opacity = '0';
                setTimeout(() => shell.remove(), 400);
            }
        }
      } catch (err) {
        console.error("Initial load error:", err);
        if (isMounted) {
            setState(getInitialState());
            setIsLoaded(true);
        }
      }
    };

    init();
    
    return () => { isMounted = false; };
  }, []);

  // 状态保存持久化
  useEffect(() => { 
    if (state && isLoaded) {
      saveState(state);
    }
  }, [state, isLoaded]);

  // Apply Theme Color
  useEffect(() => {
    if (state?.themeColor) {
      document.documentElement.style.setProperty('--color-primary', hexToRgb(state.themeColor));
    }
  }, [state?.themeColor]);

  const dateKey = formatDate(currentDate);
  const isToday = isSameDay(currentDate, new Date());

  // 计算当前日程数据
  const currentSchedule: DayData = useMemo(() => {
      if (!state) return { hours: {} };
      const specificDayData = state.schedule[dateKey] || { hours: {} };
      const recurringData = state.recurringSchedule || {};
      const mergedHours: Record<number, string[]> = { ...specificDayData.hours };
      Object.keys(recurringData).forEach(k => {
          const hour = parseInt(k);
          const recTasks = recurringData[hour] || [];
          const existing = mergedHours[hour] || [];
          mergedHours[hour] = Array.from(new Set([...existing, ...recTasks]));
      });
      return { hours: mergedHours };
  }, [state?.schedule, state?.recurringSchedule, dateKey]);

  // 获取当前记录数据
  const currentRecord: DayData = useMemo(() => {
    return (state?.records && state.records[dateKey]) || { hours: {} };
  }, [state?.records, dateKey]);

  if (!state || !isLoaded) {
    // 即使有 index.html 的骨架屏，React 挂载后也保持一个加载状态作为双重保障
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-50 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">LOADING</span>
      </div>
    );
  }

  // --- 数据管理逻辑 ---
  
  // 导出数据：复制到剪切板
  const handleExportData = () => {
    if (!state) return;
    const dataStr = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
        alert('备份数据已复制到剪切板！');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('复制失败，请重试');
    });
  };

  // 导入数据：从字符串解析
  const handleImportData = (dataStr: string) => {
      try {
        const imported = JSON.parse(dataStr);
        if (imported.tasks && imported.objectives) {
          setState(imported);
          alert('数据恢复成功！');
        } else {
          alert('恢复失败：数据格式不正确');
        }
      } catch (err) {
        alert('恢复失败：无法解析数据');
      }
  };
  
  // 清空记录（保留模板）
  const handleClearRecords = () => {
      setState(prev => {
          if (!prev) return getInitialState();
          return {
              ...prev,
              todos: [], // 清空待办实例
              schedule: {}, // 清空日程安排
              records: {}, // 清空实际记录
              ratings: {}, // 清空评分
              redemptions: [], // 清空兑换记录
              // 保留：tasks(行为库), objectives(分类), categoryOrder, recurringSchedule(循环模板), ratingItems, shopItems, rolloverSettings, themeColor
              themeColor: prev.themeColor
          };
      });
      alert('所有历史记录已清空，模板与设置已保留。');
  };

  // --- 状态操作处理函数 ---
  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => prev ? ({ ...prev, records: { ...prev.records, [dateKey]: { hours: { ...(prev.records[dateKey] || {hours:{}}).hours, [hour]: taskIds } } } }) : null);
  };
  const updateScheduleHour = (hour: number, taskIds: string[]) => {
    setState(prev => prev ? ({ ...prev, schedule: { ...prev.schedule, [dateKey]: { hours: { ...prev.schedule[dateKey]?.hours, [hour]: taskIds } } } }) : null);
  };
  const updateRecurringHour = (hour: number, taskIds: string[]) => {
    setState(prev => prev ? ({ ...prev, recurringSchedule: { ...prev.recurringSchedule, [hour]: taskIds } }) : null);
  };
  const handleUpdateTask = (updatedTask: Task) => {
    setState(prev => prev ? ({ ...prev, tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) }) : null);
  };
  const handleAddTask = (newTaskPart: Omit<Task, 'id'>) => {
    const newTask = { ...newTaskPart, id: generateId() };
    setState(prev => prev ? ({ ...prev, tasks: [...prev.tasks, newTask] }) : null);
  };
  const handleDeleteTask = (taskId: string) => {
    setState(prev => prev ? ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }) : null);
  };
  const handleUpdateRating = (key: string, rating: DayRating) => {
    setState(prev => prev ? ({ ...prev, ratings: { ...prev.ratings, [key]: rating } }) : null);
  };
  const handleRedeem = (item: ShopItem) => {
    const redemption = { id: generateId(), shopItemId: item.id, itemName: item.name, cost: item.cost, date: formatDate(new Date()) };
    setState(prev => prev ? ({ ...prev, redemptions: [...prev.redemptions, redemption] }) : null);
  };

  // --- 分类管理逻辑 (新增) ---
  const handleAddObjective = (obj: Objective) => {
    // 确保有 ID
    const newObj = { ...obj, id: obj.id || generateId() };
    setState(prev => prev ? ({ 
      ...prev, 
      objectives: [...prev.objectives, newObj], 
      categoryOrder: [...prev.categoryOrder, newObj.id] 
    }) : null);
  };
  const handleUpdateObjective = (obj: Objective) => {
    setState(prev => prev ? ({ ...prev, objectives: prev.objectives.map(o => o.id === obj.id ? obj : o) }) : null);
  };
  const handleDeleteObjective = (id: string) => {
    setState(prev => prev ? ({ 
      ...prev, 
      objectives: prev.objectives.filter(o => o.id !== id),
      categoryOrder: prev.categoryOrder.filter(cid => cid !== id),
      tasks: prev.tasks.map(t => t.category === id ? { ...t, category: 'uncategorized' } : t)
    }) : null);
  };

  const handleSidebarAction = (action: () => void) => {
    action();
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen w-screen bg-stone-50 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-md sm:h-[90vh] bg-white sm:rounded-3xl flex flex-col relative border border-stone-200 shadow-2xl overflow-hidden">
        
        {/* 页眉导航 */}
        <header className="bg-white/90 backdrop-blur-md z-[60] shrink-0 border-b border-stone-100 pt-[env(safe-area-inset-top)] transition-all relative">
          <div className="h-14 px-4 flex items-center justify-between">
              {/* Left: Sidebar Trigger */}
              <div className="w-20 flex justify-start items-center">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-xl transition-all active:scale-95"
                  >
                     <Menu size={20} />
                  </button>
              </div>
              
              {/* Center: Date Navigation */}
              <div className="flex-1 flex items-center justify-center gap-1">
                  <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1.5 text-stone-300 hover:text-stone-800 transition-all active:scale-90"><ChevronLeft size={18} /></button>
                  
                  <button onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()} className="flex items-baseline gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-all active:scale-95">
                      <span className="font-black text-sm text-stone-800 whitespace-nowrap leading-none">{format(currentDate, 'M月d日', { locale: zhCN })}</span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{format(currentDate, 'EEE', { locale: zhCN })}</span>
                      <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))} />
                  </button>

                  <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 text-stone-300 hover:text-stone-800 transition-all active:scale-90"><ChevronRight size={18} /></button>
              </div>
              
              {/* Right: Back to Today & Status */}
              <div className="w-20 flex justify-end items-center gap-2">
                  {!isToday ? (
                     <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded-xl transition-all active:scale-95 text-[10px] font-bold flex flex-col items-center leading-none gap-0.5"
                        title="回到今天"
                     >
                        <RotateCcw size={16} />
                     </button>
                  ) : editingStatus ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary text-white rounded-md shadow-sm border border-primary/20 animate-in fade-in">
                        <span className="text-[9px] font-black whitespace-nowrap uppercase leading-none">{editingStatus}</span>
                      </div>
                  ) : null}
              </div>
          </div>
        </header>

        {/* 内容主体 */}
        <main className="flex-1 overflow-hidden relative bg-white">
          {activeTab === 'arrange' && (
              <TodoView 
              todos={state.todos} objectives={state.objectives} tasks={state.tasks}
              categoryOrder={state.categoryOrder}
              onAddTodo={(todo) => setState(prev => prev ? ({ ...prev, todos: [todo, ...prev.todos] }) : null)}
              onUpdateTodo={(todo) => setState(prev => prev ? ({ ...prev, todos: prev.todos.map(t => t.id === todo.id ? todo : t) }) : null)}
              onDeleteTodo={(id) => setState(prev => prev ? ({ ...prev, todos: prev.todos.filter(t => t.id !== id) }) : null)}
              onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
              isTaskPoolOpen={isTaskPoolOpen} setIsTaskPoolOpen={setIsTaskPoolOpen}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onUpdateObjective={handleUpdateObjective}
              onDeleteObjective={handleDeleteObjective}
              viewMode={viewMode} // Pass lifted state
              />
          )}

          {activeTab === 'record' && (
              <TrackerView 
                  tasks={state.tasks} objectives={state.objectives} categoryOrder={state.categoryOrder} 
                  scheduleData={currentSchedule} recordData={currentRecord} 
                  recurringSchedule={state.recurringSchedule} allRecords={state.records} 
                  onUpdateRecord={updateRecordHour} onUpdateSchedule={updateScheduleHour} onUpdateRecurring={updateRecurringHour}
                  onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} 
                  onAddTodo={(todo) => setState(prev => prev ? ({ ...prev, todos: [todo, ...prev.todos] }) : null)}
                  currentDate={currentDate} onEditingStatusChange={setEditingStatus}
              />
          )}

          {activeTab === 'rating' && (
              <RatingView 
                  currentDate={currentDate} ratings={state.ratings} ratingItems={state.ratingItems} shopItems={state.shopItems} redemptions={state.redemptions}
                  onUpdateRating={handleUpdateRating} 
                  onUpdateRatingItems={(items) => setState(prev => prev ? ({ ...prev, ratingItems: items }) : null)}
                  onUpdateShopItems={(items) => setState(prev => prev ? ({ ...prev, shopItems: items }) : null)}
                  onRedeem={handleRedeem}
              />
          )}

          {activeTab === 'settings' && (
              <SettingsTab 
                  tasks={state.tasks} categoryOrder={state.categoryOrder} objectives={state.objectives}
                  onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} 
                  onUpdateCategoryOrder={(order) => setState(prev => prev ? ({ ...prev, categoryOrder: order }) : null)}
                  allSchedules={state.schedule} allRecords={state.records} currentDate={currentDate} 
                  rolloverSettings={state.rolloverSettings} onUpdateRolloverSettings={(s) => setState(prev => prev ? ({ ...prev, rolloverSettings: s }) : null)}
                  onExportData={handleExportData} onImportData={handleImportData} onClearData={handleClearRecords} showInstallButton={false} onInstall={() => {}}
                  onAddObjective={handleAddObjective} onUpdateObjective={handleUpdateObjective} onDeleteObjective={handleDeleteObjective}
                  themeColor={state.themeColor} onUpdateThemeColor={(c) => setState(prev => prev ? ({ ...prev, themeColor: c }) : null)}
              />
          )}

          {/* Floating Action Button (Add Task) - Bottom Right */}
          {activeTab === 'arrange' && (
              <button 
                  className="absolute bottom-6 right-6 z-[80] p-3.5 bg-primary text-white rounded-full shadow-xl shadow-primary/30 active:scale-90 transition-all animate-in zoom-in duration-200 flex items-center justify-center hover:opacity-90"
                  onClick={() => setIsTodoModalOpen(true)}
                  title="新建任务"
              >
                  <Plus size={24} />
              </button>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="h-16 bg-white border-t border-stone-100 flex items-start justify-center px-6 shrink-0 pb-safe z-50">
            <div className="w-full h-full flex items-center justify-between gap-2">
                <NavButton label="安排" active={activeTab === 'arrange'} onClick={() => setActiveTab('arrange')} icon={<ListTodo size={20} />} />
                <NavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<ClipboardCheck size={20} />} />
                <NavButton label="打分" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Star size={20} />} />
                <NavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} />
            </div>
        </nav>

        {/* Sidebar Drawer Overlay */}
        <div className={cn(
            "absolute inset-0 z-[100] transition-all duration-300 pointer-events-none",
            isSidebarOpen ? "bg-stone-900/40 backdrop-blur-sm pointer-events-auto" : "bg-transparent"
        )} onClick={() => setIsSidebarOpen(false)}>
            <div 
                className={cn(
                    "absolute top-0 bottom-0 left-0 w-64 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col pointer-events-auto",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
                             <Hexagon size={16} strokeWidth={2.5} />
                         </div>
                         <div>
                             <h2 className="font-black text-sm text-stone-900 leading-tight">ChronosFlow</h2>
                             <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">时间管理助手</p>
                         </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-stone-400 hover:text-stone-800"><X size={20} /></button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                    {activeTab === 'arrange' && (
                        <div className="space-y-2">
                            <div className="px-2">
                                <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest">视图切换</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1 rounded-xl">
                                {(['list', 'week', 'month'] as ViewMode[]).map(m => (
                                    <button 
                                        key={m}
                                        onClick={() => handleSidebarAction(() => setViewMode(m))}
                                        className={cn(
                                            "flex flex-col items-center justify-center py-2 rounded-lg transition-all",
                                            viewMode === m ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600"
                                        )}
                                    >
                                        {m === 'list' && <List size={16} />}
                                        {m === 'week' && <CalendarRange size={16} />}
                                        {m === 'month' && <CalendarDays size={16} />}
                                        <span className="text-[9px] font-bold mt-1">{m === 'list' ? '列表' : (m === 'week' ? '周' : '月')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="px-2">
                            <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest">快捷功能</span>
                        </div>

                        {(activeTab === 'arrange' || activeTab === 'record') && (
                            <SidebarButton 
                                icon={<LayoutGrid size={18} />} 
                                label={isTaskPoolOpen ? "关闭任务库" : "打开任务库"} 
                                active={isTaskPoolOpen}
                                onClick={() => handleSidebarAction(() => setIsTaskPoolOpen(!isTaskPoolOpen))} 
                            />
                        )}

                        {activeTab === 'arrange' && (
                            <SidebarButton icon={<CalendarDays size={18} />} label="任务统计" onClick={() => handleSidebarAction(() => setIsTaskStatsOpen(true))} />
                        )}
                        
                        {activeTab === 'record' && (
                            <SidebarButton icon={<BarChart2 size={18} />} label="时间统计" onClick={() => handleSidebarAction(() => setIsStatsModalOpen(true))} />
                        )}

                        {activeTab === 'rating' && (
                            <SidebarButton icon={<TrendingUp size={18} />} label="评分趋势" onClick={() => handleSidebarAction(() => setIsRatingStatsOpen(true))} />
                        )}
                    </div>
                </div>
                
                <div className="p-4 border-t border-stone-100 bg-stone-50/30">
                    <p className="text-[10px] text-stone-400 text-center font-medium">v1.0.3</p>
                </div>
            </div>
        </div>

        {/* Global Modals */}
        {isTaskStatsOpen && (
          <TaskStatsModal isOpen={true} onClose={() => setIsTaskStatsOpen(false)} todos={state.todos} objectives={state.objectives} currentDate={currentDate} />
        )}

        {isStatsModalOpen && (
          <StatsView 
            tasks={state.tasks} scheduleData={currentSchedule} recordData={currentRecord}
            allSchedules={state.schedule} recurringSchedule={state.recurringSchedule} allRecords={state.records}
            dateObj={currentDate} isOpen={true} isModal={true} onClose={() => setIsStatsModalOpen(false)}
          />
        )}

        {isRatingStatsOpen && (
          <RatingStatsModal 
            isOpen={true} 
            onClose={() => setIsRatingStatsOpen(false)} 
            ratings={state.ratings} 
            ratingItems={state.ratingItems} 
            currentDate={currentDate} 
          />
        )}

        {/* Add Task Modal */}
        <TodoEditorModal 
          isOpen={isTodoModalOpen} 
          onClose={() => setIsTodoModalOpen(false)} 
          todo={null} 
          objectives={state.objectives} 
          onSave={(todo) => {
            if (state) setState({ ...state, todos: [todo, ...state.todos] });
          }} 
          frogCount={state.todos.filter(t => t.isFrog && !t.isCompleted).length} 
          defaultDate={currentDate}
        />
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center justify-center flex-1 h-full rounded-2xl transition-all duration-200 gap-1", active ? "text-primary" : "text-stone-300 hover:text-stone-500")}>
    <div className={cn("transition-transform duration-200", active ? "-translate-y-1" : "")}>{icon}</div>
    {active && <span className="text-[9px] font-black tracking-widest uppercase leading-none animate-in fade-in slide-in-from-bottom-2">{label}</span>}
  </button>
);

const SidebarButton = ({ icon, label, onClick, active, className }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean, className?: string }) => (
    <button 
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]",
            active ? "bg-primary text-white shadow-md" : "hover:bg-stone-100 text-stone-600",
            className
        )}
    >
        {icon}
        <span className="text-xs font-bold">{label}</span>
    </button>
);
