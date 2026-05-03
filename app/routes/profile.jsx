import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { api } from '~/lib/api';

export function loader() {
  return null;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-surface relative">
        <Header />
        <main className="max-w-7xl mx-auto px-4 md:px-margin pt-[72px] md:pt-[100px] pb-[100px] md:pb-12">
          <div className="text-center py-12 md:py-20">
            <p className="text-4xl md:text-5xl mb-4">👤</p>
            <p className="text-on-surface-variant mb-4">请先登录</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary text-on-primary font-button-text text-sm md:text-button-text px-6 md:px-8 py-2 md:py-3 rounded-full border-2 border-on-primary-container shadow-[4px_4px_0px_0px_rgba(119,1,67,0.4)]"
            >
              登录
            </button>
          </div>
        </main>
        <BottomNav activeTab="Profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative overflow-x-hidden">
      <div className="fixed inset-0 bg-halftone opacity-30 pointer-events-none z-0" />
      <div className="fixed top-[-10%] right-[-5%] w-48 md:w-96 h-48 md:h-96 bg-primary-fixed rounded-full blur-[60px] md:blur-[100px] opacity-60 pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-48 md:w-96 h-48 md:h-96 bg-secondary-fixed rounded-full blur-[60px] md:blur-[100px] opacity-60 pointer-events-none z-0" />

      <Header activeTab="Profile" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-margin pt-[72px] md:pt-[100px] pb-[100px] md:pb-12 flex flex-col gap-4 md:gap-8">
        <section className="relative w-full mt-2 md:mt-6">
          <div className="absolute inset-0 bg-primary translate-x-1 md:translate-x-2 translate-y-1 md:translate-y-2 rounded-2xl md:rounded-[32px]" />
          <div className="relative bg-surface-container-lowest border-[2px] md:border-[3px] border-primary rounded-2xl md:rounded-[32px] overflow-hidden flex flex-col md:flex-row items-center p-4 md:p-10 gap-4 md:gap-8">
            <div className="relative w-24 h-24 md:w-64 md:h-64 flex-shrink-0 group">
              <div className="absolute inset-0 bg-secondary rounded-full translate-x-1 md:translate-x-2 translate-y-1 md:translate-y-2 group-hover:translate-x-2 group-hover:translate-y-2 md:group-hover:translate-x-3 md:group-hover:translate-y-3 transition-transform" />
              <div className="relative w-full h-full rounded-full border-4 border-secondary overflow-hidden bg-surface-variant flex items-center justify-center z-10">
                <div className="text-3xl md:text-8xl font-black text-primary-container">
                  {(user.nickname || user.username || '?')[0].toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-2 right-2 md:right-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-tertiary translate-x-1 translate-y-1 rounded-full" />
                  <div className="relative bg-tertiary-fixed text-on-tertiary-fixed font-label-bold text-[10px] md:text-label-bold px-2 md:px-4 py-1 md:py-2 rounded-full border-2 border-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm md:text-[16px]">military_tech</span>
                    LV. {user.level}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-grow w-full flex flex-col justify-center gap-2 md:gap-4">
              <div className="text-center md:text-left">
                <h1 className="font-headline-lg md:text-display-lg text-display-lg text-on-surface mb-1 drop-shadow-sm">
                  {user.nickname || user.username}
                </h1>
                <p className="font-body-md text-xs md:text-body-md text-outline flex items-center justify-center md:justify-start gap-1 md:gap-2">
                  <span className="material-symbols-outlined text-sm md:text-[18px]">id_card</span>
                  UID: {user.id}
                </p>
              </div>

              <div className="w-full mt-2 md:mt-4">
                <div className="flex justify-between items-end mb-1 md:mb-2">
                  <span className="font-label-bold text-[10px] md:text-label-bold text-primary">经验进度</span>
                  <span className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant">
                    {user.exp?.toLocaleString() || '0'} / {user.required_exp_next?.toLocaleString() || '0'} XP
                  </span>
                </div>
                <div className="relative h-5 md:h-8 bg-surface-container-highest rounded-full border-2 border-outline overflow-hidden shadow-inner">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out"
                    style={{ width: `${user.level_progress || 0}%` }}
                  />
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 shimmer pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-2 md:mt-4">
          <StatCard icon="stars" label="总抽卡" value={user.drawCount?.toLocaleString() || '0'} color="secondary" />
          <StatCard icon="workspace_premium" label="SSR 计数" value="47" color="primary" />
          <StatCard icon="auto_awesome" label="满级角色" value="15" color="tertiary" />
        </section>

        <section className="mt-4 md:mt-8">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-on-surface mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
            <span className="material-symbols-outlined text-primary text-2xl md:text-[32px] symbol-filled">emoji_events</span>
            成就徽章
          </h2>
          <div className="bg-white/40 backdrop-blur-xl border-2 border-outline-variant rounded-2xl md:rounded-[32px] p-4 md:p-6 shadow-[0_8px_32px_rgba(166,48,103,0.1)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Ribbon icon="local_fire_department" label="Pyromancer" color="error" />
              <Ribbon icon="water_drop" label="Aqua Heart" color="secondary" />
              <Ribbon icon="electric_bolt" label="Flash Step" color="tertiary" />
              <Ribbon icon="favorite" label="Idol Status" color="primary" />
            </div>
          </div>
        </section>

        <section className="mt-3 md:mt-4">
          <button
            onClick={async () => {
              try {
                await api.checkIn();
                await refreshUser();
              } catch (e) {}
            }}
            className="w-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-sm md:text-button-text text-[24px] py-3 md:py-md rounded-full border-4 border-on-tertiary-fixed shadow-[0px_6px_0px_0px_#221b00] md:shadow-[0px_8px_0px_0px_#221b00] hover:translate-y-[3px] hover:shadow-[0px_3px_0px_0px_#221b00] active:translate-y-[6px] active:shadow-none transition-all relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-1 md:gap-xs">
              <span className="material-symbols-outlined text-xl md:text-[28px] symbol-filled">calendar_today</span>
              每日签到
            </span>
          </button>
        </section>
      </main>

      <BottomNav activeTab="Profile" />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="relative group">
      <div className={`absolute inset-0 bg-${color} translate-x-1 translate-y-1 md:translate-x-1.5 md:translate-y-1.5 rounded-2xl md:rounded-[24px] transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5 md:group-hover:translate-x-2 md:group-hover:translate-y-2`} />
      <div className={`relative bg-${color}-container rounded-2xl md:rounded-[24px] border-[2px] md:border-[3px] border-${color} p-4 md:p-6 flex flex-col h-full z-10 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 md:group-hover:-translate-y-1 md:group-hover:-translate-x-1 transition-transform`}>
        <div className={`bg-${color} text-on-${color} w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 md:mb-4 border-2 border-on-${color}-container`}>
          <span className="material-symbols-outlined text-base md:text-lg symbol-filled">{icon}</span>
        </div>
        <h3 className={`font-label-bold text-[10px] md:text-label-bold text-on-${color}-container uppercase tracking-widest mb-0.5 md:mb-1 opacity-80`}>
          {label}
        </h3>
        <div className={`font-headline-lg md:text-display-lg text-display-lg text-on-${color}-container drop-shadow-sm`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Ribbon({ icon, label, color }) {
  return (
    <div className="bg-surface border-2 border-outline rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center gap-1.5 md:gap-3 hover:-translate-y-1 md:hover:-translate-y-2 transition-transform shadow-[2px_2px_0_#e3e2e7] md:shadow-[4px_4px_0_#e3e2e7]">
      <div className={`w-10 h-10 md:w-14 md:h-14 bg-${color}-container rounded-full flex items-center justify-center border-2 border-${color}`}>
        <span className={`material-symbols-outlined text-lg md:text-[28px] text-${color} symbol-filled`}>{icon}</span>
      </div>
      <span className="font-label-bold text-[10px] md:text-label-bold text-center text-on-surface">{label}</span>
    </div>
  );
}
