import { useState, useEffect } from 'react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import Toast from '~/components/Toast';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

const SHOP_CONFIG = {
  R:   { price: 150,  name: 'R 卡片',   desc: '标准稀有度卡片', gradient: 'from-blue-400 to-blue-600', border: 'border-blue-400', glow: '' },
  SR:  { price: 600,  name: 'SR 卡片',  desc: '高级稀有度卡片', gradient: 'from-purple-400 to-purple-600', border: 'border-purple-400', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.3)]' },
  SSR: { price: 2500, name: 'SSR 卡片', desc: '超稀有卡片',     gradient: 'from-amber-400 to-yellow-500', border: 'border-amber-400', glow: 'shadow-[0_0_16px_rgba(245,158,11,0.4)]' },
  UR:  { price: 10000, name: 'UR 卡片', desc: '终极稀有卡片',   gradient: 'from-red-400 to-rose-600', border: 'border-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' },
};

const RARITY_BG = {
  R: 'bg-blue-500', SR: 'bg-purple-500', SSR: 'bg-amber-500', UR: 'bg-red-500',
};

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const [buying, setBuying] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [inventory, setInventory] = useState({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });

  useEffect(() => {
    if (!user) return;
    api.getInventory()
      .then(res => setInventory(res?.data || res || { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 }))
      .catch(() => {});
  }, [user?.id]);

  function showToast(message, type = 'info') {
    setToast({ message, type, key: Date.now() });
  }

  async function handleBuy(rarity) {
    if (buying || !user) return;
    const config = SHOP_CONFIG[rarity];
    if (user.coins < config.price) {
      showToast(`积分不足！需要 ${config.price}，当前 ${user.coins}`, 'error');
      return;
    }

    setBuying(rarity);
    try {
      const res = await api.shopBuy(rarity);
      if (res.success) {
        setLastResult(res.card);
        showToast(`成功购买 ${rarity} 卡片！${res.levelUp ? ` 升级到 Lv.${res.levelUp.newLevel}！` : ''}`, 'success');
        const [inv] = await Promise.all([api.getInventory(), refreshUser()]);
        setInventory(inv?.data || inv || { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
      }
    } catch (e) {
      showToast(e?.message || '购买失败', 'error');
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden font-body-md text-body-md">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary-fixed-dim/30 blur-3xl" />
        <div className="absolute bottom-[20%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-secondary-fixed-dim/20 blur-3xl" />
      </div>

      <Header activeTab="商店" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-margin pt-[72px] md:pt-[80px] pb-[100px] md:pb-md flex flex-col gap-4 md:gap-md">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-md mt-2 md:mt-md">
          <div>
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-on-surface drop-shadow-[2px_2px_0px_#e3e2e7]">
              兑换商店
            </h1>
            <p className="font-body-md text-xs md:text-body-lg text-on-surface-variant mt-1 md:mt-xs">
              用积分直接购买卡片！
            </p>
          </div>

          <div className="bg-tertiary-fixed border-2 border-on-tertiary-fixed rounded-xl px-4 md:px-6 py-2 md:py-3 flex items-center gap-1 md:gap-sm shadow-[3px_3px_0px_0px_#221b00] md:shadow-[4px_4px_0px_0px_#221b00] transform hover:-translate-y-1 transition-transform self-start">
            <div className="bg-surface-container-lowest rounded-full p-1 border-2 border-on-tertiary-fixed">
              <span className="material-symbols-outlined text-tertiary symbol-filled text-sm md:text-base">stars</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-bold text-[8px] md:text-label-bold text-on-tertiary-fixed-variant uppercase tracking-wider">余额</span>
              <span className="font-headline-md text-sm md:text-headline-lg text-on-tertiary-fixed leading-none">
                {user?.coins?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </section>

        {/* 背包库存 */}
        <div className="bg-surface-container-low rounded-xl border-2 border-outline-variant p-3 md:p-4 shadow-[2px_2px_0px_0px_rgba(136,113,120,0.1)]">
          <h3 className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest mb-2">背包库存</h3>
          <div className="flex gap-3 md:gap-4">
            {['N', 'R', 'SR', 'SSR', 'UR'].map(r => (
              <div key={r} className="text-center">
                <span className={`inline-block text-[10px] md:text-xs font-black text-white px-2 py-0.5 rounded-full ${RARITY_BG[r] || 'bg-gray-500'} mb-0.5`}>{r}</span>
                <p className="font-headline-md text-sm md:text-lg text-on-surface">{inventory[r] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 商品列表 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Object.entries(SHOP_CONFIG).map(([rarity, config]) => {
            const canAfford = (user?.coins ?? 0) >= config.price;
            const isBuying = buying === rarity;
            return (
              <article
                key={rarity}
                className={`bg-surface-container-lowest border-[3px] ${config.border} rounded-2xl p-4 flex flex-col gap-3 relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${config.glow}`}
              >
                {/* 稀有度角标 */}
                <span className={`absolute top-3 right-3 text-[10px] font-black text-white px-2.5 py-0.5 rounded-full ${RARITY_BG[rarity]}`}>
                  {rarity}
                </span>

                {/* 卡片预览 */}
                <div className={`w-full aspect-[3/4] rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center relative overflow-hidden`}>
                  <span className="text-5xl md:text-6xl font-black text-white/30">{rarity}</span>
                  <div className="absolute inset-0 border-[3px] border-white/10 rounded-xl pointer-events-none" />
                </div>

                <div>
                  <h3 className="font-headline-md text-sm md:text-base text-on-surface">{config.name}</h3>
                  <p className="font-body-md text-[11px] md:text-xs text-on-surface-variant">{config.desc}</p>
                </div>

                <div className="flex justify-between items-center mt-auto pt-2 border-t-2 border-outline-variant border-dashed">
                  <div className="flex items-center gap-1 text-primary font-label-bold text-sm md:text-base">
                    <span className="material-symbols-outlined text-sm symbol-filled">stars</span>
                    {config.price.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleBuy(rarity)}
                    disabled={!canAfford || isBuying}
                    className={`font-button-text text-xs md:text-sm px-4 py-1.5 rounded-full border-2 transition-all ${
                      canAfford && !isBuying
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed border-on-tertiary-fixed shadow-[2px_2px_0px_0px_#221b00] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
                        : 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isBuying ? (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                        购买中
                      </span>
                    ) : canAfford ? '购买' : '积分不足'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* 最近购买结果 */}
        {lastResult && (
          <section className="bg-surface rounded-xl border-4 border-primary-fixed p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)]">
            <h3 className="font-label-bold text-xs text-primary uppercase tracking-widest mb-3">最近购买</h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center overflow-hidden border-2 border-outline-variant">
                {lastResult?.imageUrl ? (
                  <img src={lastResult.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">image</span>
                )}
              </div>
              <div>
                <p className="font-headline-md text-sm text-on-surface">购买成功！</p>
                <p className="font-body-md text-xs text-on-surface-variant">卡片已添加到背包</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav activeTab="商店" />

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
