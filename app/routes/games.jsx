import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { useState } from 'react';

export default function Games() {
  const { user, refreshUser } = useAuth();
  const [betAmount, setBetAmount] = useState(10);
  const [prediction, setPrediction] = useState('big');
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);

  async function handlePlayDice() {
    setPlaying(true);
    setResult(null);
    try {
      const res = await api.playDice(betAmount, prediction);
      setResult(res);
      await refreshUser();
    } catch (e) {
      setResult({ error: e.message });
    }
    setPlaying(false);
  }

  return (
    <div className="min-h-screen relative pb-[100px] md:pb-0 pt-[72px] md:pt-[80px]">
      <div className="fixed inset-0 bg-background bg-grid-pattern pointer-events-none" />

      <Header activeTab="游戏" />

      <main className="max-w-7xl mx-auto px-4 md:px-lg relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-lg relative z-10 mt-2 md:mt-0">
          <div>
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-primary relative inline-block">
              游戏中心
              <span className="material-symbols-outlined absolute -top-3 md:-top-4 -right-6 md:-right-8 text-tertiary-fixed-dim symbol-filled" style={{ fontSize: 20 }}>stars</span>
            </h1>
            <p className="font-body-md text-xs md:text-body-lg text-on-surface-variant mt-1 md:mt-xs">选择小游戏赢取奖励！</p>
          </div>
          <div className="flex gap-1 md:gap-sm mt-1 md:mt-0">
            <div className="bg-surface-container border-[2px] border-outline-variant rounded-full px-2 md:px-sm py-1 md:py-xs flex items-center gap-1 md:gap-xs">
              <span className="material-symbols-outlined text-secondary symbol-filled text-sm md:text-base">monetization_on</span>
              <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user?.coins?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-lg">
          {/* Dice Game */}
          <article className="md:col-span-8 bg-surface rounded-xl border-[2px] md:border-[3px] border-primary shadow-[4px_4px_0px_0px_#a63067] md:shadow-[6px_6px_0px_0px_#a63067] overflow-hidden relative group hover-lift cursor-pointer">
            <div className="p-3 md:p-md bg-surface-bright">
              <div className="flex items-center gap-1 md:gap-xs mb-1 md:mb-xs">
                <span className="material-symbols-outlined text-primary symbol-filled text-sm md:text-base">local_fire_department</span>
                <span className="font-label-bold text-[10px] md:text-label-bold text-primary tracking-widest uppercase">热门活动</span>
              </div>
              <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-on-surface mb-1 md:mb-sm">骰子挑战</h2>
              <p className="font-body-md text-xs md:text-body-md text-on-surface-variant mb-2 md:mb-md">掷骰子猜大小赢取奖励！</p>

              <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                <div>
                  <label className="text-xs md:text-sm font-medium text-on-surface-variant mb-1 block">下注金额</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={e => setBetAmount(Number(e.target.value))}
                    min={10}
                    max={1000}
                    className="w-full px-3 md:px-4 py-2 md:py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-on-surface-variant mb-1 block">预测</label>
                  <div className="grid grid-cols-2 gap-1 md:gap-2">
                    <button
                      onClick={() => setPrediction('big')}
                      className={`py-2 md:py-3 rounded-full border-2 font-label-bold text-xs md:text-label-bold transition-all ${
                        prediction === 'big'
                          ? 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_#770143]'
                          : 'bg-surface-container text-on-surface border-outline-variant'
                      }`}
                    >
                      大
                    </button>
                    <button
                      onClick={() => setPrediction('small')}
                      className={`py-2 md:py-3 rounded-full border-2 font-label-bold text-xs md:text-label-bold transition-all ${
                        prediction === 'small'
                          ? 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_#770143]'
                          : 'bg-surface-container text-on-surface border-outline-variant'
                      }`}
                    >
                      小
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlayDice}
                disabled={playing}
                className="w-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-sm md:text-button-text py-3 md:py-4 rounded-full border-[3px] border-on-surface shadow-[4px_4px_0px_0px_#1a1b1f] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-1 md:gap-xs"
              >
                {playing ? (
                  <span className="animate-spin material-symbols-outlined">casino</span>
                ) : (
                  <span className="material-symbols-outlined symbol-filled">casino</span>
                )}
                {playing ? '投掷中...' : `掷骰子 (${betAmount})`}
              </button>

              {result && !result.error && (
                <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-xl border-2 text-center transition-all duration-300 animate-card-reveal"
                  style={{
                    background: result.reward > result.cost
                      ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                      : 'linear-gradient(135deg, #fee2e2, #fecaca)',
                    borderColor: result.reward > result.cost ? '#059669' : '#dc2626',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      预测: {prediction === 'big' ? '大' : '小'}
                    </span>
                    <span className="text-on-surface-variant">·</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      下注: {result.cost}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shadow-md animate-bounce`}
                      style={{
                        background: result.roll1 >= 5 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      }}
                    >
                      <span className="text-xl md:text-2xl font-black text-white">{result.roll1}</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-bold text-on-surface-variant">+</span>
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shadow-md animate-bounce`}
                      style={{
                        background: result.roll2 >= 5 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        animationDelay: '0.15s',
                      }}
                    >
                      <span className="text-xl md:text-2xl font-black text-white">{result.roll2}</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-bold text-on-surface-variant">=</span>
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shadow-lg"
                      style={{
                        background: result.sum >= 10
                          ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                          : result.sum <= 5
                          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                      }}
                    >
                      <span className="text-2xl md:text-3xl font-black text-white">{result.sum}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {result.reward > result.cost ? (
                      <>
                        <span className="material-symbols-outlined symbol-filled text-emerald-600 text-lg">celebration</span>
                        <p className="font-headline-md text-sm md:text-headline-md text-emerald-700 font-bold">
                          大赢家! +{result.reward - result.cost}
                        </p>
                      </>
                    ) : result.sum === 7 && result.reward > 0 ? (
                      <>
                        <span className="material-symbols-outlined symbol-filled text-amber-600 text-lg">auto_awesome</span>
                        <p className="font-headline-md text-sm md:text-headline-md text-amber-700 font-bold">
                          大奖! +{result.reward - result.cost}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-red-500 text-lg">sentiment_dissatisfied</span>
                        <p className="font-headline-md text-sm md:text-headline-md text-red-600 font-bold">
                          下次好运!
                          {result.roll1 === result.roll2 && <span className="block text-xs text-on-surface-variant font-normal">({result.roll1}+{result.roll2} 对子)</span>}
                        </p>
                      </>
                    )}
                  </div>

                  {result.userCoins !== undefined && (
                    <div className="mt-2 text-xs text-on-surface-variant">
                      余额: 🪙 {result.userCoins.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
              {result?.error && (
                <div className="mt-3 md:mt-4 p-3 rounded-lg bg-error-container border-2 border-error text-on-error-container text-xs md:text-sm">
                  {result.error}
                </div>
              )}
            </div>
          </article>

          {/* Puzzle Challenge */}
          <article className="md:col-span-4 bg-secondary-fixed-dim rounded-xl border-[2px] md:border-[3px] border-secondary shadow-[4px_4px_0px_0px_#006783] md:shadow-[6px_6px_0px_0px_#006783] overflow-hidden relative group hover-lift cursor-pointer">
            <div className="h-24 md:h-40 relative overflow-hidden bg-secondary">
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent" />
            </div>
            <div className="p-3 md:p-md bg-surface-bright flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-headline-md text-sm md:text-headline-md text-on-surface mb-1 md:mb-xs">拼图挑战</h2>
                <p className="font-body-md text-[10px] md:text-body-md text-on-surface-variant">匹配元素球消除棋盘</p>
              </div>
              <div className="mt-2 md:mt-md flex justify-between items-center">
                <div className="bg-surface-container border border-outline px-1.5 md:px-sm py-0.5 md:py-xs rounded-full flex gap-1 md:gap-xs items-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14 }}>military_tech</span>
                  <span className="font-label-bold text-[10px] md:text-label-bold text-on-surface">Lv. 12</span>
                </div>
                <button className="bg-primary text-on-primary font-button-text text-xs md:text-button-text px-2 md:px-sm py-[6px] md:py-[8px] rounded-full border-[2px] border-on-surface shadow-[3px_3px_0px_0px_#1a1b1f] md:shadow-[4px_4px_0px_0px_#1a1b1f] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
                  开始
                </button>
              </div>
            </div>
          </article>

          {/* Memory Match */}
          <article className="md:col-span-6 bg-surface-bright rounded-xl border-[2px] md:border-[3px] border-tertiary shadow-[4px_4px_0px_0px_#705d00] md:shadow-[6px_6px_0px_0px_#705d00] p-3 md:p-md relative group hover-lift cursor-pointer flex items-center gap-2 md:gap-md">
            <div className="w-14 h-14 md:w-24 md:h-24 rounded-lg border-2 border-tertiary-container overflow-hidden shrink-0 bg-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-xl md:text-4xl text-tertiary symbol-filled">style</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-block bg-tertiary-container text-on-tertiary-container font-label-bold text-[8px] md:text-label-bold px-1 md:px-xs py-[1px] md:py-[2px] rounded-full border border-on-surface mb-0.5 md:mb-xs">休闲</div>
              <h2 className="font-headline-md text-xs md:text-headline-md text-on-surface">记忆匹配</h2>
              <p className="font-body-md text-[10px] md:text-body-md text-on-surface-variant truncate">配对角色卡牌！</p>
            </div>
            <button className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-surface-container border-[2px] border-on-surface shadow-[3px_3px_0px_0px_#1a1b1f] md:shadow-[4px_4px_0px_0px_#1a1b1f] flex items-center justify-center text-on-surface hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all shrink-0">
              <span className="material-symbols-outlined text-base md:text-lg symbol-filled">arrow_forward</span>
            </button>
          </article>

          {/* Boss Raid */}
          <article className="md:col-span-6 bg-surface-bright rounded-xl border-[2px] md:border-[3px] border-error shadow-[3px_3px_0px_0px_#1a1b1f] md:shadow-[4px_4px_0px_0px_#1a1b1f] p-3 md:p-md relative group hover-lift cursor-pointer flex items-center gap-2 md:gap-md">
            <div className="w-14 h-14 md:w-24 md:h-24 rounded-lg border-2 border-error-container overflow-hidden shrink-0 relative bg-error flex items-center justify-center">
              <span className="material-symbols-outlined text-xl md:text-4xl text-on-error symbol-filled">local_fire_department</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-block bg-error text-on-error font-label-bold text-[8px] md:text-label-bold px-1 md:px-xs py-[1px] md:py-[2px] rounded-full border border-on-surface mb-0.5 md:mb-xs animate-pulse">组队</div>
              <h2 className="font-headline-md text-xs md:text-headline-md text-on-surface">首领突袭</h2>
              <p className="font-body-md text-[10px] md:text-body-md text-on-surface-variant truncate">组队挑战周常首领</p>
            </div>
            <button className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-surface-container border-[2px] border-on-surface shadow-[3px_3px_0px_0px_#1a1b1f] md:shadow-[4px_4px_0px_0px_#1a1b1f] flex items-center justify-center text-on-surface hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all shrink-0">
              <span className="material-symbols-outlined text-base md:text-lg symbol-filled">arrow_forward</span>
            </button>
          </article>
        </div>
      </main>

      <BottomNav activeTab="游戏" />
    </div>
  );
}
