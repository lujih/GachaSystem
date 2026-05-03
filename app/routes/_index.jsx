import { useLoaderData } from '@remix-run/react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { useGacha } from '~/hooks/useGacha';
import { useState } from 'react';

export async function loader({ context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { showcase: [], announcement: null };
  }
  try {
    const result = await env.DB.prepare(
      'SELECT g.*, u.username FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
    ).all();
    const announcement = await env.KV_CACHE?.get('system:announcement', { type: 'json' });
    return {
      showcase: result.results || [],
      announcement: announcement || null,
    };
  } catch (e) {
    return { showcase: [], announcement: null };
  }
}

export default function Index() {
  const { showcase, announcement } = useLoaderData();
  const { user, refreshUser } = useAuth();
  const { drawing, lastDraw, draw, multiDraw } = useGacha();
  const [poolType, setPoolType] = useState('limited');

  async function handleDraw(type) {
    try {
      if (type === 'multi') {
        await multiDraw(10);
      } else {
        await draw();
      }
      await refreshUser();
    } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-background bg-halftone relative">
      <Header activeTab="大厅" />

      <main className="max-w-[1440px] mx-auto w-full px-3 md:px-8 py-4 md:py-12 pt-[72px] md:pt-[88px] pb-[100px] md:pb-8">
        {/* Banner Tabs */}
        <div className="flex justify-center md:justify-start gap-2 md:gap-4 mb-4 md:mb-8 relative z-10">
          <button
            onClick={() => setPoolType('limited')}
            className={`font-label-bold text-xs md:text-label-bold px-4 md:px-8 py-2 md:py-3 rounded-full border-2 transition-transform hover:-translate-y-1 ${
              poolType === 'limited'
                ? 'bg-primary text-on-primary border-primary-container shadow-[2px_2px_0px_0px_rgba(255,119,175,0.4)] md:shadow-[4px_4px_0px_0px_rgba(255,119,175,0.4)]'
                : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-variant'
            }`}
          >
            限定池
          </button>
          <button
            onClick={() => setPoolType('permanent')}
            className={`font-label-bold text-xs md:text-label-bold px-4 md:px-8 py-2 md:py-3 rounded-full border-2 transition-transform hover:-translate-y-1 ${
              poolType === 'permanent'
                ? 'bg-primary text-on-primary border-primary-container shadow-[2px_2px_0px_0px_rgba(255,119,175,0.4)] md:shadow-[4px_4px_0px_0px_rgba(255,119,175,0.4)]'
                : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-variant'
            }`}
          >
            常驻池
          </button>
        </div>

        {/* Banner Container */}
        <div className="relative w-full rounded-2xl md:rounded-[32px] border-4 border-primary-fixed overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[8px_8px_0px_0px_rgba(255,119,175,0.2)] bg-surface-bright flex flex-col md:flex-row">
          <div className="absolute inset-0 opacity-10 bg-halftone" />

          {/* Character Art Section */}
          <div className="relative w-full md:w-2/3 h-[240px] md:h-auto overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/30 to-secondary-container/30" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-bright via-surface-bright/50 to-transparent md:w-3/4" />

            <div className="absolute bottom-0 left-0 p-4 md:p-12 w-full md:w-auto">
              <div className="inline-block bg-secondary text-on-secondary font-label-bold text-[10px] md:text-label-bold px-2 md:px-4 py-1 rounded-full mb-2 md:mb-4 border-2 border-secondary-fixed shadow-[2px_2px_0px_0px_rgba(0,103,131,0.5)]">
                概率 UP!
              </div>
              <h2 className="font-headline-md md:text-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-1 md:mb-2">
                Radiant Starlight
              </h2>
              <h3 className="font-body-lg md:text-headline-md text-headline-md text-on-surface-variant drop-shadow-[1px_1px_0px_rgba(255,255,255,1)]">
                SSR: Hikari - The Luminary
              </h3>
            </div>
          </div>

          {/* Gacha Controls */}
          <div className="relative w-full md:w-1/3 bg-white/80 backdrop-blur-md border-t-4 md:border-t-0 md:border-l-4 border-outline-variant p-4 md:p-8 flex flex-col justify-between z-10">
            <div className="bg-surface-container-low rounded-2xl p-4 md:p-6 border-2 border-outline-variant shadow-[2px_2px_0px_0px_rgba(136,113,120,0.1)] md:shadow-[4px_4px_0px_0px_rgba(136,113,120,0.1)]">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <span className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest">
                  保底进度
                </span>
                <span className="font-button-text text-sm md:text-button-text text-primary">45/100</span>
              </div>
              <div className="h-4 md:h-6 w-full bg-surface-variant rounded-full overflow-hidden border-2 border-outline-variant relative">
                <div className="absolute top-0 left-0 h-full w-[45%] bg-gradient-to-r from-primary-container to-secondary-container rounded-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 rounded-t-full" />
                </div>
              </div>
              <p className="font-body-md text-xs md:text-body-md text-on-surface-variant mt-2 md:mt-3 text-center">
                再抽 55 次必出 SSR
              </p>
            </div>

            <div className="mt-4 md:mt-8 flex flex-col gap-3 md:gap-6">
              <button
                onClick={() => handleDraw('multi')}
                disabled={drawing}
                className="relative group bg-tertiary-fixed-dim text-on-tertiary-fixed font-button-text text-sm md:text-button-text py-3 md:py-5 px-4 md:px-8 rounded-full border-4 border-tertiary-container shadow-[4px_4px_0px_0px_#705d00] md:shadow-[6px_6px_0px_0px_#705d00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex justify-between items-center overflow-hidden"
              >
                <div className="absolute inset-0 w-1/4 h-full bg-white/40 -skew-x-12 -translate-x-full group-hover:animate-[sheen_1s_ease-in-out]" />
                <span className="flex items-center gap-1 md:gap-2 text-base md:text-2xl">
                  <span className="material-symbols-outlined symbol-filled text-tertiary">diamond</span>
                  1600
                </span>
                <span className="uppercase tracking-wider text-xs md:text-base">十连抽</span>
              </button>

              <button
                onClick={() => handleDraw('single')}
                disabled={drawing}
                className="bg-surface-container text-on-surface font-button-text text-sm md:text-button-text py-3 md:py-4 px-4 md:px-8 rounded-full border-4 border-outline-variant shadow-[3px_3px_0px_0px_#887178] md:shadow-[4px_4px_0px_0px_#887178] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex justify-between items-center"
              >
                <span className="flex items-center gap-1 md:gap-2">
                  <span className="material-symbols-outlined symbol-filled text-tertiary">diamond</span>
                  160
                </span>
                <span className="uppercase tracking-wider text-xs md:text-base text-on-surface-variant">单抽</span>
              </button>
            </div>
          </div>

          <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim absolute top-8 left-8 md:top-12 md:left-12 text-2xl md:text-4xl animate-sparkle">star</span>
          <span className="material-symbols-outlined symbol-filled text-primary-container absolute bottom-20 left-1/2 md:bottom-32 text-lg md:text-2xl animate-sparkle delay-100">star</span>
          <span className="material-symbols-outlined symbol-filled text-secondary-container absolute top-1/4 right-1/2 text-2xl md:text-3xl animate-sparkle delay-300">star</span>
        </div>

        {/* Draw Result */}
        {lastDraw && (
          <div className="mt-4 md:mt-8 bg-surface rounded-2xl md:rounded-[32px] border-4 border-primary-fixed p-4 md:p-8 shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[8px_8px_0px_0px_rgba(255,119,175,0.2)]">
            <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
              <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">auto_awesome</span>
              抽卡结果
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
              {(lastDraw.cards || [lastDraw]).map((card, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-lg md:rounded-xl overflow-hidden border-2 md:border-3 border-outline-variant shadow-[2px_2px_0px_0px_rgba(136,113,120,0.3)] animate-card-reveal"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {card.asset?.url || card.card?.imageUrl ? (
                    <img
                      src={card.asset?.url || card.card?.imageUrl}
                      alt={card.rarity || card.card?.rarity}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="text-2xl md:text-4xl font-black">{card.rarity || card.card?.rarity || 'N'}</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 right-1 md:bottom-2 md:left-2 md:right-2 bg-surface/60 backdrop-blur-md rounded p-1 md:p-2 text-center">
                    <span className="font-label-bold text-[10px] md:text-label-bold">{card.rarity || card.card?.rarity || 'N'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav activeTab="大厅" />
    </div>
  );
}
