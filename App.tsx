
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, ClipboardCheck, Settings, BarChart2, CalendarDays, RotateCcw, Loader2, Star, TrendingUp, Hexagon, Plus, Calendar, Menu, X, List, CalendarRange, Columns, ShoppingBag, PieChart, Activity, CalendarCheck2, Trophy, Timer, Settings2 } from 'lucide-react';
import { format, addDays, subDays, differenceInCalendarDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData, Objective, Todo, RatingItem, ShopItem, DayRating, ViewMode, ReviewTemplate, TimeBlock } from './types';
import { loadState, saveState, getInitialState } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { TrackerView } from './views/TrackerView';
import { TodoView } from './views/TodoView';
import { SettingsTab } from './views/SettingsTab';
import { StatsView } from './views/StatsView';
import { RatingView } from './views/RatingView';
import { TaskStatsModal } from './components/TaskStatsModal';
import { RatingStatsModal } from './components/RatingStatsModal';

// 最小加载时间 (ms)，防止闪屏
const MIN_LOADING_TIME = 800;
// 加载超时时间 (ms)，防止卡死
const LOADING_TIMEOUT = 5000;

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '39 39 42'; // Zinc 800
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('arrange');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // 视图状态提升到 App
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 控制侧边栏抽屉
  const [isTaskStatsOpen, setIsTaskStatsOpen] = useState(false);
  const [isTimeStatsOpen, setIsTimeStatsOpen] = useState(false); // Global stats modal
  const [isRatingStatsOpen, setIsRatingStatsOpen] = useState(false); // Rating stats modal
  
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTaskPoolOpen, setIsTaskPoolOpen] = useState(false); 
  const [isShopOpen, setIsShopOpen] = useState(false);
  
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

  // 计算当前日程数据 (Legacy hours support)
  const currentSchedule: DayData = useMemo(() => {
      if (!state) return { hours: {} };
      const specificDayData = state.schedule[dateKey] || { hours: {} };
      return specificDayData;
  }, [state?.schedule, dateKey]);

  const currentScheduleBlocks: TimeBlock[] = useMemo(() => {
      return (state?.scheduleBlocks && state.scheduleBlocks[dateKey]) || [];
  }, [state?.scheduleBlocks, dateKey]);

  // 获取当前记录数据 (兼容旧版hour bucket)
  const currentRecord: DayData = useMemo(() => {
    return (state?.records && state.records[dateKey]) || { hours: {} };
  }, [state?.records, dateKey]);

  // 获取当前记录数据 (新版 TimeBlock)
  const currentRecordBlocks: TimeBlock[] = useMemo(() => {
      return (state?.recordBlocks && state.recordBlocks[dateKey]) || [];
  }, [state?.recordBlocks, dateKey]);

  if (!state || !isLoaded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-50 space-y-4">
        <Loader2 className="w-8 h-8 text-stone-800 animate-spin" />
        <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">SYSTEM LOADING</span>
      </div>
    );
  }

  // --- 数据管理逻辑 ---
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
  
  const handleClearRecords = () => {
      setState(prev => {
          if (!prev) return getInitialState();
          return {
              ...prev,
              todos: [],
              schedule: {},
              scheduleBlocks: {},
              records: {},
              recordBlocks: {},
              ratings: {},
              redemptions: [],
              themeColor: prev.themeColor,
              reviewTemplates: prev.reviewTemplates
          };
      });
      alert('所有历史记录已清空，模板与设置已保留。');
  };

  const syncBlocksToRecords = (dateKey: string, blocks: TimeBlock[], prevState: AppState, type: 'record' | 'schedule') => {
      const newHourRecords: Record<number, string[]> = {};
      
      blocks.forEach(block => {
          const startHour = Math.floor(block.startTime / 60);
          const endHour = Math.floor(block.endTime / 60);
          for (let h = startHour; h <= endHour; h++) {
             if (h === endHour && block.endTime % 60 === 0 && block.endTime !== block.startTime) {
                 continue;
             }
             if (h >= 0 && h < 24) {
                 if (!newHourRecords[h]) newHourRecords[h] = [];
                 if (!newHourRecords[h].includes(block.taskId)) {
                     newHourRecords[h].push(block.taskId);
                 }
             }
          }
      });
      
      if (type === 'record') {
          return {
              ...prevState,
              recordBlocks: { ...prevState.recordBlocks, [dateKey]: blocks },
              records: { ...prevState.records, [dateKey]: { hours: newHourRecords } }
          };
      } else {
          return {
              ...prevState,
              scheduleBlocks: { ...prevState.scheduleBlocks, [dateKey]: blocks },
              schedule: { ...prevState.schedule, [dateKey]: { hours: newHourRecords } }
          };
      }
  };

  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => prev ? ({ ...prev, records: { ...prev.records, [dateKey]: { hours: { ...(prev.records[dateKey] || {hours:{}}).hours, [hour]: taskIds } } } }) : null);
  };

  const handleAddRecordBlock = (block: TimeBlock) => {
      setState(prev => prev ? syncBlocksToRecords(dateKey, [...(prev.recordBlocks?.[dateKey] || []), block], prev, 'record') : null);
  };
  const handleUpdateRecordBlock = (block: TimeBlock) => {
      setState(prev => prev ? syncBlocksToRecords(dateKey, (prev.recordBlocks?.[dateKey] || []).map(b => b.id === block.id ? block : b), prev, 'record') : null);
  };
  const handleDeleteRecordBlock = (blockId: string) => {
      setState(prev => prev ? syncBlocksToRecords(dateKey, (prev.recordBlocks?.[dateKey] || []).filter(b => b.id !== blockId), prev, 'record') : null);
  };

  const handleAddScheduleBlock = (block: TimeBlock) => {
      setState(prev => prev ? syncBlocksToRecords(dateKey, [...(prev.scheduleBlocks?.[dateKey] || []), block], prev, 'schedule') : null);
  };
  const handleUpdateScheduleBlock = (block: TimeBlock) => {
      setState(prev => prev ? syncBlocksToRecords(dateKey, (prev.scheduleBlocks?.[dateKey] || []).map(b => b.id === block.id ? block : b), prev, 'schedule') : null);
  };
  const handleDeleteScheduleBlock = (blockId: string) => {
      setState(prev => prev ? syncBlocksToRecords(dateKey, (prev.scheduleBlocks?.[dateKey] || []).filter(b => b.id !== blockId), prev, 'schedule') : null);
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
    const redemption = { id: generateId(), shopItemId: item.id, itemName: item.name, cost: item.cost, date: formatDate(new Date()), timestamp: Date.now() };
    setState(prev => prev ? ({ ...prev, redemptions: [...prev.redemptions, redemption] }) : null);
  };

  const handleAddReviewTemplate = (template: Omit<ReviewTemplate, 'id'>) => {
    const newTemplate = { ...template, id: generateId() };
    setState(prev => prev ? ({ ...prev, reviewTemplates: [...prev.reviewTemplates, newTemplate] }) : null);
  };
  const handleUpdateReviewTemplate = (template: ReviewTemplate) => {
    setState(prev => prev ? ({ ...prev, reviewTemplates: prev.reviewTemplates.map(t => t.id === template.id ? template : t) }) : null);
  };
  const handleDeleteReviewTemplate = (id: string) => {
    setState(prev => prev ? ({ ...prev, reviewTemplates: prev.reviewTemplates.filter(t => t.id !== id) }) : null);
  };

  const handleAddObjective = (obj: Objective) => {
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
    <div className="h-screen w-screen bg-[#f5f5f4] flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4 lg:p-6 transition-all">
      <div className="w-full h-full sm:max-w-md md:max-w-5xl lg:max-w-6xl md:h-[94vh] bg-white sm:rounded-3xl flex flex-col md:flex-row relative shadow-soft overflow-hidden border border-stone-200">
        
        {/* Desktop/Tablet Minimalist Sidebar - Adapted to Theme */}
        <nav className="hidden md:flex w-[80px] flex-col items-center py-6 bg-white border-r border-stone-100 shrink-0 z-50 transition-colors duration-300">
            <div className="mb-8 p-3 bg-primary text-white rounded-2xl cursor-pointer hover:scale-105 transition-transform shadow-md" title="ChronosFlow">
                <Hexagon size={26} strokeWidth={2.5} />
            </div>
            <div className="flex-1 flex flex-col gap-6 w-full px-3 items-center">
                <SideNavButton label="安排" active={activeTab === 'arrange'} onClick={() => setActiveTab('arrange')} icon={<CalendarCheck2 size={22} />} />
                <SideNavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<Timer size={22} />} />
                <SideNavButton label="评估" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Trophy size={22} />} />
                <div className="flex-1" />
                <SideNavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings2 size={22} />} />
            </div>
        </nav>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col h-full min-w-0 relative bg-white">
            {/* Header */}
            <header className="bg-white z-[60] shrink-0 pt-[env(safe-area-inset-top)] transition-all sticky top-0 h-16 flex items-center px-6">
                <div className="flex-1 flex items-center justify-between">
                    {/* Left */}
                    <div className="w-24 flex justify-start items-center">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 -ml-2 text-stone-900 hover:bg-stone-50 rounded-xl transition-all active:scale-95"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="hidden md:flex items-baseline gap-1">
                            <span className="text-sm font-black text-stone-900 uppercase tracking-widest">CHRONOS</span>
                        </div>
                    </div>
                    
                    {/* Center: Date Navigation Pills */}
                    <div className="flex items-center justify-center gap-1 bg-stone-50 p-1 rounded-2xl border border-stone-100/50">
                        <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl transition-all active:scale-90"><ChevronLeft size={18} /></button>
                        
                        <button onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()} className="relative flex items-center justify-center px-4 py-1 cursor-pointer min-w-[100px]">
                            <span className="font-bold text-sm text-stone-800 whitespace-nowrap">{format(currentDate, 'M月d日')}</span>
                            <span className="text-[10px] text-stone-400 ml-1 font-medium">{format(currentDate, 'EEE', { locale: zhCN })}</span>
                            <input ref={dateInputRef} type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))} />
                        </button>

                        <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl transition-all active:scale-90"><ChevronRight size={18} /></button>
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="w-24 flex justify-end items-center gap-2">
                        {!isToday ? (
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className="p-2 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border border-primary/10"
                                title="回到今天"
                            >
                                <RotateCcw size={18} />
                            </button>
                        ) : editingStatus ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-xl shadow-sm">
                                <span className="text-[10px] font-bold whitespace-nowrap uppercase leading-none">{editingStatus}</span>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 overflow-hidden relative">
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
                viewMode={viewMode}
                />
            )}

            {activeTab === 'record' && (
                <TrackerView 
                    tasks={state.tasks} objectives={state.objectives} categoryOrder={state.categoryOrder} 
                    scheduleData={currentSchedule} recordData={currentRecord} 
                    recordBlocks={currentRecordBlocks} scheduleBlocks={currentScheduleBlocks}
                    recurringSchedule={state.recurringSchedule} allRecords={state.records} 
                    onUpdateRecord={updateRecordHour} onUpdateSchedule={updateScheduleHour} onUpdateRecurring={updateRecurringHour}
                    onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} 
                    onAddRecordBlock={handleAddRecordBlock}
                    onUpdateRecordBlock={handleUpdateRecordBlock}
                    onDeleteRecordBlock={handleDeleteRecordBlock}
                    onAddScheduleBlock={handleAddScheduleBlock}
                    onUpdateScheduleBlock={handleUpdateScheduleBlock}
                    onDeleteScheduleBlock={handleDeleteScheduleBlock}
                    onAddTodo={(todo) => setState(prev => prev ? ({ ...prev, todos: [todo, ...prev.todos] }) : null)}
                    currentDate={currentDate} onEditingStatusChange={setEditingStatus}
                    onOpenStats={() => setIsTimeStatsOpen(true)}
                />
            )}

            {activeTab === 'rating' && (
                 <RatingView 
                    currentDate={currentDate} ratings={state.ratings} ratingItems={state.ratingItems} 
                    shopItems={state.shopItems} redemptions={state.redemptions} reviewTemplates={state.reviewTemplates}
                    isShopOpen={isShopOpen} onToggleShop={setIsShopOpen}
                    onUpdateRating={handleUpdateRating} onUpdateRatingItems={(items) => setState(prev => prev ? ({...prev, ratingItems: items}) : null)}
                    onUpdateShopItems={(items) => setState(prev => prev ? ({...prev, shopItems: items}) : null)}
                    onRedeem={handleRedeem}
                    onAddReviewTemplate={handleAddReviewTemplate} onUpdateReviewTemplate={handleUpdateReviewTemplate} onDeleteReviewTemplate={handleDeleteReviewTemplate}
                    isStatsModalOpen={isRatingStatsOpen} onCloseStats={() => setIsRatingStatsOpen(false)}
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
            </main>

            {/* Mobile Bottom Navigation - Floating Blur Bar (White Theme) */}
            <div className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex justify-center pointer-events-none">
                <nav className="w-full max-w-sm pointer-events-auto h-16 flex items-center justify-around px-2 bg-white/90 backdrop-blur-xl rounded-3xl shadow-float border border-white/20 overflow-hidden">
                     <NavButton label="安排" active={activeTab === 'arrange'} onClick={() => setActiveTab('arrange')} icon={<CalendarCheck2 size={24} />} />
                     <NavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<Timer size={24} />} />
                     <NavButton label="评估" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Trophy size={24} />} />
                     <NavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings2 size={24} />} />
                </nav>
            </div>
        </div>

        {/* Sidebar Drawer Overlay (Mobile) */}
        <div className={cn(
            "absolute inset-0 z-[100] transition-all duration-300 pointer-events-none md:hidden",
            isSidebarOpen ? "bg-stone-900/20 backdrop-blur-sm pointer-events-auto" : "bg-transparent"
        )} onClick={() => setIsSidebarOpen(false)}>
            <div 
                className={cn(
                    "absolute top-0 bottom-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col pointer-events-auto rounded-r-[2rem]",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <div className="flex items-center gap-3 text-primary">
                         <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary border border-stone-100">
                             <Hexagon size={22} strokeWidth={2.5} />
                         </div>
                         <div>
                             <h2 className="font-black text-lg leading-tight uppercase tracking-tight text-stone-900">Chronos</h2>
                             <p className="text-[10px] font-bold text-stone-400">Time Tracker</p>
                         </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-full shadow-sm border border-stone-100"><X size={20} /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {activeTab === 'arrange' && (
                        <div className="space-y-3">
                            <div className="px-1">
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">视图切换</span>
                            </div>
                            <div className="flex gap-3">
                                {(['list', 'week', 'month'] as ViewMode[]).map(m => (
                                    <button 
                                        key={m}
                                        onClick={() => handleSidebarAction(() => setViewMode(m))}
                                        className={cn(
                                            "flex flex-col items-center justify-center flex-1 py-3 rounded-2xl transition-all border",
                                            viewMode === m ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white text-stone-400 border-stone-100 hover:border-stone-200"
                                        )}
                                    >
                                        {m === 'list' && <List size={20} />}
                                        {m === 'week' && <CalendarRange size={20} />}
                                        {m === 'month' && <CalendarDays size={20} />}
                                        <span className="text-[10px] font-bold mt-1.5">{m === 'list' ? '列表' : (m === 'week' ? '周' : '月')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="px-1">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">快捷功能</span>
                        </div>

                        {activeTab === 'arrange' && (
                            <SidebarButton 
                                icon={<LayoutGrid size={20} />} 
                                label={isTaskPoolOpen ? "关闭任务库" : "打开任务库"} 
                                active={isTaskPoolOpen}
                                onClick={() => handleSidebarAction(() => setIsTaskPoolOpen(!isTaskPoolOpen))} 
                            />
                        )}

                        {activeTab === 'arrange' && (
                            <SidebarButton icon={<CalendarDays size={20} />} label="任务统计" onClick={() => handleSidebarAction(() => setIsTaskStatsOpen(true))} />
                        )}
                        
                        {activeTab === 'record' && (
                            <SidebarButton icon={<PieChart size={20} />} label="时间统计" onClick={() => handleSidebarAction(() => setIsTimeStatsOpen(true))} />
                        )}

                        {activeTab === 'rating' && (
                            <SidebarButton icon={<TrendingUp size={20} />} label="评估统计" onClick={() => handleSidebarAction(() => setIsRatingStatsOpen(true))} />
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Global Modals */}
        {isTaskStatsOpen && (
          <TaskStatsModal isOpen={true} onClose={() => setIsTaskStatsOpen(false)} todos={state.todos} objectives={state.objectives} currentDate={currentDate} />
        )}
        
        {isTimeStatsOpen && (
            <StatsView 
                tasks={state.tasks} scheduleData={currentSchedule} recordData={currentRecord}
                recordBlocks={currentRecordBlocks} 
                allSchedules={state.schedule} recurringSchedule={state.recurringSchedule} allRecords={state.records}
                dateObj={currentDate} isOpen={true} isModal={true} onClose={() => setIsTimeStatsOpen(false)}
            />
        )}
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={cn(
        "flex-1 flex flex-col items-center justify-center h-full relative group cursor-pointer select-none transition-all duration-300",
        active ? "text-primary" : "text-stone-400 hover:text-stone-600"
    )}
  >
    {/* No Background Block */}
    <div className="relative z-10 flex flex-col items-center gap-1 transition-transform duration-200 group-active:scale-90">
        {React.cloneElement(icon as React.ReactElement, { strokeWidth: 2 })}
        <span className="text-[10px] font-bold leading-none tracking-tight">{label}</span>
    </div>
  </button>
);

const SideNavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick} 
        className={cn(
            "group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ease-out border-2",
            active 
                ? "bg-white text-primary border-stone-100 shadow-sm scale-110" 
                : "text-stone-400 border-transparent hover:bg-stone-50"
        )}
        title={label}
    >
        {icon}
    </button>
  );

const SidebarButton = ({ icon, label, onClick, active, className }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean, className?: string }) => (
    <button 
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] border",
            active ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white hover:bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-200",
            className
        )}
    >
        {icon}
        <span className="text-sm font-bold">{label}</span>
    </button>
);
