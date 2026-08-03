import { useLoaderData, useRevalidator, useRouteError } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { useGacha } from '~/hooks/useGacha';
import DrawResultDialog from '~/components/DrawResultDialog';
import Toast from '~/components/Toast';
import { api } from '~/lib/api';
import { rarityBg, rarityBorder, rarityGlow } from '~/lib/rarity';

const POOL_CONFIG = {
  limited: { name: '限定池', cost: 500, multiCost: 4500, desc: '概率 UP! · 当期角色精选 · 十连9折', tag: '概率 UP!' },
  permanent: { name: '常驻池', cost: 100, multiCost: 900, desc: '标准卡池 · 概率均等 · 十连9折', tag: null },
};

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export async function loader({ request, context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { showcase: [], announcement: null, drawHistory: [] };
  }

  // 并行查询 gallery 和公告（公告权威存储在 D1 announcements 表）
  const [showcaseResult, announcement] = await Promise.all([
    env.DB.prepare(
      'SELECT g.*, u.username FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
    ).all().catch(e => { console.error('[loader] showcase failed:', e); return { results: [] }; }),
    env.DB.prepare(
      'SELECT title, content, enabled, updated_at FROM announcements WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 1'
    ).first().catch(() => null)
  ]);

  return { showcase: showcaseResult.results || [], announcement: announcement || null };
}

