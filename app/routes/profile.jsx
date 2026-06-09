import { useNavigate, useLoaderData } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import Toast from '~/components/Toast';
import { api } from '~/lib/api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { RARITY_COLORS, RARITY_ORDER } from '~/lib/rarity';

const CONFIG_DECOMPOSE = { 'N': 50, 'R': 30, 'SR': 80, 'SSR': 250, 'UR': 1000 };

const MILESTONES = [
  { level: 5, coins: 500, title: '新手收藏家' },
  { level: 10, coins: 1000, title: '初级收藏家' },
  { level: 20, coins: 2000, title: '高级收藏家' },
  { level: 30, coins: 3000, title: '资深收藏家' },
  { level: 50, coins: 5000, title: '传说人物' },
  { level: 100, coins: 10000, title: '卡片之神' },
];

const PITY_COLORS = {
  amber: { bar: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300' },
  red: { bar: 'bg-gradient-to-r from-red-400 to-rose-500', text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' },
};

export async function loader({ context }) {
  const currentUser = context?.data?.currentUser;
  if (!currentUser) return { initialInventory: null, initialTitles: [] };
  const env = context?.cloudflare?.env;
  if (!env?.DB) return { initialInventory: null, initialTitles: [] };
  try {
    const [invResult, titlesResult] = await Promise.all([
      env.DB.prepare('SELECT rarity, count FROM inventory WHERE user_id = ?').bind(currentUser.id).all(),
      env.DB.prepare('SELECT title_id, is_equipped, unlocked_at FROM user_titles WHERE user_id = ? ORDER BY unlocked_at DESC').bind(currentUser.id).all(),
    ]);
    const inventory = {};
    ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => inventory[r] = 0);
    (invResult.results || []).forEach(row => { inventory[row.rarity] = row.count; });
    return { initialInventory: inventory, initialTitles: titlesResult.results || [] };
  } catch {
    return { initialInventory: null, initialTitles: [] };
  }
}

export default function Profile() {
  const { initialInventory, initialTitles } = useLoaderData();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [inventory, setInventory] = useState(initialInventory);
  const [titles, setTitles] = useState(initialTitles);
  const [claiming, setClaiming] = useState(null);
  const [editingNick, setEditingNick] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const [equipping, setEquipping] = useState(false);
  const [decomposing, setDecomposing] = useState(null);

  // SSR 预取失败时 fallback 到客户端获取
  useEffect(() => {
    if (!user) return;
    if (!inventory) api.getInventory().then(res => setInventory(res.data || res)).catch(() => {});
    if (titles.length === 0) api.getTitles().then(res => setTitles(res.titles || [])).catch(() => {});
  }, [user?.id]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const handleClaim = useCallback(async (level) => {
    if (claiming) return;
    setClaiming(level);
    try {
      const res = await api.claimReward(level);
      const [, tRes] = await Promise.all([refreshUser(), api.getTitles()]);
      setTitles(tRes?.titles || []);
      const r = res?.reward;
      showToast(`领取成功！+${r?.coins ?? '?'} 金币${r?.title ? ` +称号「${r.title}」` : ''}`);
    } catch (e) {
      showToast(e?.message || '领取失败', 'error');
    } finally {
      setClaiming(null);
    }
  }, [claiming, refreshUser, showToast]);

  const handleEquip = useCallback(async (titleId) => {
    if (equipping) return;
    setEquipping(true);
    try {
      await api.equipTitle(titleId);
      const [tRes] = await Promise.all([api.getTitles(), refreshUser()]);
      setTitles(tRes?.titles || []);
      showToast(titleId ? '称号已装备' : '称号已卸下');
    } catch (e) {
      showToast(e?.message || '操作失败', 'error');
    } finally {
      setEquipping(false);
    }
  }, [equipping, refreshUser, showToast]);

  const handleDecompose = useCallback(async (rarity, count = 1) => {
    if (decomposing) return;
    setDecomposing(rarity);
    // 乐观更新：先扣库存
    setInventory(prev => prev ? { ...prev, [rarity]: Math.max(0, (prev[rarity] || 0) - count) } : prev);
    try {
      const res = await api.decompose(rarity, count);
      if (!res) throw new Error('分解失败');
      showToast(`分解 ${count} 张 ${rarity} → +${res.totalCoins} 金币`);
      await refreshUser();
    } catch (e) {
      setInventory(prev => prev ? { ...prev, [rarity]: (prev[rarity] || 0) + count } : prev);
      showToast(e?.message || '分解失败', 'error');
    } finally {
      setDecomposing(null);
    }
  }, [decomposing, refreshUser, showToast]);

  const handleSaveNickname = useCallback(async () => {
    const nick = newNickname.trim();
    if (!nick) return;
    setSavingNick(true);
    try {
      await api.updateProfile(nick);
      await refreshUser();
      setEditingNick(false);
      showToast('昵称已更新');
    } catch (e) {
      showToast(e?.message || '更新失败', 'error');
    } finally {
      setSavingNick(false);
    }
  }, [newNickname, refreshUser, showToast]);

  // 签到状态判断（memoize）
  const todayIsChecked = useMemo(() => {
    if (!user?.lastLoginDate) return false;
    const lastDate = user.lastLoginDate.split('T')[0];
    const beijingNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const todayStr = beijingNow.toISOString().split('T')[0];
    return lastDate === todayStr;
  }, [user?.lastLoginDate]);

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
        {/* 头像 + 等级 */}
        <section className="relative w-full mt-2 md:mt-6">
          <div className="absolute inset-0 bg-primary translate-x-1 md:translate-x-2 translate-y-1 md:translate-y-2 rounded-2xl md:rounded-[32px]" />
          <div className="relative bg-surface-container-lowest border-[2px] md:border-[3px] border-primary rounded-2xl md:rounded-[32px] overflow-hidden flex flex-col md:flex-row items-center p-4 md:p-10 gap-4 md:gap-8">
            <div className="relative w-24 h-24 md:w-64 md:h-64 flex-shrink-0 group">
              <div className="absolute inset-0 bg-secondary rounded-full translate-x-1 md:translate-x-2 translate-y-1 md:translate-y-2 group-hover:translate-x-2 group-hover:translate-y-2 md:group-hover:translate-x-3 md:group-hover:translate-y-3 transition-transform" />
              <div className="relative w-full h-full rounded-full border-4 border-secondary overflow-hidden bg-surface-variant flex items-center justify-center z-10">
                <div className="text-3xl md:text-8xl font-black text-primary-container">
                  {(user.nickname || user.username || '?').charAt(0).toUpperCase()}
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
                {/* 昵称 + 编辑 */}
                {editingNick ? (
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={e => setNewNickname(e.target.value)}
                      maxLength={20}
                      className="bg-surface-container-highest border-2 border-primary rounded-lg px-3 py-1 text-on-surface font-headline-lg md:text-display-lg text-display-lg outline-none w-48 md:w-64"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSaveNickname()}
                    />
                    <button
                      onClick={handleSaveNickname}
                      disabled={savingNick || !newNickname.trim()}
                      className="bg-primary text-on-primary rounded-full px-3 py-1 text-sm font-button-text disabled:opacity-50"
                    >
                      {savingNick ? '...' : '保存'}
                    </button>
                    <button
                      onClick={() => setEditingNick(false)}
                      className="text-on-surface-variant rounded-full px-3 py-1 text-sm font-button-text"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <h1 className="font-headline-lg md:text-display-lg text-display-lg text-on-surface mb-1 drop-shadow-sm flex items-center justify-center md:justify-start gap-2">
                    {user.nickname || user.username}
                    <button
                      onClick={() => { setNewNickname(user.nickname || user.username); setEditingNick(true); }}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                      title="编辑昵称"
                    >
                      <span className="material-symbols-outlined text-lg md:text-xl">edit</span>
                    </button>
                  </h1>
                )}
                <p className="font-body-md text-xs md:text-body-md text-outline flex items-center justify-center md:justify-start gap-1 md:gap-2">
                  <span className="material-symbols-outlined text-sm md:text-[18px]">id_card</span>
                  UID: {user.id}
                </p>
                {user.title && (
                  <p className="font-label-bold text-xs md:text-sm text-tertiary flex items-center justify-center md:justify-start gap-1 mt-1">
                    <span className="material-symbols-outlined text-sm md:text-[16px] symbol-filled">workspace_premium</span>
                    {user.title.name}
                  </p>
                )}
              </div>

              {/* 经验条 */}
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

              {/* 保底计数器 */}
              <div className="flex gap-3 md:gap-4 mt-1">
                <PityBar label="SSR" current={user.ssrPity} max={user.ssrPityAt} color="amber" />
                <PityBar label="UR" current={user.urPity} max={user.urPityAt} color="red" />
              </div>
            </div>
          </div>
        </section>

        {/* 背包统计 + 分解 */}
        <section className="mt-2 md:mt-4">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 mb-3">
            {RARITY_ORDER.map(r => (
              <StatCard
                key={r}
                rarity={r}
                value={inventory?.[r]?.toLocaleString() || '—'}
              />
            ))}
          </div>
          {/* 分解区域 */}
          <div className="bg-white/40 backdrop-blur-xl border-2 border-outline-variant rounded-2xl md:rounded-[32px] p-3 md:p-5">
            <h3 className="font-label-bold text-xs md:text-sm text-on-surface-variant mb-2 md:mb-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm md:text-base">recycling</span>
              分解卡片换取金币
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {RARITY_ORDER.map(r => {
                const owned = inventory?.[r] || 0;
                const coins = CONFIG_DECOMPOSE[r] || 0;
                const canDecompose = owned > 0;
                return (
                  <div key={r} className="flex items-center gap-2 bg-surface-container-lowest rounded-xl p-2 border border-outline-variant">
                    <span className={`inline-block text-[10px] md:text-xs font-black text-white px-1.5 py-0.5 rounded ${rarityBg(r)}`}>{r}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] md:text-xs text-on-surface-variant truncate">{coins} 金/张</p>
                    </div>
                    <button
                      onClick={() => handleDecompose(r, 1)}
                      disabled={!canDecompose || decomposing === r}
                      className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full border transition-all ${
                        canDecompose
                          ? 'bg-error-container text-on-error-container border-error hover:scale-105'
                          : 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-not-allowed opacity-50'
                      }`}
                    >
                      {decomposing === r ? '...' : '分解'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 称号系统 */}
        <section className="mt-4 md:mt-8">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-on-surface mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
            <span className="material-symbols-outlined text-primary text-2xl md:text-[32px] symbol-filled">emoji_events</span>
            称号
          </h2>
          {titles.length === 0 ? (
            <div className="bg-white/40 backdrop-blur-xl border-2 border-outline-variant rounded-2xl md:rounded-[32px] p-6 md:p-8 text-center">
              <span className="material-symbols-outlined text-4xl md:text-5xl text-outline mb-2">lock</span>
              <p className="text-on-surface-variant text-sm md:text-base">还没有获得任何称号</p>
              <p className="text-outline text-xs md:text-sm mt-1">升级可解锁专属称号</p>
            </div>
          ) : (
            <div className="bg-white/40 backdrop-blur-xl border-2 border-outline-variant rounded-2xl md:rounded-[32px] p-4 md:p-6 shadow-[0_8px_32px_rgba(166,48,103,0.1)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {titles.map(t => (
                  <TitleCard key={t.title_id} title={t} onEquip={handleEquip} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 等级里程碑奖励 */}
        <section className="mt-4 md:mt-8">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-on-surface mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
            <span className="material-symbols-outlined text-primary text-2xl md:text-[32px] symbol-filled">card_giftcard</span>
            等级奖励
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            {MILESTONES.map(({ level: lv, coins, title }) => {
              const claimed = user.claimedRewards?.includes(lv);
              const canClaim = user.level >= lv && !claimed;
              const locked = user.level < lv;
              return (
                <div
                  key={lv}
                  className={`relative rounded-2xl md:rounded-[24px] border-2 p-3 md:p-5 flex flex-col gap-1 md:gap-2 transition-all ${
                    claimed
                      ? 'bg-surface-variant border-outline-variant opacity-60'
                      : canClaim
                        ? 'bg-tertiary-container border-tertiary hover:-translate-y-0.5 md:hover:-translate-y-1 cursor-pointer shadow-[2px_2px_0_theme(colors.tertiary)] md:shadow-[4px_4px_0_theme(colors.tertiary)]'
                        : 'bg-surface-container-lowest border-outline-variant opacity-50'
                  }`}
                  onClick={() => canClaim && handleClaim(lv)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-label-bold text-sm md:text-base ${canClaim ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>
                      Lv.{lv}
                    </span>
                    {claimed && <span className="material-symbols-outlined text-lg text-primary symbol-filled">check_circle</span>}
                    {locked && <span className="material-symbols-outlined text-lg text-outline">lock</span>}
                    {canClaim && <span className="material-symbols-outlined text-lg text-on-tertiary-container symbol-filled animate-bounce">redeem</span>}
                  </div>
                  <div className={`text-xs md:text-sm ${canClaim ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>
                    +{coins} 金币
                  </div>
                  {title && (
                    <div className={`text-[10px] md:text-xs flex items-center gap-1 ${canClaim ? 'text-on-tertiary-container' : 'text-outline'}`}>
                      <span className="material-symbols-outlined text-sm">workspace_premium</span>
                      {title}
                    </div>
                  )}
                  {claiming === lv && (
                    <div className="absolute inset-0 bg-surface/80 rounded-2xl md:rounded-[24px] flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-primary animate-spin">progress_activity</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 每日签到 */}
        <section className="mt-3 md:mt-4">
          <button
            onClick={async () => {
              if (checkingIn || todayIsChecked) return;
              setCheckingIn(true);
              try {
                const res = await api.checkIn();
                await refreshUser();
                const streakBonus = res?.checkIn?.streakBonus;
                const bonus = streakBonus > 0 ? ` (连续签到+${streakBonus})` : '';
                showToast(`签到成功！+${res?.checkIn?.coins ?? 150} 金币 +${res?.checkIn?.exp ?? 50} 经验${bonus}`);
              } catch (e) {
                showToast(e?.message || '签到失败', 'error');
              } finally {
                setCheckingIn(false);
              }
            }}
            disabled={checkingIn || todayIsChecked}
            className={`w-full font-button-text text-sm md:text-button-text text-[24px] py-3 md:py-md rounded-full border-4 transition-all relative overflow-hidden group ${
              checkingIn || todayIsChecked
                ? 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-default opacity-60'
                : 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-on-tertiary-fixed shadow-[0px_6px_0px_0px_#221b00] md:shadow-[0px_8px_0px_0px_#221b00] hover:translate-y-[3px] hover:shadow-[0px_3px_0px_0px_#221b00] active:translate-y-[6px] active:shadow-none'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-1 md:gap-xs">
              <span className="material-symbols-outlined text-xl md:text-[28px] symbol-filled">
                {todayIsChecked ? 'check_circle' : checkingIn ? 'hourglass_empty' : 'calendar_today'}
              </span>
              {todayIsChecked ? '已签到' : checkingIn ? '签到中...' : '每日签到'}
            </span>
          </button>
        </section>
      </main>

      <BottomNav activeTab="Profile" />

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

function PityBar({ label, current, max, color }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const c = PITY_COLORS[color] || PITY_COLORS.amber;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-0.5">
        <span className={`font-label-bold text-[10px] md:text-xs ${c.text}`}>{label} 保底</span>
        <span className={`font-label-bold text-[10px] md:text-xs ${c.text}`}>{current}/{max}</span>
      </div>
      <div className={`relative h-2 md:h-3 ${c.bg} rounded-full border ${c.border} overflow-hidden`}>
        <div className={`absolute top-0 left-0 h-full ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ rarity, value }) {
  const c = RARITY_COLORS[rarity] || RARITY_COLORS.N;
  return (
    <div className="relative group">
      <div className={`absolute inset-0 ${c.bg} translate-x-0.5 translate-y-0.5 md:translate-x-1 md:translate-y-1 rounded-xl md:rounded-2xl transition-transform group-hover:translate-x-1 group-hover:translate-y-1 md:group-hover:translate-x-1.5 md:group-hover:translate-y-1.5`} />
      <div className={`relative bg-surface-container-lowest border-2 ${c.border} rounded-xl md:rounded-2xl p-2 md:p-4 flex flex-col items-center z-10 group-hover:-translate-y-0.5 md:hover:-translate-y-1 transition-transform`}>
        <span className={`font-headline-md md:text-headline-lg text-on-surface drop-shadow-sm`}>{value}</span>
        <span className={`font-label-bold text-xs md:text-sm ${c.text} uppercase tracking-wider`}>{rarity}</span>
      </div>
    </div>
  );
}

function TitleCard({ title, onEquip }) {
  const equipped = title.is_equipped === 1;
  return (
    <button
      onClick={() => onEquip(equipped ? null : title.title_id)}
      className={`rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center gap-1.5 md:gap-2 transition-all border-2 ${
        equipped
          ? 'bg-primary-container border-primary shadow-[0_0_12px_rgba(119,1,67,0.3)] scale-[1.02]'
          : 'bg-surface border-outline hover:border-primary hover:-translate-y-0.5 md:hover:-translate-y-1'
      }`}
    >
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${equipped ? 'bg-primary' : 'bg-surface-variant'}`}>
        <span className={`material-symbols-outlined text-lg md:text-xl ${equipped ? 'text-on-primary' : 'text-on-surface-variant'} symbol-filled`}>
          {equipped ? 'workspace_premium' : 'military_tech'}
        </span>
      </div>
      <span className={`font-label-bold text-[10px] md:text-xs text-center ${equipped ? 'text-on-primary-container' : 'text-on-surface'}`}>
        {title.title_id}
      </span>
      {equipped && (
        <span className="text-[8px] md:text-[10px] text-primary font-label-bold">装备中</span>
      )}
    </button>
  );
}
