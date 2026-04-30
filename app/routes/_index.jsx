import { useLoaderData } from '@remix-run/react';
import Header from '~/components/Header';
import DrawPanel from '~/components/DrawPanel';
import Leaderboard from '~/components/Leaderboard';
import Inventory from '~/components/Inventory';
import DiceGame from '~/components/DiceGame';
import ShopPanel from '~/components/ShopPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Card, CardContent } from '~/components/ui/card';
import { useState } from 'react';

export async function loader({ context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { showcase: [], announcement: null };
  }
  try {
    const result = await env.DB.prepare(
      'SELECT g.*, u.username FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
    ).all();
    const announcement = await env.KV_CACHE?.get('system:announcement', { type: 'json' });
    return {
      showcase: result.results || [],
      announcement: announcement || null,
    };
  } catch (e) {
    return { showcase: [], announcement: null };
  }
}

export default function Index() {
  const { showcase, announcement } = useLoaderData();
  const [tab, setTab] = useState('draw');

  return (
    <div className="min-h-screen gradient-bg">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        {announcement?.enabled && announcement?.content && (
          <Card className="mb-6 glass border-indigo-200/50 overflow-hidden">
            <div className="h-1 gradient-primary" />
            <CardContent className="p-4">
              <h3 className="font-bold text-indigo-900 mb-1">{announcement.title}</h3>
              <p className="text-sm text-gray-600">{announcement.content}</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="draw" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              🎴 抽卡
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              🎒 背包
            </TabsTrigger>
            <TabsTrigger value="dice" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              🎲 骰子
            </TabsTrigger>
            <TabsTrigger value="shop" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              🛒 商店
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw">
            <DrawPanel />
          </TabsContent>
          <TabsContent value="inventory">
            <Inventory />
          </TabsContent>
          <TabsContent value="dice">
            <DiceGame />
          </TabsContent>
          <TabsContent value="shop">
            <ShopPanel />
          </TabsContent>
        </Tabs>

        <Leaderboard showcase={showcase} />
      </main>
    </div>
  );
}
