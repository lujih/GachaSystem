import { Link, useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';

const NAV_ITEMS = [
  { to: '/synthesis', icon: 'science', label: '合成' },
  { to: '/games', icon: 'videogame_asset', label: '游戏' },
  { to: '/library', icon: 'style', label: '图鉴' },
  { to: '/', icon: 'home', label: '大厅' },
  { to: '/shop', icon: 'storefront', label: '商店' },
];

export default function Header({ activeTab = '大厅' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 py-3 bg-white/90 backdrop-blur-xl border-b-4 border-primary-fixed shadow-[0px_4px_0px_0px_rgba(255,119,175,0.2)]">
      <div className="flex items-center gap-2 md:gap-4">
        <Link to="/" className="no-underline">
          <h1 className="font-headline-lg text-lg md:text-display-lg italic text-primary-container drop-shadow-[2px_2px_0px_rgba(255,119,175,0.4)] truncate max-w-[130px] md:max-w-none">
            KiraKira Gacha
          </h1>
          <span className="hidden md:inline text-[10px] text-on-surface-variant/50 font-label-bold -ml-1 mt-2 tracking-widest">〜カードコレクション〜</span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-8 items-center bg-surface-container-low px-6 py-2 rounded-full border-2 border-outline-variant shadow-[2px_2px_0px_0px_rgba(136,113,120,0.2)]">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.label}
            to={item.to}
            className={`font-label-bold text-label-bold flex items-center gap-2 transition-transform hover:scale-105 no-underline ${
              activeTab === item.label
                ? 'text-primary border-b-4 border-primary pb-1 -mb-1'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className={`material-symbols-outlined ${activeTab === item.label ? 'symbol-filled text-primary' : ''}`}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Currency Display - always visible on mobile */}
        {user && (
          <div className="flex bg-surface-container py-1.5 md:py-2 px-2 md:px-4 rounded-full border border-outline-variant items-center gap-1 md:gap-2 shadow-[2px_2px_0px_0px_rgba(136,113,120,0.2)]">
            <span className="material-symbols-outlined text-tertiary-container symbol-filled text-sm md:text-base">monetization_on</span>
            <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user.coins?.toLocaleString() || '0'}</span>
          </div>
        )}

        {user ? (
          <button
            onClick={logout}
            className="text-on-surface-variant hover:scale-105 transition-transform hover:text-primary p-1.5 md:p-2"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-on-primary font-label-bold text-xs md:text-label-bold px-4 md:px-6 py-1.5 md:py-2 rounded-full border-2 border-on-primary-container shadow-[2px_2px_0px_0px_rgba(119,1,67,0.4)] md:shadow-[4px_4px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] md:hover:translate-x-[4px] md:hover:translate-y-[4px] transition-all whitespace-nowrap"
          >
            登录
          </button>
        )}
      </div>
    </header>
  );
}
