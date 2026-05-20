import { useState, useEffect } from 'react';

const RARITY_GRADIENT = {
  N: 'from-gray-400 to-gray-500',
  R: 'from-blue-400 to-blue-600',
  SR: 'from-purple-400 to-purple-600',
  SSR: 'from-amber-400 to-yellow-500',
  UR: 'from-red-500 to-rose-600',
};

const RARITY_BADGE = {
  N: 'bg-gray-500',
  R: 'bg-blue-500',
  SR: 'bg-purple-500',
  SSR: 'bg-amber-500',
  UR: 'bg-red-500',
};

export default function DrawResultDialog({ open, onClose, result }) {
  const [revealed, setRevealed] = useState([]);
  const cards = result?.cards || (result?.card ? [result.card] : []);

  useEffect(() => {
    if (!open) { setRevealed([]); return; }
    setRevealed([]);
    if (cards.length === 0) return;
    let i = 0;
    const timer = setInterval(() => {
      setRevealed(prev => [...prev, cards[i]]);
      i++;
      if (i >= cards.length) clearInterval(timer);
    }, 180);
    return () => clearInterval(timer);
  }, [open]);

  function getSrc(card) {
    return card.imageUrl || card.url || card?.asset?.url;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[95vw] max-w-sm md:max-w-xl max-h-[90vh] overflow-y-auto bg-surface-bright border-4 border-primary-fixed shadow-[4px_4px_0px_0px_rgba(255,119,175,0.3)] md:shadow-[6px_6px_0px_0px_rgba(255,119,175,0.3)] p-3 md:p-6 rounded-2xl md:rounded-[32px]">
        <div className="text-center mb-3 md:mb-4">
          <h2 className="font-headline-md text-lg md:text-display-lg text-primary flex items-center justify-center gap-1.5 md:gap-2">
            <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim text-lg md:text-2xl">auto_awesome</span>
            抽卡结果
          </h2>
        </div>

        {cards.length > 1 ? (
          <div className="grid grid-cols-5 gap-1 md:gap-2.5">
            {cards.map((c, i) => (
              <div
                key={i}
                className={`relative aspect-[3/4] rounded-md md:rounded-xl border-2 border-outline-variant overflow-hidden ${
                  revealed.includes(c) ? 'animate-card-reveal' : 'opacity-0 scale-75'
                }`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[c.rarity || 'N']}`} />
                {getSrc(c) ? (
                  <img src={getSrc(c)} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg md:text-2xl font-black">{c.rarity || 'N'}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
                  <span className={`inline-block text-[9px] md:text-[11px] font-bold text-white px-1.5 py-0.5 rounded ${RARITY_BADGE[c.rarity || 'N']}`}>
                    {c.rarity || 'N'}
                  </span>
                </div>
                {c.isPity && (
                  <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                    <span className="material-symbols-outlined text-amber-400 symbol-filled text-xs md:text-sm">stars</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative w-44 md:w-60 aspect-[3/4] rounded-xl overflow-hidden border-4 border-primary-fixed shadow-[4px_4px_0px_0px_rgba(255,119,175,0.3)] animate-card-reveal">
              <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[cards[0]?.rarity || 'N']}`} />
              {getSrc(cards[0]) ? (
                <img src={getSrc(cards[0])} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-5xl md:text-6xl font-black">{cards[0]?.rarity || 'N'}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black/60 to-transparent">
                <span className={`inline-block text-sm font-bold text-white px-2 py-1 rounded ${RARITY_BADGE[cards[0]?.rarity || 'N']}`}>
                  {cards[0]?.rarity || 'N'}
                </span>
              </div>
              {cards[0]?.isPity && (
                <div className="absolute top-2 right-2">
                  <span className="inline-block bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">保底</span>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-3 md:mt-4 text-center space-y-0.5 md:space-y-1">
            {result.expGained != null && (
              <p className="text-xs md:text-sm text-on-surface-variant">+{result.expGained} 经验</p>
            )}
            {result.levelUp && (
              <p className="text-xs md:text-sm font-bold text-emerald-600">
                Lv.{result.levelUp.newLevel} (+{result.levelUp.reward} 金币)
              </p>
            )}
          </div>
        )}

        <div className="mt-3 md:mt-4 flex justify-center">
          <button
            onClick={onClose}
            className="bg-primary text-on-primary font-button-text text-xs md:text-sm px-6 md:px-8 py-2 md:py-2.5 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
