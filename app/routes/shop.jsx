import { useState } from 'react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

const CATEGORIES = [
  { id: 'featured', label: 'Featured Limited' },
  { id: 'materials', label: 'Upgrade Materials' },
  { id: 'shards', label: 'Character Shards' },
  { id: 'consumables', label: 'Consumables' },
];

const SHOP_ITEMS = [
  { id: 1, category: 'featured', rarity: 'SSR', name: 'Radiant Sunblade', limit: '1/1 per account', price: 5000, badge: 'SSR Relic', badgeColor: 'bg-error text-on-error border-on-error-container' },
  { id: 2, category: 'materials', rarity: 'SR', name: 'Azure Core Gem', limit: '10/10 weekly', price: 450, badge: 'Material', badgeColor: 'bg-secondary text-on-secondary border-on-secondary-fixed' },
  { id: 3, category: 'shards', rarity: 'SR', name: "Kael's Memory x5", limit: '20/20 monthly', price: 1200, badge: 'SR Shard', badgeColor: 'bg-tertiary text-on-tertiary border-on-tertiary-fixed' },
  { id: 4, category: 'consumables', rarity: 'R', name: 'Stamina Elixir', limit: 'Unlimited', price: 150, badge: null },
  { id: 5, category: 'featured', rarity: 'UR', name: 'Celestial Wing', limit: '1/1 per account', price: 10000, badge: 'UR Relic', badgeColor: 'bg-error text-on-error border-on-error-container' },
  { id: 6, category: 'materials', rarity: 'R', name: 'Crystal Shard', limit: '50/50 weekly', price: 200, badge: 'Material', badgeColor: 'bg-secondary text-on-secondary border-on-secondary-fixed' },
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
      {/* FX Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary-fixed-dim/30 blur-3xl" />
        <div className="absolute bottom-[20%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-secondary-fixed-dim/20 blur-3xl" />
      </div>

      <Header activeTab="商店" />

      <main className="relative z-10 max-w-7xl mx-auto px-gutter md:px-margin pt-[80px] pb-[100px] md:pb-lg flex flex-col gap-md">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-md mt-md">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface drop-shadow-[2px_2px_0px_#e3e2e7]">
              Exchange Shop
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
              Trade your Astral Dust for exclusive items!
            </p>
          </div>

          {/* Points Balance */}
          <div className="bg-tertiary-fixed border-2 border-on-tertiary-fixed rounded-xl px-6 py-3 flex items-center gap-sm shadow-[4px_4px_0px_0px_#221b00] transform hover:-translate-y-1 transition-transform">
            <div className="bg-surface-container-lowest rounded-full p-1 flex items-center justify-center border-2 border-on-tertiary-fixed">
              <span className="material-symbols-outlined text-tertiary symbol-filled">stars</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-bold text-label-bold text-on-tertiary-fixed-variant uppercase tracking-wider text-[10px]">
                Astral Dust Balance
              </span>
              <span className="font-headline-lg text-headline-lg text-on-tertiary-fixed leading-none">
                {user?.coins?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <nav className="flex gap-sm overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 font-label-bold text-label-bold px-6 py-3 rounded-full border-[3px] transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-on-primary border-on-primary-fixed shadow-[3px_3px_0px_0px_#3e0020] -translate-y-1'
                  : 'bg-surface-container-lowest text-primary border-primary-fixed-dim hover:border-primary hover:bg-primary-fixed hover:-translate-y-1 hover:shadow-[3px_3px_0px_0px_#ffb0cb]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Marketplace Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md md:gap-lg mt-sm">
          {filteredItems.map(item => (
            <article
              key={item.id}
              className="bg-surface-container-lowest border-[3px] border-outline-variant rounded-xl p-3 flex flex-col gap-sm relative transition-all duration-200 hover:-translate-y-2 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_#ff77af] group"
            >
              {item.badge && (
                <div className={`absolute top-1 left-1 z-10 font-label-bold text-[10px] px-3 py-1 rounded-full border-2 uppercase tracking-widest shadow-[2px_2px_0px_0px_#3e0020] ${item.badgeColor}`}>
                  {item.badge}
                </div>
              )}

              <div className="w-full aspect-square bg-gradient-to-br from-primary-fixed to-secondary-fixed rounded-lg relative overflow-hidden border-2 border-surface-variant flex items-center justify-center p-4">
                <div className="w-16 h-16 rounded-full bg-surface-container border-4 border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary symbol-filled">diamond</span>
                </div>
              </div>

              <div className="flex flex-col flex-grow px-1">
                <h3 className="font-headline-md text-headline-md text-on-surface line-clamp-1">{item.name}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-[12px] mt-xs">Limit: {item.limit}</p>
              </div>

              <div className="flex justify-between items-center mt-auto pt-2 border-t-2 border-surface-variant border-dashed">
                <div className="flex items-center gap-1 text-primary font-label-bold text-label-bold text-lg">
                  <span className="material-symbols-outlined text-[20px] symbol-filled">stars</span>
                  {item.price.toLocaleString()}
                </div>
                <button
                  onClick={() => handlePurchase(item.id)}
                  className="bg-tertiary-fixed text-on-tertiary-fixed font-button-text text-button-text px-4 py-2 rounded-full border-2 border-on-tertiary-fixed shadow-[3px_3px_0px_0px_#221b00] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all active:scale-95"
                >
                  Purchase
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
