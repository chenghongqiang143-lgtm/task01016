
import React, { useState, useMemo } from 'react';
import { DayRating, RatingItem, ShopItem, Redemption } from '../types';
import { cn, formatDate, generateId } from '../utils';
import { MessageSquareQuote, Plus, Settings2, X, Trash2, ShoppingBag, Coins, Edit2, Save, PenTool } from 'lucide-react';

interface RatingViewProps {
  currentDate: Date;
  ratings: Record<string, DayRating>;
  ratingItems: RatingItem[];
  shopItems: ShopItem[];
  redemptions: Redemption[];
  onUpdateRating: (dateKey: string, rating: DayRating) => void;
  onUpdateRatingItems: (items: RatingItem[]) => void;
  onUpdateShopItems: (items: ShopItem[]) => void;
  onRedeem: (item: ShopItem) => void;
}

const SCORES = [-2, -1, 0, 1, 2];

export const RatingView: React.FC<RatingViewProps> = ({ 
  currentDate, 
  ratings, 
  ratingItems, 
  shopItems,
  redemptions,
  onUpdateRating,
  onUpdateRatingItems,
  onUpdateShopItems,
  onRedeem
}) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isShopEditMode, setIsShopEditMode] = useState(false);
  
  const [editingItem, setEditingItem] = useState<RatingItem | null>(null);
  const [editingShopItem, setEditingShopItem] = useState<ShopItem | null>(null);

  const dateKey = formatDate(currentDate);
  const currentRating = ratings[dateKey] || { scores: {}, comment: '' };

  const { lifetimeScore, balance } = useMemo(() => {
    let totalScore = 0;
    Object.values(ratings).forEach((day: DayRating) => {
        if (day.scores) {
            const daySum = (Object.values(day.scores) as number[]).reduce((a, b) => a + (b || 0), 0);
            totalScore += daySum;
        }
    });
    const spentPoints = redemptions.reduce((acc, r) => acc + r.cost, 0);
    return { lifetimeScore: totalScore, balance: totalScore - spentPoints };
  }, [ratings, redemptions]);

  const todayScore = (Object.values(currentRating.scores) as number[]).reduce((a, b) => a + (b || 0), 0);

  const handleScoreSelect = (itemId: string, score: number) => {
    const newScores = { ...currentRating.scores };
    if (newScores[itemId] === score) delete newScores[itemId];
    else newScores[itemId] = score;
    onUpdateRating(dateKey, { ...currentRating, scores: newScores });
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const newItems = ratingItems.find(i => i.id === editingItem.id)
      ? ratingItems.map(i => i.id === editingItem.id ? editingItem : i)
      : [...ratingItems, { ...editingItem, id: generateId() }];
    onUpdateRatingItems(newItems);
    setEditingItem(null);
  };

  const handleSaveShopItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShopItem) return;
    const newItems = shopItems.find(i => i.id === editingShopItem.id)
      ? shopItems.map(i => i.id === editingShopItem.id ? editingShopItem : i)
      : [...shopItems, { ...editingShopItem, id: generateId() }];
    onUpdateShopItems(newItems);
    setEditingShopItem(null);
  };

  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="px-5 py-5 space-y-6 pb-32">
        {/* Score Dashboard */}
        <section className="bg-stone-900 rounded-3xl p-6 text-white flex flex-col items-center gap-4 relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
           <div className="flex items-center justify-between w-full relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">账户可用积分</span>
                    <div className="flex items-center gap-2">
                        <span className="text-4xl font-black tabular-nums tracking-tighter text-emerald-400">{balance}</span>
                        <Coins size={20} className="text-emerald-400" />
                    </div>
                </div>
                <button onClick={() => setIsShopModalOpen(true)} className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all active:scale-90">
                    <ShoppingBag size={20} />
                </button>
           </div>
           <div className="w-full h-px bg-white/10" />
           <div className="flex items-center justify-between w-full relative z-10 px-1">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">今日评估分</span>
                    <span className={cn("text-sm font-black", todayScore >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {todayScore > 0 ? `+${todayScore}` : todayScore}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">累计获取</span>
                    <span className="text-sm font-black text-white/70">{lifetimeScore}</span>
                </div>
           </div>
        </section>

        {/* Rating List */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
             <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight leading-none">自律评估</h3>
             <button onClick={() => setIsConfigModalOpen(true)} className="p-2 bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-400 border border-stone-100 transition-all active:scale-95">
                <Settings2 size={16} />
             </button>
          </div>
          <div className="space-y-3">
             {ratingItems.map(item => {
                 const selectedScore = currentRating.scores[item.id];
                 return (
                    <div key={item.id} className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100 space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-center px-0.5">
                            <h3 className="text-[13px] font-black text-stone-700">{item.name}</h3>
                            {selectedScore !== undefined && (
                                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-stone-100 shadow-sm transition-all", selectedScore > 0 ? "text-emerald-500" : (selectedScore < 0 ? "text-rose-500" : "text-stone-400"))}>
                                    {item.reasons[selectedScore]}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {SCORES.map(score => (
                                <button key={score} onClick={() => handleScoreSelect(item.id, score)} className={cn("flex-1 h-10 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center active:scale-90", selectedScore === score ? "bg-stone-900 text-white border-stone-900 shadow-inner" : "bg-white border-stone-100 text-stone-400 hover:border-stone-200")}>
                                    {score > 0 ? `+${score}` : score}
                                </button>
                            ))}
                        </div>
                    </div>
                 );
             })}
             {ratingItems.length === 0 && (
                 <div className="py-10 text-center bg-stone-50 rounded-2xl border-2 border-dashed border-stone-100">
                     <p className="text-xs font-bold text-stone-300">尚未设置评估维度</p>
                 </div>
             )}
          </div>
        </section>

        {/* Daily Comment */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
             <MessageSquareQuote size={16} className="text-stone-300" />
             <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">今日感悟</h3>
          </div>
          <textarea value={currentRating.comment} onChange={(e) => onUpdateRating(dateKey, { ...currentRating, comment: e.target.value })} placeholder="在这里记录下今天的心情..." className="w-full h-32 p-4 bg-stone-50 rounded-2xl border border-stone-100 focus:border-stone-400 focus:bg-white focus:outline-none transition-all text-xs font-medium text-stone-700 resize-none leading-relaxed shadow-inner" />
        </section>
      </div>

      {/* Points Shop Modal */}
      {isShopModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] w-full max-w-lg flex flex-col border border-stone-300 shadow-2xl overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-5 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-3 text-emerald-600">
                          <ShoppingBag size={20} />
                          <div>
                              <h3 className="font-black text-stone-800 text-sm">积分商店</h3>
                              <p className="text-[10px] font-bold">可用额度: {balance}P</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsShopEditMode(!isShopEditMode)} 
                            className={cn("p-2 rounded-xl border transition-all", isShopEditMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-100")}
                            title="管理商品"
                          >
                              <PenTool size={16} />
                          </button>
                          <button onClick={() => { setIsShopModalOpen(false); setIsShopEditMode(false); }} className="p-2 hover:bg-emerald-100 rounded-full text-emerald-600"><X size={20} /></button>
                      </div>
                  </div>
                  <div className="p-6 overflow-y-auto bg-stone-50/30 custom-scrollbar flex-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {shopItems.map(item => (
                              <div key={item.id} className="relative group">
                                  <button onClick={() => !isShopEditMode && balance >= item.cost && onRedeem(item)} className={cn("w-full bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex flex-col items-center gap-2 transition-all", !isShopEditMode && balance < item.cost ? "opacity-50 grayscale" : "hover:border-emerald-200 active:scale-95")}>
                                      <span className="text-4xl">{item.icon}</span>
                                      <h4 className="font-bold text-xs text-stone-800">{item.name}</h4>
                                      <div className="text-[10px] font-black text-amber-500 flex items-center gap-1"><Coins size={10} /> {item.cost}</div>
                                  </button>
                                  {isShopEditMode && (
                                      <div className="absolute -top-2 -right-2 flex gap-1 animate-in fade-in zoom-in duration-200">
                                          <button onClick={() => setEditingShopItem(item)} className="p-1.5 bg-stone-900 text-white rounded-full shadow-lg hover:bg-stone-800"><Edit2 size={10} /></button>
                                          <button onClick={() => onUpdateShopItems(shopItems.filter(i => i.id !== item.id))} className="p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600"><Trash2 size={10} /></button>
                                      </div>
                                  )}
                              </div>
                          ))}
                          {isShopEditMode && (
                              <button onClick={() => setEditingShopItem({ id: '', name: '', cost: 10, icon: '🎁' })} className="aspect-square bg-white rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-300 hover:border-emerald-300 hover:text-emerald-500 transition-all">
                                  <Plus size={24} />
                                  <span className="text-[10px] font-bold">新增商品</span>
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Configuration Modal (Dimensions) */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-stone-300 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-stone-50 border-b border-stone-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <Settings2 size={18} className="text-stone-900" />
                    <h3 className="font-black text-stone-800 text-sm">自律维度设定</h3>
                </div>
                <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-stone-200 rounded-full text-stone-400"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white custom-scrollbar">
                <button onClick={() => setEditingItem({ id: '', name: '', reasons: { [-2]:'极差', [-1]:'略差', [0]:'一般', [1]:'较好', [2]:'极佳' } })} className="w-full py-4 border-2 border-dashed border-stone-100 rounded-2xl text-stone-300 font-bold text-xs flex items-center justify-center gap-2 hover:border-stone-300 hover:text-stone-500 transition-all active:scale-[0.98]">
                    <Plus size={16} /> 添加新的评估维度
                </button>
                {ratingItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-stone-200 group transition-all">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-stone-800">{item.name}</span>
                            <span className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-tight truncate max-w-[200px]">
                                {Object.values(item.reasons).join(' / ')}
                            </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditingItem(item)} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl shadow-sm"><Edit2 size={16} /></button>
                          <button onClick={() => onUpdateRatingItems(ratingItems.filter(i => i.id !== item.id))} className="p-2 text-stone-400 hover:text-rose-500 hover:bg-white rounded-xl shadow-sm"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
          
          {/* Dimension Editor Inner Modal */}
          {editingItem && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
              <form onSubmit={handleSaveItem} className="bg-white rounded-[2rem] p-6 w-full max-w-md border border-stone-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-1">
                    <h4 className="font-black text-base text-stone-800">编辑评估维度</h4>
                    <button type="button" onClick={() => setEditingItem(null)} className="text-stone-300 hover:text-stone-900"><X size={20} /></button>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">维度名称</label>
                        <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="例如：专注度、情绪状态..." className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-stone-900 focus:outline-none" required />
                    </div>
                    
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">分值对应文本</label>
                        <div className="grid grid-cols-1 gap-2">
                            {SCORES.map(score => (
                                <div key={score} className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 shrink-0 flex items-center justify-center rounded-xl font-black text-xs", score > 0 ? "bg-emerald-50 text-emerald-600" : (score < 0 ? "bg-rose-50 text-rose-600" : "bg-stone-100 text-stone-400"))}>
                                        {score > 0 ? `+${score}` : score}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={editingItem.reasons[score] || ''} 
                                        onChange={e => {
                                            const newReasons = { ...editingItem.reasons, [score]: e.target.value };
                                            setEditingItem({ ...editingItem, reasons: newReasons });
                                        }} 
                                        placeholder="对应描述文字..." 
                                        className="flex-1 px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:ring-1 focus:ring-stone-900 focus:outline-none" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                   <button type="button" onClick={() => setEditingItem(null)} className="px-6 py-3 text-xs font-black text-stone-400 uppercase">取消</button>
                   <button type="submit" className="px-8 py-3 bg-stone-900 text-white rounded-xl text-xs font-black uppercase shadow-lg active:scale-95 transition-all">保存维度</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Shop Item Editor Inner Modal */}
      {editingShopItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveShopItem} className="bg-white rounded-[2rem] p-6 w-full max-w-sm border border-stone-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <h4 className="font-black text-base text-stone-800 text-center">编辑道具</h4>
            <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">图标</label>
                      <input type="text" value={editingShopItem.icon} onChange={e => setEditingShopItem({...editingShopItem, icon: e.target.value})} placeholder="图标" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-2xl text-center focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-1.5 flex-[3]">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">道具名称</label>
                      <input type="text" value={editingShopItem.name} onChange={e => setEditingShopItem({...editingShopItem, name: e.target.value})} placeholder="例如：一杯奶茶" className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">消耗积分</label>
                    <div className="relative">
                        <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                        <input type="number" value={editingShopItem.cost} onChange={e => setEditingShopItem({...editingShopItem, cost: parseInt(e.target.value) || 0})} placeholder="积分价格" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setEditingShopItem(null)} className="px-5 py-3 text-xs font-bold text-stone-400 uppercase">取消</button>
               <button type="submit" className="px-8 py-3 bg-stone-900 text-white rounded-xl text-xs font-black uppercase shadow-lg active:scale-95">确定</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
