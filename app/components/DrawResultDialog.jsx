import { useState, useEffect, useCallback } from 'react';
import { rarityBg, rarityGradient } from '~/lib/rarity';

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
  // spec: 关闭 → 遮罩 fade out。先播淡出动画再真正卸载
  const [closing, setClosing] = useState(false);
  // spec: 图片加载失败 → 稀有度渐变背景 + 大字母。
  // 此前只在 imageUrl 为空时降级，URL 存在但加载失败会显示浏览器破图占位
  const [imgFailed, setImgFailed] = useState({});

  const cards = result?.cards || (result?.card ? [{ ...result.card, rarity: result.rarity, isPity: result.isPity }] : []);
  const total = cards.length;
  const card = cards[current];
  const isLast = current >= total - 1;
  const rarity = card?.rarity || 'N';
  const curSrc = getSrc(card);
  const curImgBroken = !!curSrc && imgFailed[current];

  useEffect(() => {
    if (!open || total === 0) { setDims([]); return; }
    let cancelled = false;
    Promise.all(cards.map(c => preloadImage(getSrc(c)))).then(results => {
      if (!cancelled) setDims(results);
    });
    return () => { cancelled = true; };
  }, [open, total]);

  useEffect(() => {
    if (!open) { setCurrent(0); setShowAll(false); setAnimKey(0); setClosing(false); return; }
    setCurrent(0);
    setShowAll(false);
    setClosing(false);
    setImgFailed({});
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

  /** 关闭：先播 200ms 淡出，再通知父组件卸载 */
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  }, [closing, onClose]);

  // 弹窗打开时支持 Esc 关闭（此前只有 CardDetailDialog 监听，两个弹窗行为不一致）
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, requestClose]);

  const curDim = dims[current];
  const cardMaxH = 'min(75vh, 600px)';
  const cardStyle = curDim && !curImgBroken
    ? { aspectRatio: `${curDim.w} / ${curDim.h}`, maxHeight: cardMaxH }
    : { aspectRatio: '3 / 4', maxHeight: cardMaxH };

  if (!open || total === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="抽卡结果"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      <button
        type="button"
        onClick={requestClose}
        aria-label="关闭抽卡结果"
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-2xl">close</span>
      </button>

      {showAll ? (
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto px-4 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {cards.map((c, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-outline-variant animate-card-reveal"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${rarityGradient(c.rarity || 'N')}`} />
                {getSrc(c) && !imgFailed[i] ? (
                  <img
                    src={getSrc(c)}
                    alt={`${c.rarity || 'N'} 卡片`}
                    onError={() => setImgFailed(prev => ({ ...prev, [i]: true }))}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span aria-hidden="true" className="text-white text-lg font-black">{c.rarity || 'N'}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-gradient-to-t from-black/60 to-transparent">
                  <span className={`inline-block text-[9px] font-bold text-white px-1 rounded ${rarityBg(c.rarity || 'N')}`}>{c.rarity || 'N'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={requestClose} className="bg-white/20 text-white font-button-text text-sm px-8 py-2.5 rounded-full hover:bg-white/30 transition-colors">关闭</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 md:gap-6 w-full px-4">
          {/* spec 响应式表：移动端 w-[75vw]，桌面端 max-w-xs(20rem)。
              此前实现为 w-[90vw] max-w-[420px] md:max-w-2xl，卡片明显过小 */}
          <div
            className="relative w-[75vw] max-w-xs md:max-w-sm perspective-[800px]"
            style={cardStyle}
          >
            {/* UR 彩虹旋转边框：置于卡片内容之下，用 inset 露出 3px 形成边框 */}
            {rarity === 'UR' && (
              <div aria-hidden="true" className="absolute -inset-[3px] rounded-xl md:rounded-2xl animate-rainbow-ur" />
            )}
            <div
              key={animKey}
              // spec: 用户点击卡片 → 下一张翻转（此前卡片不可点击，只能点按钮）
              onClick={() => (isLast ? requestClose() : next())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  isLast ? requestClose() : next();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={isLast ? `确定，共 ${total} 张` : `查看下一张（第 ${current + 2} 张，共 ${total} 张）`}
              className={`relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden border-[3px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white animate-card-flip-3d ${
                // spec 稀有度光效：SR 淡紫静态、SSR 金色脉冲、UR 彩虹旋转（外层实现）
                rarity === 'SSR' ? 'animate-glow-ssr' : rarity === 'SR' ? 'animate-glow-sr' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${rarityGradient(rarity)}`} />
              {curSrc && !curImgBroken ? (
                <img
                  src={curSrc}
                  alt={`${rarity} 卡片`}
                  onError={() => setImgFailed(prev => ({ ...prev, [current]: true }))}
                  className="absolute inset-0 w-full h-full object-contain"
                  loading="eager"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span aria-hidden="true" className="text-white text-6xl md:text-7xl font-black drop-shadow-lg">{rarity}</span>
                </div>
              )}
              <div className="absolute inset-0 border-[4px] border-white/10 rounded-xl md:rounded-2xl pointer-events-none" />

              <div className="absolute top-2 left-2 md:top-3 md:left-3">
                <span className={`inline-block text-xs md:text-sm font-black text-white px-2.5 py-1 rounded-full ${rarityBg(rarity)} shadow-lg`}>
                  {rarity}
                </span>
              </div>

              {card?.isPity && (
                <div className="absolute top-2 right-2 md:top-3 md:right-3">
                  {/* spec: 保底标记 = 右上角 🌟 旋转放大动画（此前只有 pulse） */}
                  <span
                    key={`pity-${animKey}`}
                    className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-full animate-pity-badge shadow-lg"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">stars</span>
                    保底
                  </span>
                </div>
              )}
            </div>
          </div>

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

          <div className="flex gap-3 mt-1">
            {total > 1 && !isLast && (
              <button
                type="button"
                onClick={skip}
                className="bg-white/10 text-white/70 font-button-text text-sm px-5 py-2 rounded-full hover:bg-white/20 transition-colors"
              >
                跳过
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? requestClose : next}
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
