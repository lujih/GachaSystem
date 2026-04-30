import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

const SHOP_ITEMS = [
  { rarity: 'R', price: 150, color: 'from-blue-400 to-blue-600' },
  { rarity: 'SR', price: 600, color: 'from-purple-400 to-purple-600' },
  { rarity: 'SSR', price: 2500, color: 'from-amber-400 to-yellow-500' },
  { rarity: 'UR', price: 10000, color: 'from-red-500 to-rose-600' },
];

export default function ShopPanel() {
  const { user, refreshUser } = useAuth();
  const [buying, setBuying] = useState(null);

  async function handleBuy(rarity) {
    setBuying(rarity);
    try {
      await api.shopBuy(rarity);
      await refreshUser();
    } catch (e) {}
    setBuying(null);
  }

  return (
    <Card className="glass border-indigo-200/50 overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🛒</span> 商店
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {SHOP_ITEMS.map(item => (
            <Button
              key={item.rarity}
              variant="outline"
              onClick={() => handleBuy(item.rarity)}
              disabled={buying === item.rarity || (user?.coins || 0) < item.price}
              className="h-auto p-0 overflow-hidden bg-white/50 hover:bg-white/80 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <div className="w-full p-4 text-center">
                <div className={`w-16 h-20 mx-auto mb-3 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-white text-2xl font-black">{item.rarity}</span>
                </div>
                <p className="font-bold text-gray-800">{item.rarity} 卡片</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span>🪙</span>
                  <span className="text-amber-700 font-bold">{item.price}</span>
                </div>
                {(user?.coins || 0) < item.price && (
                  <p className="text-xs text-red-500 mt-1">积分不足</p>
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
