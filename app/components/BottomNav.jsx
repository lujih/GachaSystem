import { Link } from '@remix-run/react';

const NAV_ITEMS = [
  { to: '/synthesis', icon: 'science', label: 'Synth' },
  { to: '/games', icon: 'videogame_asset', label: 'Games' },
  { to: '/', icon: 'home', label: 'Lobby' },
  { to: '/library', icon: 'style', label: 'Gallery' },
  { to: '/shop', icon: 'storefront', label: 'Shop' },
];

export default function BottomNav({ activeTab = 'Lobby' }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-end pb-6 pt-2 px-4 bg-white rounded-t-[32px] border-t-4 border-primary-fixed shadow-[0_-8px_20px_rgba(255,119,175,0.15)]">
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
