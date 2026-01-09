
import { AppState, Task, RatingItem, ShopItem, Objective, ReviewTemplate } from '../types';
import { generateId } from '../utils';

const STORAGE_KEY = 'chronos_flow_data_v1';

export const DEFAULT_OBJECTIVES: Objective[] = [
  { id: 'obj_life', title: '生活平衡', description: '保持身心愉悦与基础生存需求', color: '#94a3b8' },
  { id: 'obj_work', title: '职业发展', description: '提升专业技能与工作产出', color: '#3b82f6' },
  { id: 'obj_health', title: '强健体魄', description: '规律运动与健康饮食', color: '#10b981' },
  { id: 'obj_growth', title: '个人成长', description: '终身学习与认知升级', color: '#8b5cf6' },
];

export const DEFAULT_TASKS: Task[] = [
  { id: 't1', name: '睡眠', color: '#94a3b8', category: 'obj_life' },
  { id: 't2', name: '工作', color: '#3b82f6', category: 'obj_work' },
  { id: 't3', name: '运动', color: '#10b981', category: 'obj_health' },
  { id: 't4', name: '阅读', color: '#8b5cf6', category: 'obj_growth' },
  { id: 't5', name: '用餐', color: '#f59e0b', category: 'obj_life' },
];

export const DEFAULT_RATING_ITEMS: RatingItem[] = [
  {
    id: 'r1',
    name: '身心状态',
    reasons: {
      [-2]: '极度疲惫',
      [-1]: '有些焦虑',
      [0]: '平平淡淡',
      [1]: '比较充实',
      [2]: '精力充沛'
    }
  },
  {
    id: 'r2',
    name: '专注程度',
    reasons: {
      [-2]: '完全摸鱼',
      [-1]: '经常分心',
      [0]: '正常处理',
      [1]: '深度投入',
      [2]: '进入心流'
    }
  }
];

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  { id: 's1', name: '一杯奶茶', cost: 10, icon: '🧋' },
  { id: 's2', name: '游戏 1小时', cost: 15, icon: '🎮' },
  { id: 's3', name: '作弊餐', cost: 30, icon: '🍔' },
  { id: 's4', name: '看电影', cost: 50, icon: '🎬' },
  { id: 's5', name: '懒惰一天', cost: 100, icon: '🛌' },
];

export const DEFAULT_REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    id: 'rt_kpt',
    title: 'KPT 复盘法',
    content: "## Keep (保持)\n- \n\n## Problem (问题)\n- \n\n## Try (尝试)\n- "
  },
  {
    id: 'rt_daily3',
    title: '每日三问',
    content: "1. 今天最重要的一件事做完了吗？\n- \n\n2. 今天有什么值得记录的小确幸？\n- \n\n3. 明天最期待的事情是什么？\n- "
  }
];

export const getInitialState = (): AppState => ({
  objectives: DEFAULT_OBJECTIVES,
  tasks: DEFAULT_TASKS,
  todos: [],
  categoryOrder: DEFAULT_OBJECTIVES.map(o => o.id),
  ratingItems: DEFAULT_RATING_ITEMS,
  shopItems: DEFAULT_SHOP_ITEMS,
  redemptions: [],
  reviewTemplates: DEFAULT_REVIEW_TEMPLATES,
  schedule: {},
  scheduleBlocks: {},
  recurringSchedule: {},
  records: {},
  recordBlocks: {},
  ratings: {},
  rolloverSettings: { enabled: false, maxDays: 3 },
  themeColor: '#6366f1', // Indigo 500
});

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return getInitialState();
    }
    const parsed = JSON.parse(serialized);
    
    // Safety check for critical arrays
    if (!parsed || typeof parsed !== 'object') return getInitialState();
    
    if (!parsed.objectives || !Array.isArray(parsed.objectives)) parsed.objectives = DEFAULT_OBJECTIVES;
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) parsed.tasks = DEFAULT_TASKS;
    if (!parsed.categoryOrder) parsed.categoryOrder = parsed.objectives.map((o: Objective) => o.id);

    if (!parsed.todos) parsed.todos = [];
    if (!parsed.recurringSchedule) parsed.recurringSchedule = {};
    if (!parsed.ratingItems) parsed.ratingItems = DEFAULT_RATING_ITEMS;
    if (!parsed.ratings) parsed.ratings = {};
    if (!parsed.shopItems) parsed.shopItems = DEFAULT_SHOP_ITEMS;
    if (!parsed.redemptions) parsed.redemptions = [];
    if (!parsed.reviewTemplates) parsed.reviewTemplates = DEFAULT_REVIEW_TEMPLATES;
    if (!parsed.schedule) parsed.schedule = {};
    if (!parsed.scheduleBlocks) parsed.scheduleBlocks = {};
    if (!parsed.records) parsed.records = {};
    if (!parsed.recordBlocks) parsed.recordBlocks = {};
    if (!parsed.rolloverSettings) parsed.rolloverSettings = { enabled: false, maxDays: 3 };
    if (!parsed.themeColor) parsed.themeColor = '#6366f1';

    return parsed as AppState;
  } catch (e) {
    console.error("Failed to load state", e);
    return getInitialState();
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};
