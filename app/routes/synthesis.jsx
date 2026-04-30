import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { useState } from 'react';

export default function Synthesis() {
  const { user, refreshUser } = useAuth();
  const [targetRarity, setTargetRarity] = useState('SR');

  const craftOptions = [
    { target: 'R', source: 'N', cost: 5 },
    { target: 'SR', source: 'R', cost: 5 },
    { target: 'SSR', source: 'SR', cost: 5 },
    { target: 'UR', source: 'SSR', cost: 5 },
  ];

  async function handleSynthesize() {
    try {
      await api.craft(targetRarity);
      await refreshUser();
    } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased overflow-x-hidden">
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-halftone" />
      <div className="absolute top-20 left-10 text-tertiary-fixed opacity-50 animate-sparkle">
        <span className="material-symbols-outlined text-[40px]">colors_spark</span>
      </div>
      <div className="absolute bottom-40 right-20 text-secondary-container opacity-60 animate-sparkle" style={{ animationDelay: '0.5s' }}>
        <span className="material-symbols-outlined text-[60px]">colors_spark</span>
      </div>

      <Header activeTab="合成" />

      <main className="min-h-screen pt-[80px] pb-xl px-gutter relative flex flex-col items-center">
        {/* Task Header */}
        <div className="w-full max-w-6xl mt-margin mb-lg flex items-center justify-between relative z-10">
          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <h1 className="font-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_#ff77af]">
              Limit Break
            </h1>
          </div>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-lg relative z-10">
          {/* Left: Character Card Focus */}
          <div className="md:col-span-5 relative group">
            <div className="w-full aspect-[3/4] rounded-xl border-4 border-primary bg-surface-container-lowest/80 backdrop-blur-md shadow-[8px_8px_0px_0px_#ffb0cb] transition-transform duration-300 ease-out group-hover:-rotate-2 group-hover:scale-[1.02] p-xs relative overflow-hidden flex flex-col">
              {/* Decorative corners */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-secondary rounded-tl-lg z-20 m-xs pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-secondary rounded-br-lg z-20 m-xs pointer-events-none" />

              <div className="flex-1 rounded-lg overflow-hidden relative bg-surface-container-high border-2 border-outline-variant flex items-center justify-center">
                <div className="text-8xl font-black text-primary-container/50">
                  {targetRarity}
                </div>
                <div className="absolute bottom-sm left-sm bg-inverse-surface text-inverse-on-surface px-sm py-xs rounded-full border-2 border-on-surface shadow-[4px_4px_0px_0px_#a63067] flex items-center gap-xs">
                  <span className="font-label-bold text-label-bold">Lv. 80</span>
                  <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">arrow_forward</span>
                  <span className="font-label-bold text-label-bold text-secondary-container">Lv. 90</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Upgrade Mechanics */}
          <div className="md:col-span-7 flex flex-col gap-margin justify-center pl-0 md:pl-md">
            {/* Success Rate */}
            <div className="bg-surface-container-lowest/90 backdrop-blur-sm p-margin rounded-xl border-4 border-secondary-fixed shadow-[6px_6px_0px_0px_#63d3ff] flex items-center gap-margin relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-secondary-container opacity-20 rounded-bl-full -z-10" />
              <div className="w-24 h-24 rounded-full relative flex items-center justify-center shrink-0 border-2 border-surface" style={{ background: `conic-gradient(var(--color-secondary) 85%, var(--color-surface-variant) 0)` }}>
                <div className="w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-inner">
                  <span className="font-headline-lg text-headline-lg text-secondary drop-shadow-sm">85%</span>
                </div>
              </div>
              <div className="flex flex-col gap-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface">Synthesis Rate</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  High chance of <span className="text-primary font-bold">Great Success!</span>
                </p>
              </div>
            </div>

            {/* Material Slots */}
            <div className="bg-surface-container-low p-margin rounded-xl border-2 border-outline-variant shadow-[4px_4px_0px_0px_#e3e2e7] flex flex-col gap-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-label-bold text-label-bold text-on-surface uppercase tracking-widest">Required Catalysts</h3>
                <span className="font-body-md text-body-md text-on-surface-variant">Select target rarity</span>
              </div>
              <div className="flex gap-sm flex-wrap">
                {craftOptions.map(opt => (
                  <button
                    key={opt.target}
                    onClick={() => setTargetRarity(opt.target)}
                    className={`w-20 h-20 rounded-lg border-2 flex items-center justify-center relative shadow-[2px_2px_0px_0px_#ff77af] hover:translate-y-[-2px] transition-transform cursor-pointer ${
                      targetRarity === opt.target
                        ? 'border-primary bg-primary-fixed/20'
                        : 'border-outline-variant bg-surface-dim'
                    }`}
                  >
                    <span className="font-button-text text-button-text">{opt.target}</span>
                    <div className="absolute -bottom-2 -right-2 bg-on-surface text-surface font-label-bold text-[12px] px-2 py-[2px] rounded-full border-2 border-surface">
                      {opt.cost}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSynthesize}
              className="animate-sheen w-full py-md mt-sm bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-button-text text-[24px] rounded-full border-4 border-on-tertiary-fixed shadow-[0px_8px_0px_0px_#221b00] hover:translate-y-[4px] hover:shadow-[0px_4px_0px_0px_#221b00] active:translate-y-[8px] active:shadow-none transition-all relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-xs drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)]">
                <span className="material-symbols-outlined text-[28px]">auto_fix_high</span>
                Synthesize
              </span>
              <div className="sheen-layer absolute top-0 left-0 w-1/2 h-full bg-white/40 skew-x-[-20deg] -translate-x-[150%]" />
            </button>
          </div>
        </div>
      </main>

      <BottomNav activeTab="合成" />
    </div>
  );
}
