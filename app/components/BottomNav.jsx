import { Link } from '@remix-run/react';

const NAV_ITEMS = [
  { to: '/synthesis', icon: 'science', label: '合成' },
  { to: '/games', icon: 'videogame_asset', label: '游戏' },
  { to: '/', icon: 'home', label: '大厅' },
  { to: '/library', icon: 'style', label: '图鉴' },
  { to: '/shop', icon: 'storefront', label: '商店' },
];

export default function BottomNav({ activeTab = '大厅' }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-end pb-4 pt-2 px-2 bg-white rounded-t-2xl border-t-4 border-primary-fixed shadow-[0_-4px_16px_rgba(255,119,175,0.15)]">
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.label;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all no-underline ${
              isActive
                ? 'bg-primary text-white shadow-[4px_4px_0px_0px_rgba(255,235,59,1)] -translate-y-2'
                : 'text-on-surface-variant hover:bg-primary-fixed/20'
            }`}
          >
            <span className={`material-symbols-outlined mb-1 ${isActive ? 'symbol-filled' : ''}`}>
              {item.icon}
            </span>
            <span className="font-['Plus_Jakarta_Sans'] text-[10px] font-extrabold uppercase tracking-widest">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