export default function Index() {
  const { showcase, announcement } = useLoaderData();
  const { user, refreshUser } = useAuth();
  const [drawHistory, setDrawHistory] = useState([]);

  // 客户端拉取抽卡历史（SSR 时无法获取 token，需客户端独立拉取）
  useEffect(() => {
    if (!user) { setDrawHistory([]); return; }
    api.getDrawHistory(1)
      .then(res => { if (res?.history) setDrawHistory(res.history.slice(0, 10)); })
      .catch(() => {});
  }, [user?.id]);
  const { drawing, draw, multiDraw, drawLimited, clearDraw } = useGacha();
  const revalidator = useRevalidator();
  const [poolType, setPoolType] = useState('limited');
  const [drawResult, setDrawResult] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissedAnnId, setDismissedAnnId] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem('dismissedAnnouncement') : null
  );
  const [defaultPoolId, setDefaultPoolId] = useState(null);
  const [toast, setToast] = useState(null);

  // 获取限定池列表
  useEffect(() => {
    if (!user) return;
    api.getLimitedPools()
      .then(res => { if (res.defaultPool) setDefaultPoolId(res.defaultPool); })
      .catch(() => {});
  }, [user?.id]);

  const pool = POOL_CONFIG[poolType];
  const ssrPity = user?.ssrPity ?? 0;
  const urPity = user?.urPity ?? 0;
  const ssrAt = user?.ssrPityAt ?? 15;
  const urAt = user?.urPityAt ?? 80;

  function showToast(message, type = 'info') {
    setToast({ message, type, key: Date.now() });
  }

  async function handleDraw(type) {
    if (drawing) return;
    clearDraw();
    try {
      let result;
      if (poolType === 'limited') {
        result = await drawLimited(defaultPoolId || 'genshin', type === 'multi' ? 10 : 1);
      } else if (type === 'multi') {
        result = await multiDraw(10);
      } else {
        result = await draw();
      }
      setDrawResult(result);
      setDialogOpen(true);
    } catch (e) {
      const msg = e?.message || '抽卡失败';
      showToast(msg, 'error');
    }
  }

  async function handleDialogClose() {
    setDialogOpen(false);
    setDrawResult(null);
    clearDraw();
    await refreshUser();
    revalidator.revalidate();
  }

  async function handleCheckIn() {
    try {
      const res = await api.checkIn();
      await refreshUser();
      const bonus = res?.bonus || '';
      showToast(`签到成功！+${res?.checkIn?.coins ?? 150} 金币 +${res?.checkIn?.exp ?? 50} 经验${bonus}`, 'success');
    } catch (e) {
      showToast(e?.message || '签到失败', 'error');
    }
  }

  const todayChecked = useCallback(() => {
    const lastDate = user?.lastLoginAt ? new Date(user.lastLoginAt + 8 * 3600 * 1000).toISOString().slice(0, 10) : null;
    if (!lastDate) return false;
    const beijingNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const todayStr = beijingNow.toISOString().split('T')[0];
    return lastDate === todayStr;
  }, [user?.lastLoginAt]);

  const showAnnouncement = announcement?.title && dismissedAnnId !== String(announcement.updated_at);

  return (
    <div className="min-h-screen bg-anime-sky relative">
      {/* 桜の花びら */}
      <div className="sakura-container" aria-hidden="true">
        <span className="sakura-petal" />
        <span className="sakura-petal" />
        <span className="sakura-petal" />
        <span className="sakura-petal" />
        <span className="sakura-petal" />
      </div>

      <Header activeTab="大厅" />

      <main className="max-w-[1440px] mx-auto w-full px-3 md:px-8 py-4 md:py-12 pt-[72px] md:pt-[88px] pb-[100px] md:pb-8">

        {/* ① 公告横条 */}
        {showAnnouncement && (
          <div className="rise-in rise-in-1 bg-primary-fixed border-b-2 border-primary-container rounded-2xl px-4 md:px-6 py-3 md:py-4 mb-4 md:mb-6 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(255,119,175,0.2)]">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="material-symbols-outlined symbol-filled text-primary">campaign</span>
              <span className="font-label-bold text-sm md:text-label-bold text-on-primary-fixed-variant">{announcement.title}</span>
            </div>
            <button
              onClick={() => {
                const annKey = announcement.updated_at ? String(announcement.updated_at) : 'closed';
                localStorage.setItem('dismissedAnnouncement', annKey);
                setDismissedAnnId(annKey);
              }}
              className="text-on-primary-fixed-variant/60 hover:text-on-primary-fixed-variant p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* ② 用户概览卡片 */}
        {user ? (
          <div className="rise-in rise-in-2 bg-surface-container-low rounded-2xl border-2 border-outline-variant p-3 md:p-4 mb-4 md:mb-6 shadow-[2px_2px_0px_0px_rgba(136,113,120,0.1)]">
            <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-4">
              <div className="flex items-center gap-1.5 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
                <span className="material-symbols-outlined symbol-filled text-tertiary-container text-sm md:text-base">monetization_on</span>
                <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{(user.coins ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
                <span className="material-symbols-outlined symbol-filled text-primary text-sm md:text-base">stars</span>
                <span className="font-label-bold text-xs md:text-label-bold text-on-surface">Lv.{user.level ?? 1}</span>
                <div className="w-14 md:w-20 h-2 bg-surface-variant rounded-full overflow-hidden ml-1">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500" style={{ width: `${user.level_progress ?? 0}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
                <span className="material-symbols-outlined symbol-filled text-secondary text-sm md:text-base">local_fire_department</span>
                <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user.loginStreak ?? 0}天</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
                <span className="material-symbols-outlined symbol-filled text-primary-container text-sm md:text-base">style</span>
                <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user.drawCount ?? 0}抽</span>
              </div>
            </div>
            <div className="mt-2 md:mt-0 md:inline-flex md:ml-auto">
              <button
                onClick={handleCheckIn}
                disabled={todayChecked()}
                className={`w-full md:w-auto font-button-text text-xs md:text-button-text px-5 py-2 rounded-full border-2 transition-all ${
                  todayChecked()
                    ? 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-default'
                    : 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] animate-pulse'
                }`}
              >
                {todayChecked() ? '已签到' : '签到'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rise-in rise-in-2 bg-surface-container-low rounded-2xl border-2 border-outline-variant p-4 md:p-6 mb-4 md:mb-6 text-center">
            <p className="text-on-surface-variant text-sm mb-3">登录后查看个人数据</p>
            <a href="/login" className="inline-block bg-primary text-on-primary font-button-text text-sm px-6 py-2 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all no-underline">
              登录
            </a>
          </div>
        )}

        {/* ③ 池切换 + 抽卡主区域 */}
        <div className="rise-in rise-in-3 relative w-full rounded-2xl md:rounded-[32px] border-4 gacha-border-glow overflow-hidden bg-surface-bright flex flex-col md:flex-row mb-4 md:mb-8">

          {/* 左侧立绘展示区 */}
          <div className="relative w-full md:w-2/3 min-h-[200px] md:min-h-[320px] overflow-hidden">
            <div className={`absolute inset-0 transition-all duration-700 ${
              poolType === 'limited'
                ? 'bg-gradient-to-br from-indigo-900/60 via-purple-700/40 to-pink-500/30'
                : 'bg-gradient-to-br from-sky-900/40 via-indigo-600/30 to-rose-400/30'
            }`} />
            <div className="absolute inset-0 bg-stars opacity-60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.25)_0%,transparent_60%)]" />
            <div className="absolute inset-0 overflow-hidden">
              <span className="absolute top-[12%] left-[18%] text-2xl md:text-3xl animate-[sparkle_2.5s_ease-in-out_infinite] opacity-60 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">✨</span>
              <span className="absolute top-[25%] right-[22%] text-xl md:text-2xl animate-[sparkle_3s_ease-in-out_infinite_0.5s] opacity-40 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">⭐</span>
              <span className="absolute bottom-[35%] left-[30%] text-lg md:text-xl animate-[sparkle_2s_ease-in-out_infinite_1s] opacity-50">💫</span>
              <span className="absolute top-[55%] right-[12%] text-sm md:text-base animate-[sparkle_3.5s_ease-in-out_infinite_0.3s] opacity-50">✨</span>
              <span className="absolute bottom-[20%] right-[35%] text-lg md:text-xl animate-[sparkle_2.8s_ease-in-out_infinite_1.5s] opacity-40">🌟</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-bright via-surface-bright/40 to-transparent md:w-2/3" />

            <div className="absolute bottom-0 left-0 p-5 md:p-10 w-full md:w-auto z-10">
              {pool.tag && (
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-label-bold text-[10px] md:text-label-bold px-3 md:px-5 py-1.5 rounded-full mb-2 md:mb-4 border border-white/30 shadow-lg shadow-pink-500/20">
                  <span>⛩️</span>
                  {pool.tag}
                </div>
              )}
              <h2 className="font-headline-md md:text-display-lg text-display-lg text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5),0_0_30px_rgba(255,255,255,0.2)] mb-1 md:mb-2">
                {pool.name}
              </h2>
              <p className="font-body-md text-sm md:text-body-md text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]">
                {pool.desc}
              </p>
            </div>
          </div>

          {/* 右侧抽卡操作区 */}
          <div className="relative w-full md:w-1/3 bg-white/85 backdrop-blur-md border-t-4 md:border-t-0 md:border-l-4 border-primary-fixed/30 p-4 md:p-6 flex flex-col justify-between z-10">
            {/* 池切换标签 */}
            <div className="flex gap-2 mb-4">
              {['limited', 'permanent'].map(type => (
                <button
                  key={type}
                  onClick={() => setPoolType(type)}
                  className={`font-label-bold text-xs px-4 py-1.5 rounded-full border-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
                    poolType === type
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-300 shadow-[0_3px_10px_rgba(219,39,119,0.3)]'
                      : 'bg-white/60 text-on-surface border-outline-variant hover:bg-primary-fixed/30'
                  }`}
                >
                  {POOL_CONFIG[type].name}
                </button>
              ))}
            </div>

            {/* 保底进度 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-primary-fixed/30 mb-4 space-y-3">
              {[
                { label: 'SSR', cur: ssrPity, at: ssrAt, gradient: 'from-amber-400 via-yellow-400 to-amber-500', color: 'text-amber-500', icon: '🌟' },
                { label: 'UR', cur: urPity, at: urAt, gradient: 'from-pink-500 via-red-400 to-rose-500', color: 'text-red-500', icon: '💎' },
              ].map(({ label, cur, at, gradient, color, icon }) => {
                const pct = Math.min((cur / at) * 100, 100);
                const isNear = pct >= 80;
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant tracking-widest flex items-center gap-1">
                        <span>{icon}</span>
                        {label} 確定
                      </span>
                      <span className={`font-button-text text-xs ${isNear ? color : 'text-on-surface'}`}>{cur}/{at}</span>
                    </div>
                    <div className={`h-3 md:h-4 w-full bg-surface-variant/60 rounded-full overflow-hidden border border-outline-variant/50 ${isNear ? 'pity-near-glow' : ''}`}>
                      <div className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${isNear ? 'magic-bar' : `bg-gradient-to-r ${gradient}`}`} style={{ width: `${pct}%` }}>
                        {isNear && <div className="absolute inset-0 animate-shimmer" />}
                      </div>
                    </div>
                    <p className={`font-body-md text-[10px] mt-0.5 ${isNear ? `font-bold ${color}` : 'text-on-surface-variant/70'}`}>
                      {cur >= at ? `✦ 次回確定 ${label}!` :
                       pct >= 50 ? `⚡ 確率UP · 残り ${at - cur} 回` :
                       `あと ${at - cur} 回で ${label} 確定`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 抽卡按钮 */}
            {user ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleDraw('multi')}
                  disabled={drawing}
                  className="relative group font-button-text text-sm md:text-button-text py-3.5 md:py-4 px-4 rounded-full transition-all duration-200 flex justify-between items-center overflow-hidden bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white border-2 border-yellow-300 shadow-[0_6px_0_0_#b8860b,0_8px_20px_rgba(255,215,0,0.25)] hover:shadow-[0_2px_0_0_#b8860b,0_4px_12px_rgba(255,215,0,0.35)] hover:translate-y-1 active:translate-y-[5px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-[0_6px_0_0_#b8860b]"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] -skew-x-12 -translate-x-full group-hover:animate-[sheen_1.2s_ease-in-out]" />
                  <span className="flex items-center gap-2 drop-shadow-sm">
                    <span className="material-symbols-outlined symbol-filled">auto_awesome</span>
                    {pool.multiCost}
                  </span>
                  <span className="font-bold tracking-wider">10連ガチャ</span>
                </button>
                <button
                  onClick={() => handleDraw('single')}
                  disabled={drawing}
                  className="relative group font-button-text text-sm md:text-button-text py-3 md:py-3.5 px-4 rounded-full transition-all duration-200 flex justify-between items-center overflow-hidden bg-gradient-to-r from-pink-400 to-rose-400 text-white border-2 border-pink-300 shadow-[0_5px_0_0_#be185d,0_6px_15px_rgba(219,39,119,0.2)] hover:shadow-[0_2px_0_0_#be185d,0_3px_10px_rgba(219,39,119,0.3)] hover:translate-y-[3px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-[0_5px_0_0_#be185d]"
                >
                  <span className="flex items-center gap-2 drop-shadow-sm">
                    <span className="material-symbols-outlined symbol-filled">spa</span>
                    {pool.cost}
                  </span>
                  <span className="font-bold tracking-wider">単発ガチャ</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-on-surface-variant text-sm mb-3">ログインしてガチャを引こう！</p>
                <a href="/login" className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-button-text text-sm px-6 py-2 rounded-full border-2 border-white/30 shadow-[0_4px_0_0_#770143,0_6px_15px_rgba(219,39,119,0.25)] hover:shadow-[0_2px_0_0_#770143,0_3px_10px_rgba(219,39,119,0.3)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all no-underline">
                  登录
                </a>
              </div>
            )}
          </div>

          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <span className="material-symbols-outlined symbol-filled text-pink-300 absolute top-6 left-6 md:top-10 md:left-10 text-xl md:text-2xl animate-[sparkle_2.5s_ease-in-out_infinite] opacity-60">star</span>
            <span className="material-symbols-outlined symbol-filled text-purple-300 absolute bottom-16 left-1/3 text-lg animate-[sparkle_3s_ease-in-out_infinite_0.8s] opacity-50">star</span>
            <span className="material-symbols-outlined symbol-filled text-amber-300 absolute top-1/4 right-1/3 text-xl animate-[sparkle_2s_ease-in-out_infinite_1.5s] opacity-40">star</span>
          </div>
        </div>

        {/* ④ 最新掉落 */}
        <div className="rise-in rise-in-4 bg-surface rounded-2xl md:rounded-[32px] border-4 border-primary-fixed p-4 md:p-6 mb-4 md:mb-8 shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[6px_6px_0px_0px_rgba(255,119,175,0.2)]">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">trophy</span>
            最新掉落
          </h2>
          {showcase.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">style</span>
              <p className="text-sm">暂无掉落记录</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {showcase.map((item, i) => (
                <div key={i} className={`group relative aspect-[3/4] rounded-lg overflow-hidden border-2 ${rarityBorder(item.rarity)} ${item.rarity === 'UR' || item.rarity === 'SSR' ? rarityGlow(item.rarity) : ''} shadow-[2px_2px_0px_0px_rgba(136,113,120,0.2)] hover:scale-105 hover:shadow-lg transition-all`}>
                  {item.url ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">image</span>
                    </div>
                  )}
                  {item.rarity && (
                    <span className={`absolute top-1.5 left-1.5 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm ${rarityBg(item.rarity)} text-white`}>
                      {item.rarity}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs font-bold truncate drop-shadow-md">{item.username || '匿名'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ⑤ 最近抽卡记录 */}
        {user && (
          <div className="rise-in rise-in-5 bg-surface rounded-2xl md:rounded-[32px] border-4 border-primary-fixed p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[6px_6px_0px_0px_rgba(255,119,175,0.2)]">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">history</span>
                最近抽卡
              </h2>
              <a href="/profile" className="font-label-bold text-xs text-primary hover:underline no-underline">查看全部 →</a>
            </div>
            {drawHistory.length === 0 ? (
              <div className="text-center py-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2">casino</span>
                <p className="text-sm">还没有抽卡记录，快去试试手气吧！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {drawHistory.map((record, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors">
                    <span className={`inline-flex items-center justify-center text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-sm ${rarityBg(record.rarity)} text-white`}>
                      {record.rarity}
                    </span>
                    <span className="font-button-text text-xs text-on-surface shrink-0">{formatRelativeTime(record.created_at)}</span>
                    {record.is_pity ? (
                      <span className="material-symbols-outlined symbol-filled text-amber-400 text-sm shrink-0" title="保底">stars</span>
                    ) : null}
                    <span className="font-body-md text-[11px] text-on-surface-variant/70 ml-auto truncate">{record.source_name || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <BottomNav activeTab="大厅" />

      {/* 抽卡加载动画 */}
      {drawing && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-pink-400/30 border-t-pink-400 animate-spin [animation-duration:1.2s]" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-r-purple-400 animate-spin [animation-duration:1.8s] [animation-direction:reverse]" />
            <div className="absolute inset-6 rounded-full border-3 border-transparent border-t-amber-400 animate-spin [animation-duration:2.5s]" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-pink-400 symbol-filled animate-ping">auto_awesome</span>
            </span>
          </div>
          <p className="text-white font-headline-md text-lg tracking-wider">
            キラキラ<span className="animate-pulse">...</span>
          </p>
        </div>
      )}

      {/* ⑥ 抽卡结果弹窗 — 仅在客户端 open 时渲染，避免 SSR Portal 崩溃 */}
      {dialogOpen && (
        <DrawResultDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          result={drawResult}
        />
      )}

      {/* Toast 通知 */}
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

export function ErrorBoundary() {
  const error = useRouteError();
  const msg = error?.message || error?.data || (typeof error === 'string' ? error : JSON.stringify(error, null, 2));
  const status = error?.status || error?.statusCode || error?.statusText || '';
  const stack = error?.stack || '';
  return (
    <div className="min-h-screen bg-background bg-halftone relative">
      <Header activeTab="大厅" />
      <main className="max-w-[1440px] mx-auto w-full px-3 md:px-8 py-4 pt-[72px] md:pt-[88px] pb-[100px]">
        <div className="bg-surface rounded-2xl md:rounded-[32px] border-4 border-error p-6 md:p-8">
          <h2 className="font-headline-lg text-error mb-4">页面加载失败 {status ? `(${status})` : ''}</h2>
          <pre className="text-xs text-on-surface-variant mb-2 bg-surface-variant p-3 rounded-lg break-all whitespace-pre-wrap max-h-60 overflow-auto font-mono">
            {msg || '未知错误'}
          </pre>
          {stack && (
            <details className="mt-2">
              <summary className="text-xs text-on-surface-variant cursor-pointer">堆栈</summary>
              <pre className="text-[10px] text-on-surface-variant/60 mt-1 bg-surface-variant p-2 rounded break-all whitespace-pre-wrap max-h-40 overflow-auto font-mono">{stack}</pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-on-primary font-button-text text-sm px-6 py-2 rounded-full border-2 mt-4"
          >
            刷新页面
          </button>
        </div>
      </main>
      <BottomNav activeTab="大厅" />
    </div>
  );
}
