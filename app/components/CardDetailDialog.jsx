import { useEffect } from 'react';
import { rarityBg, rarityBorder, rarityGradient, rarityGlow } from '~/lib/rarity';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CardDetailDialog({ card, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!card) return null;
  const rarity = card.rarity || 'N';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <span className="material-symbols-outlined text-2xl">close</span>
      </button>

      {/* 卡片容器 */}
      <div
        className="relative w-[92vw] max-w-[480px] md:max-w-xl lg:max-w-2xl animate-card-flip-3d"
        onClick={e => e.stopPropagation()}
      >
        {/* 卡片边框发光 */}
        <div className={`absolute -inset-1 rounded-2xl ${rarityGlow(rarity)} opacity-60`} />

        {/* 卡片主体 */}
        <div className={`relative rounded-2xl overflow-hidden border-[3px] ${rarityBorder(rarity)}`}>
          {/* 图片 */}
          <div className={`relative aspect-[3/4] bg-gradient-to-br ${rarityGradient(rarity)}`}>
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-7xl font-black drop-shadow-lg">{rarity}</span>
              </div>
            )}

            {/* 稀有度标签 */}
            <div className="absolute top-3 left-3">
              <span className={`inline-block text-sm font-black text-white px-3 py-1.5 rounded-full ${rarityBg(rarity)} shadow-lg`}>
                {rarity}
              </span>
            </div>

            {/* 底部信息栏 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white font-bold text-base md:text-lg drop-shadow-md">
                    {card.name || '匿名'}
                  </p>
                  {card.time && (
                    <p className="text-white/60 text-xs md:text-sm mt-0.5">
                      {formatTime(card.time)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
