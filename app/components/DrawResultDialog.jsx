import { useState, useEffect, useCallback } from 'react';

const RARITY_GRADIENT = {
  N: 'from-gray-400 to-gray-500',
  R: 'from-blue-400 to-blue-600',
  SR: 'from-purple-400 to-purple-600',
  SSR: 'from-amber-400 to-yellow-500',
  UR: 'from-red-500 to-rose-600',
};

const RARITY_BG = {
  N: 'bg-gray-500',
  R: 'bg-blue-500',
  SR: 'bg-purple-500',
  SSR: 'bg-amber-500',
  UR: 'bg-red-500',
};

const RARITY_GLOW = {
  N: '',
  R: '',
  SR: 'shadow-[0_0_15px_rgba(139,92,246,0.4)]',
  SSR: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
  UR: 'shadow-[0_0_35px_rgba(239,68,68,0.5)]',
};

const RARITY_BORDER = {
  N: 'border-outline-variant',
  R: 'border-blue-300',
  SR: 'border-purple-400',
  SSR: 'border-amber-400',
  UR: 'border-red-500',
};

function getSrc(card) {
  return card?.imageUrl || card?.url || card?.asset?.url || null;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function clampRatio(w, h) {
  const r = w / h;
  return Math.max(0.5, Math.min(r, 2));
}

export default function DrawResultDialog({ open, onClose, result }) {
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [dims, setDims] = useState([]);

  const cards = result?.cards || (result?.card ? [{ ...result.card, rarity: result.rarity, isPity: result.isPity }] : []);
  const total = cards.length;
  const card = cards[current];
  const isLast = current >= total - 1;
  const rarity = card?.rarity || 'N';

  // 预加载所有图片尺寸
  useEffect(() => {
    if (!open || total === 0) { setDims([]); return; }
    let cancelled = false;
    Promise.all(cards.map(c => preloadImage(getSrc(c)))).then(results => {
      if (!cancelled) setDims(results);
    });
    return () => { cancelled = true; };
  }, [open, total]);

  useEffect(() => {
    if (!open) { setCurrent(0); setShowAll(false); setAnimKey(0); return; }
    setCurrent(0);
    setShowAll(false);
    setAnimKey(prev => prev + 1);
  }, [open]);

  const next = useCallback(() => {
    if (current < total - 1) {
      setCurrent(prev => prev + 1);
      setAnimKey(prev => prev + 1);
    }
  }, [current, total]);

  const skip = useCallback(() => {
    setShowAll(true);
  }, []);

  // 当前卡片的宽高比
  const curDim = dims[current];
  const curRatio = curDim ? clampRatio(curDim.w, curDim.h) : 3 / 4;

  // 全屏展示模式下的自适应高度（基于视口宽度 × 宽高比，限制在视口范围内）
  const cardMaxH = 'min(70vh, 480px)';
  const cardStyle = curDim
    ? { aspectRatio: `${curDim.w} / ${curDim.h}`, maxHeight: cardMaxH }
    : { aspectRatio: '3 / 4', maxHeight: cardMaxH };

  if (!open || total === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <span className="material-symbols-outlined text-2xl">close</span>
      </button>

      {showAll ? (
        /* 全部展示 — 自适应瀑布流 */
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto px-4 py-12">
          <div className="columns-3 sm:columns-4 md:columns-5 gap-2 space-y-2">
            {cards.map((c, i) => {
              const dim = dims[i];
              const ratio = dim ? clampRatio(dim.w, dim.h) : 3 / 4;
              return (
                <div
                  key={i}
                  className="relative break-inside-avoid rounded-md overflow-hidden border-2 border-outline-variant animate-card-reveal"
                  style={{ aspectRatio: `${ratio}`, animationDelay: `${i * 0.05}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[c.rarity || 'N']}`} />
                  {getSrc(c) ? (
                    <img src={getSrc(c)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-lg font-black">{c.rarity || 'N'}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-gradient-to-t from-black/60 to-transparent">
                    <span className={`inline-block text-[9px] font-bold text-white px-1 rounded ${RARITY_BG[c.rarity || 'N']}`}>{c.rarity || 'N'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={onClose} className="bg-white/20 text-white font-button-text text-sm px-8 py-2.5 rounded-full hover:bg-white/30 transition-colors">关闭</button>
          </div>
        </div>
      ) : (
        /* 轮播主视图 — 自适应图片比例 */
        <div className="flex flex-col items-center gap-4 md:gap-6 w-full px-4">
          {/* 卡片容器：宽度固定，高度由图片比例决定 */}
          <div
            className="relative w-[80vw] max-w-[320px] md:max-w-sm perspective-[800px]"
            style={cardStyle}
          >
            <div
              key={animKey}
              className={`w-full h-full rounded-xl md:rounded-2xl overflow-hidden border-[3px] ${RARITY_BORDER[rarity]} ${RARITY_GLOW[rarity]} animate-card-flip-3d`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[rarity]}`} />
              {getSrc(card) ? (
                <img src={getSrc(card)} alt="" className="absolute inset-0 w-full h-full object-contain" loading="eager" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-6xl md:text-7xl font-black drop-shadow-lg">{rarity}</span>
                </div>
              )}
              <div className="absolute inset-0 border-[4px] border-white/10 rounded-xl md:rounded-2xl pointer-events-none" />

              {/* 稀有度角标 */}
              <div className="absolute top-2 left-2 md:top-3 md:left-3">
                <span className={`inline-block text-xs md:text-sm font-black text-white px-2.5 py-1 rounded-full ${RARITY_BG[rarity]} shadow-lg`}>
                  {rarity}
                </span>
              </div>

              {/* 保底标记 */}
              {card?.isPity && (
                <div className="absolute top-2 right-2 md:top-3 md:right-3">
                  <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-full animate-pulse shadow-lg">
                    <span className="material-symbols-outlined text-sm">stars</span>
                    保底
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 圆点指示器 */}
          {total > 1 && (
            <div className="flex gap-1.5 md:gap-2">
              {cards.map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i < current
                      ? 'w-2 h-2 bg-primary/60'
                      : i === current
                      ? 'w-3 h-3 bg-primary animate-pulse'
                      : 'w-2 h-2 border border-outline-variant'
                  }`}
                />
              ))}
            </div>
          )}

          {/* 信息区 */}
          <div className="text-center text-white/80 space-y-1">
            <p className="font-headline-md text-lg md:text-xl text-white drop-shadow-lg">
              {rarity === 'UR' ? '🌟 Ultimate Rare!' :
               rarity === 'SSR' ? '✨ Super Super Rare!' :
               rarity === 'SR' ? '💎 Super Rare!' :
               rarity === 'R' ? '🔷 Rare' : 'Normal'}
            </p>
            {result && (
              <>
                {result.expGained != null && (
                  <p className="text-sm text-white/60">+{result.expGained} 经验</p>
                )}
                {result.levelUp && (
                  <p className="text-sm font-bold text-emerald-400">
                    Lv.{result.levelUp.newLevel} (+{result.levelUp.reward} 金币)
                  </p>
                )}
              </>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-1">
            {total > 1 && !isLast && (
              <button
                onClick={skip}
                className="bg-white/10 text-white/70 font-button-text text-sm px-5 py-2 rounded-full hover:bg-white/20 transition-colors"
              >
                跳过
              </button>
            )}
            <button
              onClick={isLast ? onClose : next}
              className="bg-primary text-on-primary font-button-text text-sm px-8 py-2.5 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              {isLast ? '确定' : (
                <span className="flex items-center gap-1.5">
                  下一张
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
