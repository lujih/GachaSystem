const RARITY_STYLES = {
  N: {
    border: 'border-outline',
    shadow: 'shadow-[4px_4px_0px_0px_#887178]',
    badge: 'bg-surface-variant text-on-surface-variant border-outline-variant',
    glow: '',
  },
  R: {
    border: 'border-outline',
    shadow: 'shadow-[4px_4px_0px_0px_#887178]',
    badge: 'bg-surface-variant text-on-surface-variant border-outline-variant',
    glow: '',
  },
  SR: {
    border: 'border-secondary',
    shadow: 'shadow-[4px_4px_0px_0px_#006783]',
    badge: 'bg-surface-bright text-on-surface border-outline',
    glow: '',
  },
  SSR: {
    border: 'border-tertiary',
    shadow: 'shadow-[4px_4px_0px_0px_#705d00]',
    badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-on-tertiary-fixed-variant shadow-[2px_2px_0px_0px_#554500]',
    glow: 'hover:shadow-[0_0_20px_rgba(255,225,115,0.4)]',
  },
  UR: {
    border: 'border-error',
    shadow: 'shadow-[6px_6px_0px_0px_#ba1a1a]',
    badge: 'bg-error text-on-error border-on-error-container shadow-[2px_2px_0px_0px_#93000a]',
    glow: 'hover:shadow-[0_0_30px_rgba(186,26,26,0.5)]',
  },
};

export default function GachaCard({ card, onClick, onLikeToggle, onBookmarkToggle, className = '' }) {
  const rarity = card.rarity || 'N';
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.N;

  return (
    <article
      onClick={onClick}
      className={`relative group cursor-pointer aspect-[3/4] rounded-xl overflow-hidden border-[3px] ${style.border} ${style.shadow} ${style.glow} hover:-translate-y-2 hover:-translate-x-1 transition-all duration-300 ${className}`}
    >
      {/* Character Image */}
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.rarity}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-container flex items-center justify-center">
          <span className="text-6xl font-black text-on-surface-variant">{rarity}</span>
        </div>
      )}

      {/* Rarity Badge */}
      <div className={`absolute top-xs right-xs font-button-text text-button-text px-3 py-1 rounded-full border-2 z-10 transform ${rarity === 'SSR' ? '-rotate-6' : rarity === 'UR' ? 'rotate-6' : ''} ${style.badge}`}>
        {rarity}
      </div>

      {/* 书签按钮 */}
      {card.id && onBookmarkToggle && (
        <button
          onClick={(e) => { e.stopPropagation(); onBookmarkToggle(card.id); }}
          className={`absolute top-xs left-xs z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors ${card.isBookmarked ? 'text-amber-400' : 'text-white/50 hover:text-white'}`}
        >
          <span className={`material-symbols-outlined text-sm ${card.isBookmarked ? 'symbol-filled' : ''}`}>bookmark</span>
        </button>
      )}

      {/* Glassmorphism Info Panel */}
      <div className="absolute bottom-xs left-xs right-xs bg-surface/40 backdrop-blur-md rounded-lg p-xs border-2 border-white/50 flex items-center justify-between z-10 translate-y-1 group-hover:translate-y-0 transition-transform">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-headline-md text-headline-md text-on-secondary drop-shadow-md leading-tight truncate">
            {card.name || rarity}
          </span>
          {card.level && (
            <span className="font-label-bold text-label-bold text-primary-fixed drop-shadow-md">
              Lv. {card.level}
            </span>
          )}
        </div>
        {/* 点赞按钮 */}
        {card.id && onLikeToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onLikeToggle(card.id); }}
            className={`flex items-center gap-0.5 text-[10px] shrink-0 ml-1 transition-colors ${card.isLiked ? 'text-error' : 'text-on-surface-variant/60 hover:text-error'}`}
          >
            <span className={`material-symbols-outlined text-sm ${card.isLiked ? 'symbol-filled' : ''}`}>favorite</span>
            {card.likeCount > 0 && <span>{card.likeCount}</span>}
          </button>
        )}
      </div>

      {/* Card Inner Shadow */}
      <div className="absolute inset-0 border-[4px] border-white/20 rounded-xl pointer-events-none mix-blend-overlay" />
    </article>
  );
}
