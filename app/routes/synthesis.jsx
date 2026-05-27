import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import Toast from '~/components/Toast';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { useState, useEffect } from 'react';

const RARITY_COLORS = {
  N: { bg: 'bg-gray-500', border: 'border-gray-400', text: 'text-gray-500', glow: '' },
  R: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-500', glow: '' },
  SR: { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-500', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.3)]' },
  SSR: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-500', glow: 'shadow-[0_0_16px_rgba(245,158,11,0.4)]' },
  UR: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-500', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' },
};

const CRAFT_OPTIONS = [
  { target: 'R', source: 'N', cost: 5 },
  { target: 'SR', source: 'R', cost: 5 },
  { target: 'SSR', source: 'SR', cost: 5 },
  { target: 'UR', source: 'SSR', cost: 5 },
];

export default function Synthesis() {
  const { user, refreshUser } = useAuth();
  const [targetRarity, setTargetRarity] = useState('SR');
  const [lastResult, setLastResult] = useState(null);
  const [inventory, setInventory] = useState({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
  const [crafting, setCrafting] = useState(false);
  const [toast, setToast] = useState(null);
  const [resultAnim, setResultAnim] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getInventory()
      .then(res => setInventory(res.data || res || { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 }))
      .catch(() => {});
  }, [user]);

  function showToast(message, type = 'info') {
    setToast({ message, type, key: Date.now() });
  }

  const currentOption = CRAFT_OPTIONS.find(o => o.target === targetRarity);
  const sourceCount = inventory[currentOption.source] || 0;
  const canCraft = sourceCount >= currentOption.cost && !crafting;

  async function handleSynthesize() {
    if (!canCraft) return;
    setCrafting(true);
    try {
      const res = await api.craft(targetRarity);
      if (res.success) {
        setLastResult(res.card);
        setResultAnim(true);
        setTimeout(() => setResultAnim(false), 800);
        showToast(`合成成功！消耗 ${res.consumed}，+${res.expGained} 经验`, 'success');
        // 刷新库存和用户数据
        const [inv] = await Promise.all([api.getInventory(), refreshUser()]);
        setInventory(inv.data || inv || { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
        if (res.levelUp) {
          setTimeout(() => showToast(`🎉 升级！Lv.${res.levelUp.newLevel}，+${res.levelUp.reward} 金币`, 'success'), 1500);
        }
      }
    } catch (e) {
      showToast(e?.message || '合成失败', 'error');
    }
    setCrafting(false);
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-halftone" />
      <div className="absolute top-20 left-10 text-tertiary-fixed opacity-50 animate-sparkle">
        <span className="material-symbols-outlined text-[40px]">colors_spark</span>
      </div>

      <Header activeTab="合成" />

      <main className="min-h-screen pt-[72px] md:pt-[80px] pb-[100px] md:pb-xl px-4 md:px-gutter relative flex flex-col items-center">
        <div className="w-full max-w-6xl mt-4 md:mt-margin mb-4 md:mb-lg flex items-center justify-between relative z-10">
          <div className="text-center w-full">
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_#ff77af]">
              突破极限
            </h1>
          </div>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-lg relative z-10">
          {/* Left: Character Card */}
          <div className="md:col-span-5 relative group">
            <div className={`w-full aspect-[3/4] rounded-xl border-4 ${RARITY_COLORS[targetRarity].border} bg-surface-container-lowest/80 backdrop-blur-md shadow-[4px_4px_0px_0px_#ffb0cb] md:shadow-[8px_8px_0px_0px_#ffb0cb] transition-transform duration-300 ease-out group-hover:-rotate-2 group-hover:scale-[1.02] p-1 md:p-xs relative overflow-hidden flex flex-col ${resultAnim ? 'animate-card-reveal' : ''}`}>
              <div className="absolute top-0 left-0 w-6 h-6 md:w-8 md:h-8 border-t-4 border-l-4 border-secondary rounded-tl-lg z-20 m-1 md:m-xs pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-6 h-6 md:w-8 md:h-8 border-b-4 border-r-4 border-secondary rounded-br-lg z-20 m-1 md:m-xs pointer-events-none" />

              <div className={`flex-1 rounded-lg overflow-hidden relative bg-surface-container-high border-2 border-outline-variant flex items-center justify-center ${RARITY_COLORS[targetRarity].glow}`}>
                {lastResult?.imageUrl ? (
                  <img src={lastResult.imageUrl} alt={targetRarity} className="w-full h-full object-cover" />
                ) : (
                  <div className={`text-6xl md:text-8xl font-black ${RARITY_COLORS[targetRarity].text} opacity-30`}>
                    {targetRarity}
                  </div>
                )}
              </div>

              {/* 结果角标 */}
              {lastResult && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
                  <span className={`inline-block text-xs md:text-sm font-black text-white px-3 py-1 rounded-full ${RARITY_COLORS[targetRarity].bg} shadow-lg`}>
                    {targetRarity}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Upgrade Mechanics */}
          <div className="md:col-span-7 flex flex-col gap-3 md:gap-margin justify-center md:pl-md">
            {/* 背包库存 */}
            <div className="bg-surface-container-lowest/90 backdrop-blur-sm p-4 md:p-margin rounded-xl border-4 border-secondary-fixed shadow-[4px_4px_0px_0px_#63d3ff] md:shadow-[6px_6px_0px_0px_#63d3ff]">
              <h3 className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest mb-3">背包库存</h3>
              <div className="grid grid-cols-5 gap-2">
                {CRAFT_OPTIONS.map(opt => (
                  <div key={opt.source} className="text-center">
                    <span className={`inline-block text-[10px] md:text-xs font-black text-white px-2 py-0.5 rounded-full ${RARITY_COLORS[opt.source].bg} mb-1`}>
                      {opt.source}
                    </span>
                    <p className="font-headline-md text-lg md:text-2xl text-on-surface">{inventory[opt.source] || 0}</p>
                  </div>
                ))}
                <div className="text-center">
                  <span className={`inline-block text-[10px] md:text-xs font-black text-white px-2 py-0.5 rounded-full ${RARITY_COLORS.UR.bg} mb-1`}>UR</span>
                  <p className="font-headline-md text-lg md:text-2xl text-on-surface">{inventory.UR || 0}</p>
                </div>
              </div>
            </div>

            {/* 选择目标 */}
            <div className="bg-surface-container-low p-3 md:p-margin rounded-xl border-2 border-outline-variant shadow-[3px_3px_0px_0px_#e3e2e7] md:shadow-[4px_4px_0px_0px_#e3e2e7] flex flex-col gap-2 md:gap-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-label-bold text-[10px] md:text-label-bold text-on-surface uppercase tracking-widest">选择目标</h3>
              </div>
              <div className="flex gap-2 md:gap-sm flex-wrap">
                {CRAFT_OPTIONS.map(opt => {
                  const hasEnough = (inventory[opt.source] || 0) >= opt.cost;
                  return (
                    <button
                      key={opt.target}
                      onClick={() => { setTargetRarity(opt.target); setLastResult(null); }}
                      className={`w-14 h-14 md:w-20 md:h-20 rounded-lg border-2 flex items-center justify-center relative transition-transform cursor-pointer ${
                        targetRarity === opt.target
                          ? `${RARITY_COLORS[opt.target].border} bg-primary-fixed/20 shadow-[2px_2px_0px_0px_#ff77af]`
                          : `border-outline-variant bg-surface-dim hover:translate-y-[-2px]`
                      }`}
                    >
                      <span className="font-button-text text-xs md:text-button-text">{opt.target}</span>
                      <div className={`absolute -bottom-1 md:-bottom-2 -right-1 md:-right-2 font-label-bold text-[10px] md:text-[12px] px-1 md:px-2 py-[1px] md:py-[2px] rounded-full border-2 border-surface ${
                        hasEnough ? 'bg-on-surface text-surface' : 'bg-error text-on-error'
                      }`}>
                        {opt.source}×{opt.cost}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 材料需求提示 */}
            <div className={`p-3 rounded-xl border-2 text-sm flex items-center gap-2 ${
              canCraft
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <span className="material-symbols-outlined text-base">
                {canCraft ? 'check_circle' : 'error'}
              </span>
              <span className="font-body-md text-xs md:text-sm">
                {canCraft
                  ? `消耗 ${currentOption.cost} 张 ${currentOption.source} → 1 张 ${targetRarity}`
                  : `需要 ${currentOption.cost} 张 ${currentOption.source}，当前 ${sourceCount} 张`
                }
              </span>
            </div>

            <button
              onClick={handleSynthesize}
              disabled={!canCraft}
              className={`animate-sheen w-full py-3 md:py-md mt-2 md:mt-sm font-button-text text-base md:text-[24px] rounded-full border-4 transition-all relative overflow-hidden group ${
                canCraft
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-on-tertiary-fixed shadow-[0px_5px_0px_0px_#221b00] md:shadow-[0px_8px_0px_0px_#221b00] hover:translate-y-[3px] hover:shadow-[0px_2px_0px_0px_#221b00] active:translate-y-[5px] active:shadow-none'
                  : 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-not-allowed opacity-60'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center gap-1 md:gap-xs drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)]">
                <span className="material-symbols-outlined text-xl md:text-[28px]">
                  {crafting ? 'hourglass_empty' : 'auto_fix_high'}
                </span>
                {crafting ? '合成中...' : '合成'}
              </span>
              {canCraft && <div className="sheen-layer absolute top-0 left-0 w-1/2 h-full bg-white/40 skew-x-[-20deg] -translate-x-[150%]" />}
            </button>
          </div>
        </div>
      </main>

      <BottomNav activeTab="合成" />

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
