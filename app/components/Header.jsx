import { Link, useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Chouka
            </span>
            <span className="text-gray-800 ml-1">抽卡</span>
          </h1>
        </Link>

        <nav className="flex items-center gap-3">
          <Link to="/library">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-indigo-600">
              图库
            </Button>
          </Link>

          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 no-underline">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {(user.nickname || user.username || '?')[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                  {user.nickname || user.username}
                </span>
                {user.title && (
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                    {user.title.name}
                  </Badge>
                )}
              </Link>

              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200">
                <span className="text-sm">🪙</span>
                <span className="text-xs font-bold text-amber-700">{user.coins}</span>
              </div>

              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                Lv.{user.level}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-500 hover:text-red-500"
              >
                退出
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate('/login')}
              className="gradient-primary text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
            >
              登录
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
