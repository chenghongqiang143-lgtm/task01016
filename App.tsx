import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ChevronLeft, ChevronRight, LayoutGrid, RotateCcw, Loader2, TrendingUp, 
    Hexagon, Plus, Menu, X, List, CalendarRange, CalendarDays, 
    CalendarCheck2, Timer, Settings2, BarChart3, PieChart, Star, Activity
} from 'lucide-react';
import { format, addDays, subDays, differenceInCalendarDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData, Objective, Todo, RatingItem, ShopItem, DayRating, ViewMode, Redemption, ReviewTemplate, MemoItem } from './types';
import { loadState, saveState, getInitialState } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { TrackerView } from './views/TrackerView';
import { TodoView } from './views/TodoView';
import { SettingsTab } from './views/SettingsTab';
import { CalendarView } from './views/CalendarView';
import { RatingView } from './views/RatingView';
import { TaskStatsModal } from './components/TaskStatsModal';
import { TodoEditorModal } from './components/TodoEditorModal';
import { TaskPoolModal } from './components/TaskPoolModal';

const MIN_LOADING_TIME = 800;

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '39 39 42'; 
}

const SideNavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button onClick={onClick} className={cn("group relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ease-out border-2", active ? "bg-white text-primary border-stone-100 shadow-sm scale-110" : "text-stone-300 border-transparent hover:bg-stone-50 hover:text-stone-600")} title={label}>
        {icon}
    </button>
);

const SidebarButton = ({ icon, label, onClick, active, className }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean, className?: string }) => (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all active:scale-[0.98] border font-black text-sm", active ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white text-stone-600 border-stone-100", className)}>
        {icon}
        <span>{label}</span>
    </button>
);

