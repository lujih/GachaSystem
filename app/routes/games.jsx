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
    <div className="min-h-screen relative pb-[120px] pt-[80px]">
      {/* Background */}
      <div className="fixed inset-0 bg-background bg-grid-pattern pointer-events-none" />

      <Header activeTab="Games" />

      <main className="max-w-7xl mx-auto px-gutter md:px-lg relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-lg relative z-10">
          <div>
            <h1 className="font-display-lg text-display-lg text-primary relative inline-block">
              Game Center
              <span className="material-symbols-outlined absolute -top-4 -right-8 text-tertiary-fixed-dim symbol-filled" style={{ fontSize: 32 }}>stars</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">Select a mini-game to earn rewards!</p>
          </div>
          <div className="flex gap-sm mt-sm md:mt-0">
            <div className="bg-surface-container border-[2px] border-outline-variant rounded-full px-sm py-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary symbol-filled">monetization_on</span>
              <span className="font-label-bold text-label-bold text-on-surface">{user?.coins?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md md:gap-lg">
          {/* Dice Game - Featured */}
          <article className="md:col-span-8 bg-surface rounded-xl border-[3px] border-primary shadow-[6px_6px_0px_0px_#a63067] overflow-hidden relative group hover-lift cursor-pointer">
            <div className="p-md bg-surface-bright">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-primary symbol-filled">local_fire_department</span>
                <span className="font-label-bold text-label-bold text-primary tracking-widest uppercase">Hot Event</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Dice Challenge</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">Roll the dice and guess big or small to win rewards!</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={e => setBetAmount(Number(e.target.value))}
                    min={10}
                    max={1000}
                    className="w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Prediction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPrediction('big')}
                      className={`py-3 rounded-full border-2 font-label-bold text-label-bold transition-all ${
                        prediction === 'big'
                          ? 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_#770143]'
                          : 'bg-surface-container text-on-surface border-outline-variant'
                      }`}
                    >
                      Big (6-12)
                    </button>
                    <button
                      onClick={() => setPrediction('small')}
                      className={`py-3 rounded-full border-2 font-label-bold text-label-bold transition-all ${
                        prediction === 'small'
                          ? 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_#770143]'
                          : 'bg-surface-container text-on-surface border-outline-variant'
                      }`}
                    >
                      Small (2-5)
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlayDice}
                disabled={playing}
                className="w-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-button-text py-4 rounded-full border-[3px] border-on-surface shadow-[4px_4px_0px_0px_#1a1b1f] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-xs"
              >
                {playing ? (
                  <span className="animate-spin material-symbols-outlined">casino</span>
                ) : (
                  <span className="material-symbols-outlined symbol-filled">casino</span>
                )}
                {playing ? 'Rolling...' : `Roll Dice (${betAmount} coins)`}
              </button>

              {result && !result.error && (
                <div className="mt-4 p-4 rounded-xl bg-surface-container-low border-2 border-outline-variant text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center">
                      <span className="text-2xl font-black">{result.roll1}</span>
                    </div>
                    <span className="text-2xl">+</span>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center">
                      <span className="text-2xl font-black">{result.roll2}</span>
                    </div>
                    <span className="text-2xl">=</span>
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-tertiary-fixed to-tertiary flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-black text-on-tertiary">{result.sum}</span>
                    </div>
                  </div>
                  <p className={`font-headline-md text-headline-md ${result.reward > result.cost ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {result.reward > result.cost ? `+${result.reward - result.cost} coins!` : 'Better luck next time!'}
                  </p>
                </div>
              )}
              {result?.error && (
                <div className="mt-4 p-3 rounded-lg bg-error-container border-2 border-error text-on-error-container text-sm">
                  {result.error}
                </div>
              )}
            </div>
          </article>

          {/* Puzzle Challenge */}
          <article className="md:col-span-4 bg-secondary-fixed-dim rounded-xl border-[3px] border-secondary shadow-[6px_6px_0px_0px_#006783] overflow-hidden relative group hover-lift cursor-pointer">
            <div className="h-40 relative overflow-hidden bg-secondary">
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent" />
            </div>
            <div className="p-md bg-surface-bright flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Puzzle Challenge</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Match elemental orbs to clear the board.</p>
              </div>
              <div className="mt-md flex justify-between items-center">
                <div className="bg-surface-container border border-outline px-sm py-xs rounded-full flex gap-xs items-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>military_tech</span>
                  <span className="font-label-bold text-label-bold text-on-surface">Lv. 12</span>
                </div>
                <button className="bg-primary text-on-primary font-button-text text-button-text px-sm py-[8px] rounded-full border-[2px] border-on-surface shadow-[4px_4px_0px_0px_#1a1b1f] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all">
                  Play
                </button>
              </div>
            </div>
          </article>

          {/* Memory Match */}
          <article className="md:col-span-6 bg-surface-bright rounded-xl border-[3px] border-tertiary shadow-[6px_6px_0px_0px_#705d00] p-md relative group hover-lift cursor-pointer flex items-center gap-md">
            <div className="w-24 h-24 rounded-lg border-2 border-tertiary-container overflow-hidden shrink-0 bg-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-tertiary symbol-filled">style</span>
            </div>
            <div className="flex-1">
              <div className="inline-block bg-tertiary-container text-on-tertiary-container font-label-bold text-label-bold px-xs py-[2px] rounded-full border border-on-surface mb-xs text-[10px]">CASUAL</div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Memory Match</h2>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1">Pair up the character cards before time runs out!</p>
            </div>
            <button className="w-12 h-12 rounded-full bg-surface-container border-[2px] border-on-surface shadow-[4px_4px_0px_0px_#1a1b1f] flex items-center justify-center text-on-surface hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all shrink-0">
              <span className="material-symbols-outlined symbol-filled">arrow_forward</span>
            </button>
          </article>

          {/* Boss Raid */}
          <article className="md:col-span-6 bg-surface-bright rounded-xl border-[3px] border-error shadow-[4px_4px_0px_0px_#1a1b1f] p-md relative group hover-lift cursor-pointer flex items-center gap-md">
            <div className="w-24 h-24 rounded-lg border-2 border-error-container overflow-hidden shrink-0 relative bg-error flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-on-error symbol-filled">local_fire_department</span>
            </div>
            <div className="flex-1">
              <div className="inline-block bg-error text-on-error font-label-bold text-label-bold px-xs py-[2px] rounded-full border border-on-surface mb-xs text-[10px] animate-pulse">CO-OP</div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Boss Raid</h2>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1">Team up to defeat the Weekly Boss.</p>
            </div>
            <button className="w-12 h-12 rounded-full bg-surface-container border-[2px] border-on-surface shadow-[4px_4px_0px_0px_#1a1b1f] flex items-center justify-center text-on-surface hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all shrink-0">
              <span className="material-symbols-outlined symbol-filled">arrow_forward</span>
            </button>
          </article>
        </div>
      </main>

      <BottomNav activeTab="Games" />
    </div>
  );
}
