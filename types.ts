
export type TargetMode = 'duration' | 'count';

export interface TaskTarget {
  mode: TargetMode;
  value: number; // 代表小时或次数
  frequency: number; // 周期（天）
  totalValue?: number; // 总目标值（用于进度条显示）
  deadline?: string; // 截止日期 ISO string
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  color: string;
  category: string; // Task Pool Category (ID)
  targets?: TaskTarget;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Todo {
  id: string;
  title: string;
  objectiveId: string;
  templateId?: string; // 关联的任务模板ID
  isFrog: boolean; 
  isCompleted: boolean;
  subTasks: SubTask[];
  createdAt: string;
  completedAt?: string; // yyyy-MM-dd
  startDate?: string; // yyyy-MM-dd
  actualStartDate?: string; // yyyy-MM-dd
  dueTime?: string; // HH:mm
  targets?: TaskTarget; // 新增：允许待办拥有量化目标和周期
  currentValue?: number; // 当前进度值
}

export interface DayData {
  hours: Record<number, string[]>;
}

export interface RatingItem {
  id: string;
  name: string;
  reasons: Record<number, string>;
}

export interface DayRating {
  scores: Record<string, number>;
  comment: string;
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
}

export interface Redemption {
  id: string;
  shopItemId: string;
  itemName: string;
  cost: number;
  date: string;
}

// 4页：安排，记录，打分，设置
export type Tab = 'arrange' | 'record' | 'rating' | 'settings';
export type ViewMode = 'list' | 'week' | 'month';

export interface RolloverSettings {
  enabled: boolean;
  maxDays: number;
}

export interface AppState {
  objectives: Objective[];
  tasks: Task[];
  todos: Todo[];
  categoryOrder: string[];
  ratingItems: RatingItem[];
  shopItems: ShopItem[];
  redemptions: Redemption[];
  schedule: Record<string, DayData>;
  recurringSchedule: Record<number, string[]>;
  records: Record<string, DayData>;
  ratings: Record<string, DayRating>;
  rolloverSettings: RolloverSettings;
  themeColor: string; // Theme Color Hex
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