const NavButton = ({ active, onClick, icon, label, className }: { active: boolean, onClick: () => void, icon: React.ReactNode, label?: string, className?: string }) => (
  <button onClick={onClick} className={cn("flex-1 flex flex-col items-center justify-center h-full relative group transition-all duration-300", active ? "text-primary scale-110" : "text-stone-400", className)}>
    <div className="flex flex-col items-center gap-1.5">
        {React.cloneElement(icon as React.ReactElement, { strokeWidth: 2.5 })}
        {label && <span className="text-[10px] font-black leading-none uppercase tracking-widest">{label}</span>}
    </div>
  </button>
);

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('arrange');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isTaskStatsOpen, setIsTaskStatsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTaskPoolOpen, setIsTaskPoolOpen] = useState(false); 
  const [isGlobalTodoModalOpen, setIsGlobalTodoModalOpen] = useState(false);
  const [arrangeViewMode, setArrangeViewMode] = useState<ViewMode>('list');
  
  // Rating View States
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isRatingStatsOpen, setIsRatingStatsOpen] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AppState | null>(null);

  const handleSidebarAction = (action: () => void) => {
    action();
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const loaded = loadState();
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

        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME));

        if (isMounted) {
            setState(loaded);
            setIsLoaded(true);
            const shell = document.getElementById('initial-loader');
            if (shell) {
                shell.style.opacity = '0';
                setTimeout(() => shell.remove(), 400);
            }
        }
      } catch (err) {
        if (isMounted) {
            setState(getInitialState());
            setIsLoaded(true);
        }
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => { 
    if (state && isLoaded) saveState(state);
  }, [state, isLoaded]);

  useEffect(() => {
    if (state?.themeColor) document.documentElement.style.setProperty('--color-primary', hexToRgb(state.themeColor));
  }, [state?.themeColor]);

  const dateKey = formatDate(currentDate);
  const isToday = isSameDay(currentDate, new Date());

  const currentSchedule: DayData = useMemo(() => {
      if (!state) return { hours: {} };
      const day = state.schedule?.[dateKey];
      return (day && day.hours) ? day : { hours: {} };
  }, [state?.schedule, dateKey]);

  const currentRecord: DayData = useMemo(() => {
    if (!state) return { hours: {} };
    const day = state.records?.[dateKey];
    return (day && day.hours) ? day : { hours: {} };
  }, [state?.records, dateKey]);

  if (!state || !isLoaded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-50 space-y-4 font-sans text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.2em]">Chronos Loading</span>
      </div>
    );
  }

  const handleExportData = () => {
    if (!state) return;
    navigator.clipboard.writeText(JSON.stringify(state, null, 2)).then(() => alert('数据已复制')).catch(() => alert('复制失败'));
  };

  const handleImportData = (dataStr: string) => {
      try {
        const imported = JSON.parse(dataStr);
        if (imported.tasks) { setState(imported); alert('导入成功'); }
      } catch (err) { alert('导入失败，请检查格式'); }
  };
  
  const handleClearRecords = () => {
      setState(prev => prev ? ({ ...prev, todos: [], schedule: {}, scheduleBlocks: {}, records: {}, recordBlocks: {}, ratings: {}, redemptions: [] }) : null);
  };

  // State Updates
  const handleAddTodo = (todo: Todo) => {
    setState(prev => {
        if (!prev) return null;
        
        let updatedTasks = prev.tasks;
        let processedTodo = { ...todo };

        // Automatically create a habit (task template) if the new todo has a frequency (recurring) or a long-term goal but no template
        const hasFrequency = processedTodo.targets?.frequency && processedTodo.targets.frequency > 0;
        const hasLongTermGoal = processedTodo.targets?.totalValue && processedTodo.targets.totalValue > 0;

        if ((hasFrequency || hasLongTermGoal) && !processedTodo.templateId) {
            const templateId = generateId();
            const relatedObj = prev.objectives.find(o => o.id === processedTodo.objectiveId);
            const newTask: Task = {
                id: templateId,
                name: processedTodo.title,
                color: relatedObj ? relatedObj.color : '#3b82f6',
                category: processedTodo.objectiveId,
                targets: processedTodo.targets
            };
            updatedTasks = [...prev.tasks, newTask];
            processedTodo.templateId = templateId;
        }

        return {
            ...prev,
            tasks: updatedTasks,
            todos: [processedTodo, ...prev.todos]
        };
    });
  };

  const handleUpdateTodo = (todo: Todo) => setState(prev => prev ? ({ ...prev, todos: prev.todos.map(t => t.id === todo.id ? todo : t) }) : null);
  const handleDeleteTodo = (id: string) => setState(prev => prev ? ({ ...prev, todos: prev.todos.filter(t => t.id !== id) }) : null);
  const handleAddTask = (taskPart: Omit<Task, 'id'>) => setState(prev => prev ? ({ ...prev, tasks: [...prev.tasks, { ...taskPart, id: generateId() }] }) : null);
  const handleUpdateTask = (updated: Task) => setState(prev => prev ? ({ ...prev, tasks: prev.tasks.map(t => t.id === updated.id ? updated : t) }) : null);
  const handleDeleteTask = (id: string) => setState(prev => prev ? ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }) : null);
  const handleAddObjective = (obj: Objective) => setState(prev => prev ? ({ ...prev, objectives: [...prev.objectives, obj] }) : null);
  const handleUpdateObjective = (updated: Objective) => setState(prev => prev ? ({ ...prev, objectives: prev.objectives.map(o => o.id === updated.id ? updated : o) }) : null);
  const handleDeleteObjective = (id: string) => setState(prev => prev ? ({ ...prev, objectives: prev.objectives.filter(o => o.id !== id) }) : null);
  const handleUpdateCategoryOrder = (order: string[]) => setState(prev => prev ? ({ ...prev, categoryOrder: order }) : null);

  // Memo Handlers
  const handleAddMemo = (memo: MemoItem) => setState(prev => prev ? ({ ...prev, memoItems: [memo, ...(prev.memoItems || [])] }) : null);
  const handleUpdateMemo = (memo: MemoItem) => setState(prev => prev ? ({ ...prev, memoItems: (prev.memoItems || []).map(m => m.id === memo.id ? memo : m) }) : null);
  const handleDeleteMemo = (id: string) => setState(prev => prev ? ({ ...prev, memoItems: (prev.memoItems || []).filter(m => m.id !== id) }) : null);

  const updateScheduleHour = (hour: number, taskIds: string[]) => {
    setState(prev => {
        if (!prev) return null;
        const currentDay = prev.schedule?.[dateKey] || { hours: {} };
        return {
            ...prev,
            schedule: {
                ...prev.schedule,
                [dateKey]: {
                    ...currentDay,
                    hours: { ...currentDay.hours, [hour]: taskIds }
                }
            }
        };
    });
  };
  
  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => {
        if (!prev) return null;
        const currentDay = prev.records?.[dateKey] || { hours: {} };
        return {
            ...prev,
            records: {
                ...prev.records,
                [dateKey]: {
                    ...currentDay,
                    hours: { ...currentDay.hours, [hour]: taskIds }
                }
            }
        };
    });
  };

  const updateRecurring = (hour: number, taskIds: string[]) => {
      setState(prev => prev ? ({
          ...prev,
          recurringSchedule: {
              ...prev.recurringSchedule,
              [hour]: taskIds
          }
      }) : null);
  };

  // Handler for adding a task from the task pool to the current day
  const handleTaskPoolSelect = (task: Task) => {
    const newTodo: Todo = {
      id: generateId(),
      title: task.name,
      objectiveId: task.category || 'none',
      templateId: task.id,
      isFrog: false,
      isCompleted: false,
      subTasks: [],
      createdAt: new Date().toISOString(),
      startDate: formatDate(currentDate), // Add to currently selected date
      targets: task.targets
    };
    handleAddTodo(newTodo);
    setIsTaskPoolOpen(false); // Optional: close modal after adding
    if (activeTab !== 'arrange') setActiveTab('arrange');
  };

  // Rating Handlers
  const handleUpdateRating = (dKey: string, rating: DayRating) => {
      setState(prev => prev ? ({ ...prev, ratings: { ...prev.ratings, [dKey]: rating } }) : null);
  };
  const handleUpdateRatingItems = (items: RatingItem[]) => {
      setState(prev => prev ? ({ ...prev, ratingItems: items }) : null);
  };
  const handleUpdateShopItems = (items: ShopItem[]) => {
      setState(prev => prev ? ({ ...prev, shopItems: items }) : null);
  };
  const handleRedeem = (item: ShopItem) => {
      const redemption: Redemption = {
          id: generateId(),
          shopItemId: item.id,
          itemName: item.name,
          cost: item.cost,
          date: formatDate(new Date()),
          timestamp: Date.now()
      };
      setState(prev => prev ? ({ ...prev, redemptions: [redemption, ...(prev.redemptions || [])] }) : null);
  };
  const handleAddReviewTemplate = (template: Omit<ReviewTemplate, 'id'>) => {
      const newTemplate = { ...template, id: generateId() };
      setState(prev => prev ? ({ ...prev, reviewTemplates: [...(prev.reviewTemplates || []), newTemplate] }) : null);
  };
  const handleUpdateReviewTemplate = (template: ReviewTemplate) => {
       setState(prev => prev ? ({ ...prev, reviewTemplates: (prev.reviewTemplates || []).map(t => t.id === template.id ? template : t) }) : null);
  };
  const handleDeleteReviewTemplate = (id: string) => {
       setState(prev => prev ? ({ ...prev, reviewTemplates: (prev.reviewTemplates || []).filter(t => t.id !== id) }) : null);
  };

  return (
    <div className="h-screen w-screen bg-[#f5f5f4] flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4 lg:p-6 transition-all">
      <div className="w-full h-full sm:max-w-md md:max-w-5xl lg:max-w-6xl md:h-[94vh] bg-white sm:rounded-3xl flex flex-col md:flex-row relative shadow-soft overflow-hidden border border-stone-200">
        
        <nav className="hidden md:flex w-[80px] flex-col items-center py-8 bg-white border-r border-stone-100 shrink-0 z-50">
            <div className="mb-10 p-3 bg-stone-900 text-white rounded-2xl cursor-pointer hover:scale-105 transition-transform shadow-md">
                <Hexagon size={28} strokeWidth={2.5} />
            </div>
            <div className="flex-1 flex flex-col gap-8 w-full px-3 items-center">
                <SideNavButton label="安排" active={activeTab === 'arrange'} onClick={() => setActiveTab('arrange')} icon={<CalendarCheck2 size={24} />} />
                <SideNavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<Activity size={24} />} />
                <SideNavButton label="视图" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarRange size={24} />} />
                <SideNavButton label="打分" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Star size={24} />} />
            </div>
            <div className="pb-2">
                <SideNavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings2 size={24} />} />
            </div>
        </nav>

        <div className="flex-1 flex flex-col h-full min-w-0 relative bg-white">
            {/* Conditional Header based on activeTab */}
            {activeTab === 'arrange' ? (
                <header className="bg-white z-[110] shrink-0 pt-[env(safe-area-inset-top)] sticky top-0 h-16 grid grid-cols-[60px_1fr_60px] items-center px-2 border-b border-stone-50">
                    <div className="flex justify-start">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2.5 text-stone-900 hover:bg-stone-50 rounded-xl transition-colors">
                            <Menu size={24} />
                        </button>
                    </div>
                    
                    {/* Centered Date Navigation - Using Grid Column and Flex Center */}
                    <div className="flex justify-center items-center gap-1 sm:gap-2 relative">
                        <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all active:scale-90 z-20">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()} className="relative flex flex-col items-center justify-center min-w-[80px] cursor-pointer group py-1 px-1 z-10">
                            <span className="font-black text-sm text-stone-900 leading-none">{format(currentDate, 'MM.dd')}</span>
                            <span className="text-[9px] font-bold text-stone-400 mt-0.5">{format(currentDate, 'EEEE', { locale: zhCN })}</span>
                            <input ref={dateInputRef} type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))} />
                        </button>
                        <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all active:scale-90 z-20">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    
                    <div className="flex justify-end items-center">
                        {!isToday && (
                            <button onClick={() => setCurrentDate(new Date())} className="p-2 text-stone-900 bg-stone-50 rounded-lg border border-stone-100 shadow-sm hover:bg-stone-100 active:scale-95 transition-all" title="回到今天">
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </div>
                </header>
            ) : activeTab === 'record' || activeTab === 'calendar' || activeTab === 'rating' || activeTab === 'settings' ? (
                // Simple Header for other tabs mostly handled internally or just sidebar toggle
                <header className="bg-white z-[110] shrink-0 pt-[env(safe-area-inset-top)] sticky top-0 h-16 flex items-center px-4 border-b border-stone-50 md:hidden">
                     <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 -ml-2 text-stone-900 hover:bg-stone-50 rounded-xl transition-colors">
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 font-black text-stone-900 uppercase tracking-widest text-xs">
                        {activeTab === 'record' ? '时间记录' : activeTab === 'calendar' ? '数据视图' : activeTab === 'rating' ? '每日打分' : '设置'}
                    </span>
                </header>
            ) : null}

            <main className="flex-1 overflow-hidden relative">
            {activeTab === 'arrange' && (
                <TodoView 
                    todos={state.todos} objectives={state.objectives} tasks={state.tasks}
                    categoryOrder={state.categoryOrder} onAddTodo={handleAddTodo}
                    onUpdateTodo={handleUpdateTodo} onDeleteTodo={handleDeleteTodo}
                    onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
                    isTaskPoolOpen={isTaskPoolOpen} setIsTaskPoolOpen={setIsTaskPoolOpen}
                    currentDate={currentDate} onDateChange={setCurrentDate}
                    scheduleData={currentSchedule} recordData={currentRecord}
                    onUpdateSchedule={updateScheduleHour}
                    viewMode={arrangeViewMode}
                    onViewModeChange={setArrangeViewMode}
                    allRecords={state.records}
                />
            )}

            {activeTab === 'record' && (
                <TrackerView 
                    tasks={state.tasks}
                    objectives={state.objectives}
                    categoryOrder={state.categoryOrder}
                    scheduleData={currentSchedule}
                    recordData={currentRecord}
                    recurringSchedule={state.recurringSchedule}
                    allRecords={state.records || {}}
                    todos={state.todos}
                    onUpdateRecord={updateRecordHour}
                    onUpdateSchedule={updateScheduleHour}
                    onUpdateRecurring={updateRecurring}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onAddTodo={handleAddTodo}
                    currentDate={currentDate}
                />
            )}

            {activeTab === 'calendar' && (
                <CalendarView
                    todos={state.todos}
                    allRecords={state.records || {}}
                    tasks={state.tasks}
                    objectives={state.objectives}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                />
            )}

            {activeTab === 'rating' && (
                <RatingView 
                    currentDate={currentDate}
                    ratings={state.ratings}
                    ratingItems={state.ratingItems}
                    shopItems={state.shopItems}
                    redemptions={state.redemptions || []}
                    reviewTemplates={state.reviewTemplates || []}
                    isShopOpen={isShopOpen}
                    onToggleShop={setIsShopOpen}
                    onUpdateRating={handleUpdateRating}
                    onUpdateRatingItems={handleUpdateRatingItems}
                    onUpdateShopItems={handleUpdateShopItems}
                    onRedeem={handleRedeem}
                    onAddReviewTemplate={handleAddReviewTemplate}
                    onUpdateReviewTemplate={handleUpdateReviewTemplate}
                    onDeleteReviewTemplate={handleDeleteReviewTemplate}
                    isStatsModalOpen={isRatingStatsOpen}
                    onOpenStats={() => setIsRatingStatsOpen(true)}
                    onCloseStats={() => setIsRatingStatsOpen(false)}
                />
            )}

            {activeTab === 'settings' && (
                <SettingsTab 
                    tasks={state.tasks} categoryOrder={state.categoryOrder} objectives={state.objectives}
                    onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} 
                    onUpdateCategoryOrder={handleUpdateCategoryOrder}
                    allRecords={state.records || {}} currentDate={currentDate} 
                    rolloverSettings={state.rolloverSettings} onUpdateRolloverSettings={(s) => setState(prev => prev ? ({ ...prev, rolloverSettings: s }) : null)}
                    onExportData={handleExportData} onImportData={handleImportData} onClearData={handleClearRecords}
                    onAddObjective={handleAddObjective} onUpdateObjective={handleUpdateObjective} onDeleteObjective={handleDeleteObjective}
                    themeColor={state.themeColor} onUpdateThemeColor={(c) => setState(prev => prev ? ({ ...prev, themeColor: c }) : null)}
                />
            )}
            </main>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex justify-center pointer-events-none">
                <nav className="w-full max-w-sm pointer-events-auto h-16 flex items-center justify-around px-1 bg-white/95 backdrop-blur-xl rounded-3xl shadow-float border border-stone-100 overflow-hidden">
                     <NavButton label="安排" active={activeTab === 'arrange'} onClick={() => setActiveTab('arrange')} icon={<CalendarCheck2 size={22} />} />
                     <NavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<Activity size={22} />} />
                     
                     <button 
                        onClick={() => setIsGlobalTodoModalOpen(true)} 
                        className="flex-1 flex flex-col items-center justify-center h-full relative transition-all duration-300 group"
                     >
                        <div className="w-12 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                            <Plus size={24} strokeWidth={3} className="text-white" />
                        </div>
                     </button>
                     
                     <NavButton label="视图" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarRange size={22} />} />
                     <NavButton label="打分" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Star size={22} />} />
                </nav>
            </div>
        </div>

        {/* Sidebar */}
        <div className={cn("absolute inset-0 z-[120] transition-all duration-300 pointer-events-none md:hidden", isSidebarOpen ? "bg-stone-900/20 backdrop-blur-sm pointer-events-auto" : "bg-transparent")} onClick={() => setIsSidebarOpen(false)}>
            <div className={cn("absolute top-0 bottom-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col pointer-events-auto rounded-r-3xl", isSidebarOpen ? "translate-x-0" : "-translate-x-full")} onClick={(e) => e.stopPropagation()}>
                <div className="p-8 border-b border-stone-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-stone-900 text-white rounded-2xl flex items-center justify-center shadow-md">
                             <Hexagon size={22} strokeWidth={2.5} />
                         </div>
                         <h2 className="font-black text-xl leading-tight uppercase tracking-tight text-stone-900">Chronos</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-stone-400 p-2 rounded-full border border-stone-50"><X size={20} /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto space-y-8 flex flex-col">
                    <div className="space-y-4">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">任务管理</span>
                        <SidebarButton icon={<LayoutGrid size={20} />} label="任务库" active={isTaskPoolOpen} onClick={() => handleSidebarAction(() => setIsTaskPoolOpen(true))} />
                        <SidebarButton icon={<TrendingUp size={20} />} label="数据趋势统计" onClick={() => handleSidebarAction(() => setIsTaskStatsOpen(true))} />
                    </div>
                    
                    <div className="flex-1" />
                    
                    <div className="space-y-4">
                        <SidebarButton icon={<Settings2 size={20} />} label="系统设置" active={activeTab === 'settings'} onClick={() => handleSidebarAction(() => setActiveTab('settings'))} />
                    </div>
                </div>
            </div>
        </div>

        {/* Modals */}
        {isTaskStatsOpen && <TaskStatsModal isOpen={true} onClose={() => setIsTaskStatsOpen(false)} todos={state.todos} objectives={state.objectives} currentDate={currentDate} />}
        
        <TaskPoolModal 
            isOpen={isTaskPoolOpen} 
            onClose={() => setIsTaskPoolOpen(false)} 
            tasks={state.tasks} 
            objectives={state.objectives} 
            categoryOrder={state.categoryOrder}
            todos={state.todos}
            allRecords={state.records}
            onAddTask={handleAddTask} 
            onUpdateTask={handleUpdateTask} 
            onDeleteTask={handleDeleteTask} 
            onAddObjective={handleAddObjective} 
            onUpdateObjective={handleUpdateObjective} 
            onDeleteObjective={handleDeleteObjective}
            onUpdateCategoryOrder={handleUpdateCategoryOrder}
            onSelectTask={handleTaskPoolSelect}
        />

        <TodoEditorModal 
            isOpen={isGlobalTodoModalOpen} 
            onClose={() => setIsGlobalTodoModalOpen(false)} 
            todo={null} 
            objectives={state.objectives} 
            onSave={handleAddTodo} 
            frogCount={state.todos.filter(t => t.isFrog).length} 
            defaultDate={currentDate} 
        />
      </div>
    </div>
  );
}
