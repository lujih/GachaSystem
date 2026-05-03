import { useState } from 'react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

const CATEGORIES = [
  { id: 'featured', label: '限定特卖' },
  { id: 'materials', label: '升级材料' },
  { id: 'shards', label: '角色碎片' },
  { id: 'consumables', label: '消耗品' },
];

const SHOP_ITEMS = [
  { id: 1, category: 'featured', rarity: 'SSR', name: '光辉圣剑', limit: '每个账号限1个', price: 5000, badge: 'SSR 遗物', badgeColor: 'bg-error text-on-error border-on-error-container' },
  { id: 2, category: 'materials', rarity: 'SR', name: '蔚蓝核心晶石', limit: '每周10/10', price: 450, badge: '材料', badgeColor: 'bg-secondary text-on-secondary border-on-secondary-fixed' },
  { id: 3, category: 'shards', rarity: 'SR', name: '凯尔的记忆 x5', limit: '每月20/20', price: 1200, badge: 'SR 碎片', badgeColor: 'bg-tertiary text-on-tertiary border-on-tertiary-fixed' },
  { id: 4, category: 'consumables', rarity: 'R', name: '体力药剂', limit: '不限量', price: 150, badge: null },
  { id: 5, category: 'featured', rarity: 'UR', name: '天界之翼', limit: '每个账号限1个', price: 10000, badge: 'UR 遗物', badgeColor: 'bg-error text-on-error border-on-error-container' },
  { id: 6, category: 'materials', rarity: 'R', name: '水晶碎片', limit: '每周50/50', price: 200, badge: '材料', badgeColor: 'bg-secondary text-on-secondary border-on-secondary-fixed' },
];

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState('featured');

  const filteredItems = SHOP_ITEMS.filter(item => item.category === activeCategory);

  async function handlePurchase(itemId) {
    try {
      await api.shopBuy(itemId);
      await refreshUser();
    } catch (e) {}
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden font-body-md text-body-md">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary-fixed-dim/30 blur-3xl" />
        <div className="absolute bottom-[20%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-secondary-fixed-dim/20 blur-3xl" />
      </div>

      <Header activeTab="商店" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-margin pt-[72px] md:pt-[80px] pb-[100px] md:pb-md flex flex-col gap-4 md:gap-md">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-md mt-2 md:mt-md">
          <div>
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-on-surface drop-shadow-[2px_2px_0px_#e3e2e7]">
              兑换商店
            </h1>
            <p className="font-body-md text-xs md:text-body-lg text-on-surface-variant mt-1 md:mt-xs">
              用星尘兑换专属物品！
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

        <nav className="flex gap-1 md:gap-sm overflow-x-auto no-scrollbar py-1 md:py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 font-label-bold text-[10px] md:text-label-bold px-3 md:px-6 py-2 md:py-3 rounded-full border-[2px] md:border-[3px] transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-on-primary border-on-primary-fixed shadow-[2px_2px_0px_0px_#3e0020] md:shadow-[3px_3px_0px_0px_#3e0020] -translate-y-1'
                  : 'bg-surface-container-lowest text-primary border-primary-fixed-dim hover:border-primary hover:bg-primary-fixed hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_#ffb0cb] md:hover:shadow-[3px_3px_0px_0px_#ffb0cb]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-md md:gap-lg mt-1 md:mt-sm">
          {filteredItems.map(item => (
            <article
              key={item.id}
              className="bg-surface-container-lowest border-[2px] md:border-[3px] border-outline-variant rounded-xl p-2 md:p-3 flex flex-col gap-1 md:gap-sm relative transition-all duration-200 hover:-translate-y-2 hover:translate-x-1 hover:shadow-[4px_4px_0px_0px_#ff77af] md:hover:shadow-[6px_6px_0px_0px_#ff77af] group"
            >
              {item.badge && (
                <div className={`absolute top-1 left-1 z-10 font-label-bold text-[8px] md:text-[10px] px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border-2 uppercase tracking-widest shadow-[2px_2px_0px_0px_#3e0020] ${item.badgeColor}`}>
                  {item.badge}
                </div>
              )}

              <div className="w-full aspect-square bg-gradient-to-br from-primary-fixed to-secondary-fixed rounded-lg relative overflow-hidden border-2 border-surface-variant flex items-center justify-center p-3 md:p-4">
                <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-surface-container border-2 md:border-4 border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl md:text-4xl text-primary symbol-filled">diamond</span>
                </div>
              </div>

              <div className="flex flex-col flex-grow px-0.5 md:px-1">
                <h3 className="font-headline-md text-xs md:text-headline-md text-on-surface line-clamp-1">{item.name}</h3>
                <p className="font-body-md text-[10px] md:text-body-md text-on-surface-variant mt-0.5 md:mt-xs">限制: {item.limit}</p>
              </div>

              <div className="flex justify-between items-center mt-auto pt-1 md:pt-2 border-t-2 border-surface-variant border-dashed">
                <div className="flex items-center gap-0.5 md:gap-1 text-primary font-label-bold text-xs md:text-label-bold text-lg">
                  <span className="material-symbols-outlined text-sm md:text-[20px] symbol-filled">stars</span>
                  {item.price.toLocaleString()}
                </div>
                <button
                  onClick={() => handlePurchase(item.id)}
                  className="bg-tertiary-fixed text-on-tertiary-fixed font-button-text text-[10px] md:text-button-text px-2 md:px-4 py-1 md:py-2 rounded-full border-2 border-on-tertiary-fixed shadow-[2px_2px_0px_0px_#221b00] md:shadow-[3px_3px_0px_0px_#221b00] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-95"
                >
                  购买
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>

      <BottomNav activeTab="商店" />
    </div>
  );
}
