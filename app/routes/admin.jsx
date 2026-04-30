import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import { api } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';

const RARITY_COLORS = {
  N: 'bg-gray-500',
  R: 'bg-blue-500',
  SR: 'bg-purple-500',
  SSR: 'bg-amber-500',
  UR: 'bg-red-500',
};

export default function Admin() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', content: '' });

  async function handleVerify() {
    setError('');
    try {
      const res = await api.adminVerify(password);
      if (res.success) {
        setAuthed(true);
        handleLoadUsers();
      }
    } catch (e) {
      setError('密码错误');
    }
  }

  async function handleLoadUsers(page = 1) {
    try {
      const res = await api.adminUsers(password, page);
      setUsers(res.users || []);
    } catch (e) {}
  }

  async function handleLoadUploads(status = 'pending') {
    try {
      const res = await api.adminUploads(password, status);
      setUploads(res.uploads || []);
    } catch (e) {}
  }

  if (!authed) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header />
        <main className="max-w-md mx-auto px-4 pt-20">
          <Card className="glass border-indigo-200/50 overflow-hidden">
            <div className="h-1 gradient-primary" />
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-white text-3xl">🔐</span>
              </div>
              <CardTitle>管理员登录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="管理员密码"
                  className="bg-white/50"
                />
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleVerify}
                  className="w-full gradient-primary text-white"
                >
                  验证
                </Button>
              </div>
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
        <Tabs defaultValue="users" onValueChange={(v) => {
          if (v === 'users') handleLoadUsers();
          if (v === 'uploads') handleLoadUploads();
        }}>
          <TabsList className="grid w-full grid-cols-3 glass mb-6">
            <TabsTrigger value="users" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              👥 用户
            </TabsTrigger>
            <TabsTrigger value="uploads" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              📤 审核
            </TabsTrigger>
            <TabsTrigger value="announcement" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              📢 公告
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="glass border-indigo-200/50 overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardContent className="p-4">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">👥</p>
                    <p>暂无用户</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-white/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {(u.nickname || u.username || '?')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{u.nickname || u.username}</p>
                            <p className="text-xs text-gray-500">
                              Lv.{u.level} · 🪙 {u.coins} · 抽卡{u.draw_count}次
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uploads">
            <Card className="glass border-indigo-200/50 overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'approved', 'rejected'].map(s => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadUploads(s)}
                      className="bg-white/50"
                    >
                      {s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {uploads.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">📤</p>
                    <p>暂无上传</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {uploads.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/50 border border-white/20"
                      >
                        <img
                          src={u.url}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{u.username}</p>
                          <Badge className={`${RARITY_COLORS[u.rarity || 'N']} text-white mt-1`}>
                            {u.rarity || 'N'}
                          </Badge>
                        </div>
                        {u.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                await api.adminReviewUpload(password, u.id, 'approved');
                                handleLoadUploads();
                              }}
                              className="bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                await api.adminReviewUpload(password, u.id, 'rejected');
                                handleLoadUploads();
                              }}
                            >
                              拒绝
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcement">
            <Card className="glass border-indigo-200/50 overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📢</span> 发布公告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    value={announcement.title}
                    onChange={e => setAnnouncement({ ...announcement, title: e.target.value })}
                    placeholder="标题"
                    className="bg-white/50"
                  />
                  <textarea
                    value={announcement.content}
                    onChange={e => setAnnouncement({ ...announcement, content: e.target.value })}
                    placeholder="内容"
                    rows={4}
                    className="w-full p-3 rounded-lg border border-gray-200 bg-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button
                    onClick={async () => {
                      await api.adminSaveAnnouncement(password, { ...announcement, enabled: true });
                      alert('已保存');
                    }}
                    className="gradient-primary text-white"
                  >
                    保存公告
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
