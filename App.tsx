import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, ListTodo, LayoutGrid, ClipboardCheck, Settings, BarChart2, CalendarDays, RotateCcw, Loader2, Star, TrendingUp } from 'lucide-react';
import { format, addDays, subDays, differenceInCalendarDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData, Objective, Todo, RatingItem, ShopItem, DayRating } from './types';
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

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('arrange');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isTaskStatsOpen, setIsTaskStatsOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false); // 时间轴统计弹窗
  const [isRatingStatsOpen, setIsRatingStatsOpen] = useState(false); // 打分趋势弹窗
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
  const handleExportData = () => {
    if (!state) return;
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ChronosFlow_Backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        if (imported.tasks && imported.objectives) {
          setState(imported);
          alert('数据导入成功！');
        } else {
          alert('导入失败：文件格式不符合要求');
        }
      } catch (err) {
        alert('导入失败：解析文件出错');
      }
    };
    reader.readAsText(file);
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

  const UtilityButtonClass = "w-9 h-9 flex items-center justify-center bg-stone-100 text-stone-600 rounded-full shadow-sm hover:bg-stone-200 hover:text-stone-900 transition-all active:scale-90 shrink-0 border border-stone-200/50";

  return (
    <div className="h-screen w-screen bg-stone-50 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-6xl sm:h-[96vh] bg-white sm:rounded-xl flex flex-col relative border border-stone-200 shadow-2xl overflow-hidden">
        
        {/* 页眉导航 */}
        <header className="pt-8 pb-3 px-8 bg-white/80 backdrop-blur-md flex items-center justify-between z-[60] shrink-0 border-b border-stone-100">
           <div className="w-20 sm:w-28 flex justify-start items-center">
                {activeTab === 'arrange' ? (
                  <button onClick={() => setIsTaskPoolOpen(true)} className={UtilityButtonClass} title="模板库">
                    <LayoutGrid size={18} />
                  </button>
                ) : editingStatus ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 text-white rounded-lg shadow-sm border border-stone-800">
                    <span className="text-[10px] font-black whitespace-nowrap uppercase leading-none">{editingStatus}</span>
                  </div>
                ) : null}
           </div>
           
           <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2 relative">
                <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 text-stone-300 hover:text-stone-800 transition-all"><ChevronLeft size={20} /></button>
                
                <button onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()} className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all hover:bg-stone-50 min-w-[100px]">
                    <span className="font-black text-lg text-stone-800 whitespace-nowrap leading-none">{format(currentDate, 'M月d日', { locale: zhCN })}</span>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1">{format(currentDate, 'EEEE', { locale: zhCN })}</span>
                    <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))} />
                </button>

                <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 text-stone-300 hover:text-stone-800 transition-all"><ChevronRight size={20} /></button>
                
                {!isToday && (
                    <button onClick={() => setCurrentDate(new Date())} className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-[70] hover:bg-stone-800 active:scale-95 ring-2 ring-white whitespace-nowrap">
                        <RotateCcw size={10} className="text-emerald-400" /> 回今日
                    </button>
                )}
           </div>
           
           <div className="w-20 sm:w-28 flex justify-end items-center gap-2">
                {activeTab === 'arrange' && (
                  <button onClick={() => setIsTaskStatsOpen(true)} className={UtilityButtonClass} title="成就统计">
                    <CalendarDays size={18} />
                  </button>
                )}
                {activeTab === 'record' && (
                  <button onClick={() => setIsStatsModalOpen(true)} className={UtilityButtonClass} title="统计分析">
                    <BarChart2 size={18} className="text-indigo-600" />
                  </button>
                )}
                {activeTab === 'rating' && (
                  <button onClick={() => setIsRatingStatsOpen(true)} className={UtilityButtonClass} title="趋势统计">
                    <TrendingUp size={18} className="text-emerald-600" />
                  </button>
                )}
           </div>
        </header>

        {/* 内容主体 */}
        <main className="flex-1 overflow-hidden relative bg-white">
          {activeTab === 'arrange' && (
            <TodoView 
              todos={state.todos} objectives={state.objectives} tasks={state.tasks}
              onAddTodo={(todo) => setState(prev => prev ? ({ ...prev, todos: [todo, ...prev.todos] }) : null)}
              onUpdateTodo={(todo) => setState(prev => prev ? ({ ...prev, todos: prev.todos.map(t => t.id === todo.id ? todo : t) }) : null)}
              onDeleteTodo={(id) => setState(prev => prev ? ({ ...prev, todos: prev.todos.filter(t => t.id !== id) }) : null)}
              onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
              isTaskPoolOpen={isTaskPoolOpen} setIsTaskPoolOpen={setIsTaskPoolOpen}
              currentDate={currentDate}
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
                onExportData={handleExportData} onImportData={handleImportData} onClearData={() => setState(getInitialState())} showInstallButton={false} onInstall={() => {}}
            />
          )}
        </main>

        {/* 底部导航 */}
        <nav className="h-24 bg-white border-t border-stone-100 flex items-start justify-center px-4 shrink-0">
            <div className="w-full max-w-md mt-3 bg-stone-100 rounded-2xl px-2 py-2 flex items-center justify-between border border-stone-200 shadow-sm">
                <NavButton label="安排" active={activeTab === 'arrange'} onClick={() => setActiveTab('arrange')} icon={<ListTodo size={18} />} />
                <NavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<ClipboardCheck size={18} />} />
                <NavButton label="打分" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Star size={18} />} />
                <NavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} />
            </div>
        </nav>

        {/* 全局模态窗 */}
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
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all duration-300 gap-1", active ? "text-stone-900 bg-white border border-stone-200 shadow-md" : "text-stone-400 hover:text-stone-600")}>
    <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>{icon}</div>
    <span className={cn("text-[9px] font-black tracking-widest uppercase leading-none", active ? "opacity-100" : "opacity-60")}>{label}</span>
  </button>
);