import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import Inventory from '~/components/Inventory';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { api } from '~/lib/api';

export function loader() {
  return null;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header />
        <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
          <Card className="glass border-indigo-200/50 overflow-hidden">
            <div className="h-1 gradient-primary" />
            <CardContent className="p-12 text-center">
              <p className="text-5xl mb-4">👤</p>
              <p className="text-gray-500 mb-4">请先登录</p>
              <Button
                onClick={() => navigate('/login')}
                className="gradient-primary text-white"
              >
                去登录
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        <Card className="glass border-indigo-200/50 overflow-hidden mb-6">
          <div className="h-1 gradient-primary" />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="text-white text-3xl font-black">
                  {(user.nickname || user.username || '?')[0].toUpperCase()}
                </span>
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  {user.nickname || user.username}
                </h2>
                <p className="text-gray-500">
                  @{user.username}
                </p>
                {user.title && (
                  <Badge className="mt-2 bg-amber-500 text-white">
                    {user.title.name}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="px-4 py-2 rounded-lg bg-white/50">
                  <p className="text-2xl font-bold text-indigo-600">{user.level}</p>
                  <p className="text-xs text-gray-500">等级</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-white/50">
                  <p className="text-2xl font-bold text-amber-600">{user.coins}</p>
                  <p className="text-xs text-gray-500">金币</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-white/50">
                  <p className="text-2xl font-bold text-purple-600">{user.drawCount || 0}</p>
                  <p className="text-xs text-gray-500">抽卡</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="inventory">
          <TabsList className="grid w-full grid-cols-2 glass mb-6">
            <TabsTrigger value="inventory" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              🎒 背包
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              📅 活动
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <Inventory />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="glass border-indigo-200/50 overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📅</span> 每日签到
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">每天签到可以获得金币和经验奖励</p>
                <Button
                  onClick={async () => {
                    try {
                      await api.checkIn();
                      await refreshUser();
                    } catch (e) {}
                  }}
                  className="gradient-primary text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
                >
                  签到
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
