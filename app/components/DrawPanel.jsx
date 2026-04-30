import { useState } from 'react';
import { useGacha } from '~/hooks/useGacha';
import { useAuth } from '~/hooks/useAuth';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';

const RARITY_COLORS = {
  N: 'from-gray-400 to-gray-500',
  R: 'from-blue-400 to-blue-600',
  SR: 'from-purple-400 to-purple-600',
  SSR: 'from-amber-400 to-yellow-500',
  UR: 'from-red-500 to-rose-600',
};

const RARITY_GLOW = {
  N: '',
  R: '',
  SR: '',
  SSR: 'animate-glow-ssr',
  UR: 'animate-glow-ur',
};

export default function DrawPanel() {
  const { user, refreshUser } = useAuth();
  const { drawing, lastDraw, draw, multiDraw, clearDraw } = useGacha();
  const [animating, setAnimating] = useState(false);
  const [revealedCards, setRevealedCards] = useState([]);

  async function handleDraw(type) {
    if (drawing) return;
    setAnimating(true);
    setRevealedCards([]);
    clearDraw();

    try {
      let result;
      if (type === 'multi') {
        result = await multiDraw(10);
      } else {
        result = await draw();
      }

      if (result?.cards) {
        for (let i = 0; i < result.cards.length; i++) {
          await new Promise(r => setTimeout(r, 200));
          setRevealedCards(prev => [...prev, result.cards[i]]);
        }
      }

      setTimeout(async () => {
        try { await refreshUser(); } catch (e) {}
        setAnimating(false);
      }, 1000);
    } catch (e) {
      setAnimating(false);
    }
  }

  function getCardStyle(rarity) {
    const base = "relative w-full aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-300";
    const glow = RARITY_GLOW[rarity] || '';
    return `${base} ${glow}`;
  }

  function getRarityBadge(rarity) {
    const variants = {
      N: 'bg-gray-500',
      R: 'bg-blue-500',
      SR: 'bg-purple-500',
      SSR: 'bg-amber-500',
      UR: 'bg-red-500',
    };
    return variants[rarity] || variants.N;
  }

  return (
    <Card className="glass border-indigo-200/50 overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardContent className="p-6">
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => handleDraw('single')}
            disabled={drawing}
            className="flex-1 h-14 text-lg gradient-primary text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {drawing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🎴</span> 抽卡中...
              </span>
            ) : (
              <span>🎴 单抽</span>
            )}
          </Button>

          <Button
            onClick={() => handleDraw('multi')}
            disabled={drawing}
            className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {drawing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🎴</span> 抽卡中...
              </span>
            ) : (
              <span>✨ 十连抽</span>
            )}
          </Button>
        </div>

        {animating && revealedCards.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin text-4xl mb-4">🎴</div>
            <p className="text-gray-500">正在抽卡...</p>
          </div>
        )}

        {lastDraw && !lastDraw.cards && (
          <div className="flex justify-center">
            <div className={getCardStyle(lastDraw.card?.rarity || 'N')} style={{ maxWidth: 280 }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_COLORS[lastDraw.card?.rarity || 'N']}`} />
              {lastDraw.card?.imageUrl ? (
                <img
                  src={lastDraw.card.imageUrl}
                  alt={lastDraw.card.rarity}
                  className="absolute inset-0 w-full h-full object-cover animate-card-reveal"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-6xl font-black animate-card-reveal">
                    {lastDraw.card?.rarity || 'N'}
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <Badge className={`${getRarityBadge(lastDraw.card?.rarity || 'N')} text-white`}>
                  {lastDraw.card?.rarity || 'N'}
                </Badge>
              </div>
              {lastDraw.isPity && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-500 text-white animate-pulse">保底</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {lastDraw?.cards && (
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {lastDraw.cards.map((c, i) => (
              <div
                key={i}
                className={`${getCardStyle(c.rarity)} ${
                  revealedCards.includes(c) ? 'animate-card-reveal' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_COLORS[c.rarity]}`} />
                {c.asset?.url ? (
                  <img src={c.asset.url} alt={c.rarity} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-2xl sm:text-4xl font-black">{c.rarity}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <Badge className={`${getRarityBadge(c.rarity)} text-white text-[10px]`}>
                    {c.rarity}
                  </Badge>
                </div>
                {c.isPity && (
                  <div className="absolute top-1 right-1">
                    <span className="text-amber-400 text-xs">✨</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {lastDraw && (
          <div className="mt-4 text-center space-y-1">
            {lastDraw.expGained != null && (
              <p className="text-sm text-gray-500">+{lastDraw.expGained} 经验</p>
            )}
            {lastDraw.levelUp && (
              <p className="text-sm font-bold text-emerald-600">
                🎉 升级! Lv.{lastDraw.levelUp.newLevel} (+{lastDraw.levelUp.reward} 金币)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
