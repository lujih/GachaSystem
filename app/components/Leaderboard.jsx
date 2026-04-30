import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';

export default function Leaderboard({ showcase = [] }) {
  const cards = showcase.slice(0, 6);

  return (
    <Card className="glass border-indigo-200/50 overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🏆</span> 最新掉落
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">🎴</p>
            <p>暂无掉落记录</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {cards.map((card, i) => (
              <div
                key={i}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                {card.url ? (
                  <img
                    src={card.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-2xl">🎴</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-xs font-medium truncate">{card.username || '匿名'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
