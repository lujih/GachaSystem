import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { useState } from 'react';

export default function Synthesis() {
  const { user, refreshUser } = useAuth();
  const [targetRarity, setTargetRarity] = useState('SR');
  const [lastResult, setLastResult] = useState(null);

  const craftOptions = [
    { target: 'R', source: 'N', cost: 5 },
    { target: 'SR', source: 'R', cost: 5 },
    { target: 'SSR', source: 'SR', cost: 5 },
    { target: 'UR', source: 'SSR', cost: 5 },
  ];

  async function handleSynthesize() {
    try {
      const res = await api.craft(targetRarity);
      if (res.card) setLastResult(res.card);
      await refreshUser();
    } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-halftone" />
      <div className="absolute top-20 left-10 text-tertiary-fixed opacity-50 animate-sparkle">
        <span className="material-symbols-outlined text-[40px]">colors_spark</span>
      </div>

      <Header activeTab="合成" />

      <main className="min-h-screen pt-[72px] md:pt-[80px] pb-[100px] md:pb-xl px-4 md:px-gutter relative flex flex-col items-center">
        <div className="w-full max-w-6xl mt-4 md:mt-margin mb-4 md:mb-lg flex items-center justify-between relative z-10">
          <div className="text-center w-full">
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_#ff77af]">
              突破极限
            </h1>
          </div>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-lg relative z-10">
          {/* Left: Character Card */}
          <div className="md:col-span-5 relative group">
            <div className="w-full aspect-[3/4] rounded-xl border-4 border-primary bg-surface-container-lowest/80 backdrop-blur-md shadow-[4px_4px_0px_0px_#ffb0cb] md:shadow-[8px_8px_0px_0px_#ffb0cb] transition-transform duration-300 ease-out group-hover:-rotate-2 group-hover:scale-[1.02] p-1 md:p-xs relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-6 h-6 md:w-8 md:h-8 border-t-4 border-l-4 border-secondary rounded-tl-lg z-20 m-1 md:m-xs pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-6 h-6 md:w-8 md:h-8 border-b-4 border-r-4 border-secondary rounded-br-lg z-20 m-1 md:m-xs pointer-events-none" />

              <div className="flex-1 rounded-lg overflow-hidden relative bg-surface-container-high border-2 border-outline-variant flex items-center justify-center">
                {lastResult?.imageUrl ? (
                  <img src={lastResult.imageUrl} alt={targetRarity} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-6xl md:text-8xl font-black text-primary-container/50">
                    {targetRarity}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Upgrade Mechanics */}
          <div className="md:col-span-7 flex flex-col gap-3 md:gap-margin justify-center md:pl-md">
            <div className="bg-surface-container-lowest/90 backdrop-blur-sm p-4 md:p-margin rounded-xl border-4 border-secondary-fixed shadow-[4px_4px_0px_0px_#63d3ff] md:shadow-[6px_6px_0px_0px_#63d3ff] flex items-center gap-4 md:gap-margin relative overflow-hidden">
              <div className="absolute right-0 top-0 w-20 h-20 md:w-32 md:h-32 bg-secondary-container opacity-20 rounded-bl-full -z-10" />
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full relative flex items-center justify-center shrink-0 border-2 border-surface" style={{ background: `conic-gradient(var(--color-secondary) 85%, var(--color-surface-variant) 0)` }}>
                <div className="w-10 h-10 md:w-16 md:h-16 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-inner">
                  <span className="font-headline-md text-xs md:text-headline-lg text-secondary drop-shadow-sm">85%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 md:gap-xs">
                <h2 className="font-headline-md text-sm md:text-headline-md text-on-surface">合成概率</h2>
                <p className="font-body-md text-[10px] md:text-body-md text-on-surface-variant">
                  高概率<span className="text-primary font-bold">大成功！</span>
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low p-3 md:p-margin rounded-xl border-2 border-outline-variant shadow-[3px_3px_0px_0px_#e3e2e7] md:shadow-[4px_4px_0px_0px_#e3e2e7] flex flex-col gap-2 md:gap-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-label-bold text-[10px] md:text-label-bold text-on-surface uppercase tracking-widest">选择目标</h3>
              </div>
              <div className="flex gap-2 md:gap-sm flex-wrap">
                {craftOptions.map(opt => (
                  <button
                    key={opt.target}
                    onClick={() => { setTargetRarity(opt.target); setLastResult(null); }}
                    className={`w-14 h-14 md:w-20 md:h-20 rounded-lg border-2 flex items-center justify-center relative shadow-[2px_2px_0px_0px_#ff77af] hover:translate-y-[-2px] transition-transform cursor-pointer ${
                      targetRarity === opt.target
                        ? 'border-primary bg-primary-fixed/20'
                        : 'border-outline-variant bg-surface-dim'
                    }`}
                  >
                    <span className="font-button-text text-xs md:text-button-text">{opt.target}</span>
                    <div className="absolute -bottom-1 md:-bottom-2 -right-1 md:-right-2 bg-on-surface text-surface font-label-bold text-[10px] md:text-[12px] px-1 md:px-2 py-[1px] md:py-[2px] rounded-full border-2 border-surface">
                      x{opt.cost}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSynthesize}
              className="animate-sheen w-full py-3 md:py-md mt-2 md:mt-sm bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-base md:text-[24px] rounded-full border-4 border-on-tertiary-fixed shadow-[0px_5px_0px_0px_#221b00] md:shadow-[0px_8px_0px_0px_#221b00] hover:translate-y-[3px] hover:shadow-[0px_2px_0px_0px_#221b00] active:translate-y-[5px] active:shadow-none transition-all relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-1 md:gap-xs drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)]">
                <span className="material-symbols-outlined text-xl md:text-[28px]">auto_fix_high</span>
                合成
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
