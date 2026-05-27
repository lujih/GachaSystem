import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import Toast from '~/components/Toast';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { useState, useEffect, useRef } from 'react';

const DICE_RULES = [
  { condition: '点数 = 7', reward: '2倍下注', color: 'text-amber-500', icon: 'auto_awesome' },
  { condition: '对子（两骰相同）', reward: '1倍下注', color: 'text-emerald-500', icon: 'stars' },
  { condition: '点数 ≥ 10', reward: '0.5倍下注', color: 'text-blue-500', icon: 'arrow_upward' },
  { condition: '其他', reward: '输掉下注', color: 'text-red-500', icon: 'arrow_downward' },
];

export default function Games() {
  const { user, refreshUser } = useAuth();
  const [betAmount, setBetAmount] = useState(100);
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function showToast(message, type = 'info') {
    setToast({ message, type, key: Date.now() });
  }

  function startCooldown(seconds) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handlePlayDice() {
    if (playing || cooldown > 0) return;

    const bet = Math.min(Math.max(Number(betAmount) || 10, 10), 1000);
    if (bet !== Number(betAmount)) setBetAmount(bet);

    if (!user || user.coins < bet) {
      showToast('积分不足！', 'error');
      return;
    }

    setPlaying(true);
    setResult(null);
    try {
      const res = await api.playDice(bet);
      setResult(res);
      await refreshUser();
    } catch (e) {
      const msg = e?.message || '游戏失败';
      if (msg.includes('冷却')) {
        showToast('操作太快了，请稍后再试', 'error');
        startCooldown(3);
      } else {
        showToast(msg, 'error');
      }
    }
    setPlaying(false);
  }

  const isDisabled = playing || cooldown > 0 || !user;

  return (
    <div className="min-h-screen relative pb-[100px] md:pb-0 pt-[72px] md:pt-[80px]">
      <div className="fixed inset-0 bg-background bg-grid-pattern pointer-events-none" />

      <Header activeTab="游戏" />

      <main className="max-w-4xl mx-auto px-4 md:px-lg relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-lg relative z-10 mt-2 md:mt-0">
          <div>
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-primary relative inline-block">
              游戏中心
              <span className="material-symbols-outlined absolute -top-3 md:-top-4 -right-6 md:-right-8 text-tertiary-fixed-dim symbol-filled" style={{ fontSize: 20 }}>stars</span>
            </h1>
            <p className="font-body-md text-xs md:text-body-lg text-on-surface-variant mt-1 md:mt-xs">掷骰子猜点数赢取奖励！</p>
          </div>
          <div className="flex gap-1 md:gap-sm mt-1 md:mt-0">
            <div className="bg-surface-container border-[2px] border-outline-variant rounded-full px-2 md:px-sm py-1 md:py-xs flex items-center gap-1 md:gap-xs">
              <span className="material-symbols-outlined text-secondary symbol-filled text-sm md:text-base">monetization_on</span>
              <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user?.coins?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-lg">
          {/* Dice Game — main area */}
          <article className="md:col-span-3 bg-surface rounded-xl border-[2px] md:border-[3px] border-primary shadow-[4px_4px_0px_0px_#a63067] md:shadow-[6px_6px_0px_0px_#a63067] overflow-hidden relative">
            <div className="p-4 md:p-md bg-surface-bright">
              <div className="flex items-center gap-1 md:gap-xs mb-1">
                <span className="material-symbols-outlined text-primary symbol-filled text-sm md:text-base">local_fire_department</span>
                <span className="font-label-bold text-[10px] md:text-label-bold text-primary tracking-widest uppercase">热门活动</span>
              </div>
              <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-on-surface mb-1">骰子挑战</h2>
              <p className="font-body-md text-xs md:text-body-md text-on-surface-variant mb-3">投掷两颗骰子，根据点数赢取奖励！</p>

              {/* 下注金额 */}
              <div className="mb-3">
                <label className="text-xs md:text-sm font-medium text-on-surface-variant mb-1.5 block">下注金额</label>
                <div className="flex gap-2 mb-2">
                  {[10, 50, 100, 500].map(val => (
                    <button
                      key={val}
                      onClick={() => setBetAmount(val)}
                      className={`flex-1 py-1.5 rounded-full border-2 font-label-bold text-xs transition-all ${
                        betAmount === val
                          ? 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_#770143]'
                          : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-variant'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={betAmount}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') { setBetAmount(''); return; }
                    const v = Number(raw);
                    if (v >= 10 && v <= 1000) setBetAmount(v);
                  }}
                  onBlur={() => {
                    if (betAmount === '' || Number(betAmount) < 10) setBetAmount(10);
                    else if (Number(betAmount) > 1000) setBetAmount(1000);
                  }}
                  min={10}
                  max={1000}
                  step={10}
                  className="w-full px-4 py-2.5 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-sm"
                />
                <p className="text-[10px] text-on-surface-variant/60 mt-1">范围：10 ~ 1000</p>
              </div>

              {/* 投掷按钮 */}
              <button
                onClick={handlePlayDice}
                disabled={isDisabled}
                className={`w-full font-button-text text-sm md:text-button-text py-3 md:py-4 rounded-full border-[3px] transition-all flex items-center justify-center gap-1 md:gap-xs ${
                  isDisabled
                    ? 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-not-allowed opacity-60'
                    : 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-on-surface shadow-[4px_4px_0px_0px_#1a1b1f] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'
                }`}
              >
                {playing ? (
                  <span className="animate-spin material-symbols-outlined">casino</span>
                ) : cooldown > 0 ? (
                  <span className="material-symbols-outlined">timer</span>
                ) : (
                  <span className="material-symbols-outlined symbol-filled">casino</span>
                )}
                {playing ? '投掷中...' : cooldown > 0 ? `冷却中 (${cooldown}s)` : `掷骰子 (下注 ${betAmount})`}
              </button>

              {/* 结果展示 */}
              {result && !result.error && (
                <div className="mt-4 p-4 rounded-xl border-2 text-center transition-all duration-300 animate-card-reveal"
                  style={{
                    background: result.reward > result.cost
                      ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                      : 'linear-gradient(135deg, #fee2e2, #fecaca)',
                    borderColor: result.reward > result.cost ? '#059669' : '#dc2626',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shadow-lg animate-bounce"
                      style={{ background: result.roll1 >= 4 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      <span className="text-2xl md:text-3xl font-black text-white">{result.roll1}</span>
                    </div>
                    <span className="text-2xl font-bold text-on-surface-variant">+</span>
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shadow-lg animate-bounce"
                      style={{ background: result.roll2 >= 4 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', animationDelay: '0.15s' }}
                    >
                      <span className="text-2xl md:text-3xl font-black text-white">{result.roll2}</span>
                    </div>
                    <span className="text-2xl font-bold text-on-surface-variant">=</span>
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-xl flex items-center justify-center shadow-lg"
                      style={{
                        background: result.sum >= 10
                          ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                          : result.sum <= 5
                          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                      }}
                    >
                      <span className="text-3xl md:text-4xl font-black text-white">{result.sum}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {result.reward > result.cost ? (
                      <>
                        <span className="material-symbols-outlined symbol-filled text-emerald-600 text-lg">celebration</span>
                        <p className="font-headline-md text-sm md:text-headline-md text-emerald-700 font-bold">
                          中奖！+{result.reward - result.cost} 积分
                        </p>
                      </>
                    ) : result.reward > 0 ? (
                      <>
                        <span className="material-symbols-outlined symbol-filled text-amber-600 text-lg">auto_awesome</span>
                        <p className="font-headline-md text-sm md:text-headline-md text-amber-700 font-bold">
                          保本！+{result.reward - result.cost} 积分
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-red-500 text-lg">sentiment_dissatisfied</span>
                        <p className="font-headline-md text-sm md:text-headline-md text-red-600 font-bold">
                          下次好运！
                        </p>
                      </>
                    )}
                  </div>

                  {result.userCoins !== undefined && (
                    <div className="mt-2 text-xs text-on-surface-variant">
                      余额: {result.userCoins.toLocaleString()} 积分
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* Rules sidebar */}
          <aside className="md:col-span-2 flex flex-col gap-3">
            {/* Payout rules */}
            <div className="bg-surface rounded-xl border-2 border-outline-variant p-4 shadow-[2px_2px_0px_0px_rgba(136,113,120,0.1)]">
              <h3 className="font-label-bold text-xs md:text-label-bold text-on-surface uppercase tracking-widest mb-3">赔率规则</h3>
              <div className="space-y-2.5">
                {DICE_RULES.map((rule, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-base ${rule.color}`}>{rule.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-xs text-on-surface">{rule.condition}</p>
                    </div>
                    <span className={`font-label-bold text-xs shrink-0 ${rule.color}`}>{rule.reward}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant">
                <p className="text-[10px] text-on-surface-variant/60">下注范围：10 ~ 1000 积分</p>
                <p className="text-[10px] text-on-surface-variant/60">冷却：3 秒</p>
              </div>
            </div>

            {/* Coming soon */}
            <div className="bg-surface-container-low rounded-xl border-2 border-outline-variant p-4 opacity-60">
              <h3 className="font-label-bold text-xs text-on-surface-variant uppercase tracking-widest mb-2">即将推出</h3>
              <div className="space-y-2">
                {[
                  { icon: 'extension', name: '拼图挑战', desc: '匹配元素消除' },
                  { icon: 'style', name: '记忆匹配', desc: '翻牌配对' },
                  { icon: 'local_fire_department', name: '首领突袭', desc: '组队挑战' },
                ].map((game, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-variant/30">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">{game.icon}</span>
                    <div>
                      <p className="font-label-bold text-xs text-on-surface-variant">{game.name}</p>
                      <p className="text-[10px] text-on-surface-variant/50">{game.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <BottomNav activeTab="游戏" />

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
