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
        <main className="max-w-7xl mx-auto px-gutter md:px-margin pt-[100px] pb-[120px]">
          <div className="text-center py-20">
            <p className="text-5xl mb-4">👤</p>
            <p className="text-on-surface-variant mb-4">Please login first</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary text-on-primary font-button-text text-button-text px-8 py-3 rounded-full border-2 border-on-primary-container shadow-[4px_4px_0px_0px_rgba(119,1,67,0.4)]"
            >
              Login
            </button>
          </div>
        </main>
        <BottomNav activeTab="Profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative overflow-x-hidden">
      {/* Decorative Background */}
      <div className="fixed inset-0 bg-halftone opacity-30 pointer-events-none z-0" />
      <div className="fixed top-[-10%] right-[-5%] w-96 h-96 bg-primary-fixed rounded-full blur-[100px] opacity-60 pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-96 h-96 bg-secondary-fixed rounded-full blur-[100px] opacity-60 pointer-events-none z-0" />

      <Header activeTab="Profile" />

      <main className="relative z-10 max-w-7xl mx-auto px-gutter md:px-margin pt-[100px] pb-[120px] flex flex-col gap-8">
        {/* Hero Section */}
        <section className="relative w-full mt-6">
          <div className="absolute inset-0 bg-primary translate-x-2 translate-y-2 rounded-[32px]" />
          <div className="relative bg-surface-container-lowest border-[3px] border-primary rounded-[32px] overflow-hidden flex flex-col md:flex-row items-center p-6 md:p-10 gap-8">
            {/* Avatar */}
            <div className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0 group">
              <div className="absolute inset-0 bg-secondary rounded-full translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
              <div className="relative w-full h-full rounded-full border-4 border-secondary overflow-hidden bg-surface-variant flex items-center justify-center z-10">
                <div className="text-8xl font-black text-primary-container">
                  {(user.nickname || user.username || '?')[0].toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-2 right-4 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-tertiary translate-x-1 translate-y-1 rounded-full" />
                  <div className="relative bg-tertiary-fixed text-on-tertiary-fixed font-label-bold text-label-bold px-4 py-2 rounded-full border-2 border-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">military_tech</span>
                    LV. {user.level}
                  </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-grow w-full flex flex-col justify-center gap-4">
              <div>
                <h1 className="font-display-lg text-display-lg text-on-surface mb-1 drop-shadow-sm">
                  {user.nickname || user.username}
                </h1>
                <p className="font-body-md text-body-md text-outline flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">id_card</span>
                  UID: {user.id}
                </p>
              </div>

              {/* XP Bar */}
              <div className="w-full mt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-label-bold text-label-bold text-primary">Mastery Rank Progress</span>
                  <span className="font-label-bold text-label-bold text-on-surface-variant">
                    {user.exp?.toLocaleString() || '0'} / {user.required_exp_next?.toLocaleString() || '0'} XP
                  </span>
                </div>
                <div className="relative h-8 bg-surface-container-highest rounded-full border-2 border-outline overflow-hidden shadow-inner">
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

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <StatCard
            icon="stars"
            label="Total Pulls"
            value={user.drawCount?.toLocaleString() || '0'}
            color="secondary"
          />
          <StatCard
            icon="workspace_premium"
            label="SSR Counter"
            value="47"
            color="primary"
          />
          <StatCard
            icon="auto_awesome"
            label="Maxed Units"
            value="15"
            color="tertiary"
          />
        </section>

        {/* Achievements */}
        <section className="mt-8">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px] symbol-filled">emoji_events</span>
            Combat Ribbons
          </h2>
          <div className="bg-white/40 backdrop-blur-xl border-2 border-outline-variant rounded-[32px] p-6 shadow-[0_8px_32px_rgba(166,48,103,0.1)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Ribbon icon="local_fire_department" label="Pyromancer" color="error" />
              <Ribbon icon="water_drop" label="Aqua Heart" color="secondary" />
              <Ribbon icon="electric_bolt" label="Flash Step" color="tertiary" />
              <Ribbon icon="favorite" label="Idol Status" color="primary" />
            </div>
          </div>
        </section>

        {/* Check-in */}
        <section className="mt-4">
          <button
            onClick={async () => {
              try {
                await api.checkIn();
                await refreshUser();
              } catch (e) {}
            }}
            className="w-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-button-text text-[24px] py-md rounded-full border-4 border-on-tertiary-fixed shadow-[0px_8px_0px_0px_#221b00] hover:translate-y-[4px] hover:shadow-[0px_4px_0px_0px_#221b00] active:translate-y-[8px] active:shadow-none transition-all relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-xs">
              <span className="material-symbols-outlined text-[28px] symbol-filled">calendar_today</span>
              Daily Check-in
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
      <div className={`absolute inset-0 bg-${color} translate-x-1.5 translate-y-1.5 rounded-[24px] transition-transform group-hover:translate-x-2 group-hover:translate-y-2`} />
      <div className={`relative bg-${color}-container rounded-[24px] border-[3px] border-${color} p-6 flex flex-col h-full z-10 group-hover:-translate-y-1 group-hover:-translate-x-1 transition-transform`}>
        <div className={`bg-${color} text-on-${color} w-12 h-12 rounded-full flex items-center justify-center mb-4 border-2 border-on-${color}-container`}>
          <span className="material-symbols-outlined symbol-filled">{icon}</span>
        </div>
        <h3 className={`font-label-bold text-label-bold text-on-${color}-container uppercase tracking-widest mb-1 opacity-80`}>
          {label}
        </h3>
        <div className={`font-display-lg text-display-lg text-on-${color}-container drop-shadow-sm`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Ribbon({ icon, label, color }) {
  return (
    <div className="bg-surface border-2 border-outline rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:-translate-y-2 transition-transform shadow-[4px_4px_0_#e3e2e7]">
      <div className={`w-14 h-14 bg-${color}-container rounded-full flex items-center justify-center border-2 border-${color}`}>
        <span className={`material-symbols-outlined text-${color} text-[28px] symbol-filled`}>{icon}</span>
      </div>
      <span className="font-label-bold text-label-bold text-center text-on-surface">{label}</span>
    </div>
  );
}
