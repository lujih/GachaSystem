import { useState, useEffect } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import { rarityBg, RARITY_ORDER } from '~/lib/rarity';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

export default function Inventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
  const [crafting, setCrafting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getInventory().then(res => setInventory(res.data || res)).catch(() => {});
  }, [user]);

  async function handleCraft(rarity) {
    setCrafting(true);
    try {
      const res = await api.craft(rarity);
      if (res.success) {
        const inv = await api.getInventory();
        setInventory(inv.data || inv);
      }
    } catch (e) {}
    setCrafting(false);
  }

  const craftOptions = [
    { target: 'R', source: 'N', cost: 5 },
    { target: 'SR', source: 'R', cost: 5 },
    { target: 'SSR', source: 'SR', cost: 5 },
    { target: 'UR', source: 'SSR', cost: 5 },
  ];

  return (
    <Card className="glass border-indigo-200/50 overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🎒</span> 背包
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {RARITY_ORDER.map(rarity => (
            <div key={rarity} className="text-center p-3 rounded-lg bg-white/50 border border-white/20">
              <Badge className={`${rarityBg(rarity)} text-white mb-2`}>{rarity}</Badge>
              <p className="text-2xl font-bold text-gray-800">{inventory[rarity] || 0}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200/50 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">合成</h4>
          <div className="grid grid-cols-2 gap-2">
            {craftOptions.map(opt => (
              <Button
                key={opt.target}
                variant="outline"
                size="sm"
                onClick={() => handleCraft(opt.target)}
                disabled={crafting || (inventory[opt.source] || 0) < opt.cost}
                className="justify-start gap-2 bg-white/50 hover:bg-white/80"
              >
                <Badge className={`${RARITY_CONFIG[opt.source].color} text-white text-[10px]`}>
                  {opt.source}×{opt.cost}
                </Badge>
                <span className="text-gray-400">→</span>
                <Badge className={`${RARITY_CONFIG[opt.target].color} text-white text-[10px]`}>
                  {opt.target}×1
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
