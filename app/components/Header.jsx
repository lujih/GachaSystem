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
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-3 bg-white/90 backdrop-blur-xl border-b-4 border-primary-fixed shadow-[0px_4px_0px_0px_rgba(255,119,175,0.2)]">
      <div className="flex items-center gap-4">
        <Link to="/" className="no-underline">
          <h1 className="font-headline-lg text-display-lg italic text-primary-container drop-shadow-[2px_2px_0px_rgba(255,119,175,0.4)]">
            KiraKira Gacha
          </h1>
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

      <div className="flex items-center gap-4">
        {/* Currency Display */}
        {user && (
          <div className="hidden md:flex bg-surface-container py-2 px-4 rounded-full border-2 border-outline-variant items-center gap-4 shadow-[2px_2px_0px_0px_rgba(136,113,120,0.2)]">
            <div className="flex items-center gap-1 font-label-bold text-label-bold text-on-surface">
              <span className="material-symbols-outlined text-tertiary-container symbol-filled">monetization_on</span>
              {user.coins?.toLocaleString() || '0'}
            </div>
          </div>
        )}

        <button className="text-on-surface-variant hover:scale-105 transition-transform hover:text-primary p-2">
          <span className="material-symbols-outlined">settings</span>
        </button>

        {user ? (
          <button
            onClick={logout}
            className="text-on-surface-variant hover:scale-105 transition-transform hover:text-primary p-2"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-on-primary font-label-bold text-label-bold px-6 py-2 rounded-full border-2 border-on-primary-container shadow-[4px_4px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            登录
          </button>
        )}
      </div>
    </header>
  );
}
