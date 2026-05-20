import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';

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
    }, 200);
    return () => clearInterval(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-bright border-4 border-primary-fixed shadow-[4px_4px_0px_0px_rgba(255,119,175,0.3)] md:shadow-[6px_6px_0px_0px_rgba(255,119,175,0.3)] p-3 md:p-8">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary flex items-center justify-center gap-2">
            <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">auto_awesome</span>
            抽卡结果
          </h2>
        </div>

        {cards.length > 1 ? (
          <div className="grid grid-cols-5 gap-1.5 md:gap-3">
            {cards.map((c, i) => (
              <div
                key={i}
                className={`relative aspect-[3/4] rounded-lg md:rounded-xl border-2 border-outline-variant overflow-hidden ${
                  revealed.includes(c) ? 'animate-card-reveal' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[c.rarity || 'N']}`} />
                {c.imageUrl || c.url || c.asset?.url ? (
                  <img src={c.imageUrl || c.url || c.asset?.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xl md:text-3xl font-black">{c.rarity || 'N'}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1 md:p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <Badge className={`${RARITY_BADGE[c.rarity || 'N']} text-white text-[10px]`}>
                    {c.rarity || 'N'}
                  </Badge>
                </div>
                {c.isPity && (
                  <div className="absolute top-1 right-1">
                    <span className="material-symbols-outlined text-amber-400 symbol-filled text-sm">stars</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative w-48 md:w-64 aspect-[3/4] rounded-xl overflow-hidden border-4 border-primary-fixed shadow-[4px_4px_0px_0px_rgba(255,119,175,0.3)] animate-card-reveal">
              <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[cards[0]?.rarity || 'N']}`} />
              {cards[0]?.imageUrl || cards[0]?.url || cards[0]?.asset?.url ? (
                <img src={cards[0].imageUrl || cards[0].url || cards[0].asset?.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-6xl font-black">{cards[0]?.rarity || 'N'}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <Badge className={`${RARITY_BADGE[cards[0]?.rarity || 'N']} text-white`}>
                  {cards[0]?.rarity || 'N'}
                </Badge>
              </div>
              {cards[0]?.isPity && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-500 text-white animate-pulse">保底</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 md:mt-6 text-center space-y-1">
            {result.expGained != null && (
              <p className="text-sm text-on-surface-variant">+{result.expGained} 经验</p>
            )}
            {result.levelUp && (
              <p className="text-sm font-bold text-emerald-600">
                🎉 升级! Lv.{result.levelUp.newLevel} (+{result.levelUp.reward} 金币)
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <button
            onClick={onClose}
            className="bg-primary text-on-primary font-button-text text-sm px-8 py-2 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            确定
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
