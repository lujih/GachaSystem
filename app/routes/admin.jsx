import { useState } from 'react';
import Header from '~/components/Header';
import { api } from '~/lib/api';
import { useRouteError } from '@remix-run/react';

export default function Admin() {
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
        await handleLoadUsers();
      }
    } catch (e) {
      setError('认证失败');
    }
  }

  async function handleLoadUsers(page = 1) {
    try {
      const res = await api.adminUsers(password, page);
      setUsers(res.users || []);
    } catch (e) {
      setError('加载用户列表失败');
    }
  }

  async function handleLoadUploads(status = 'pending') {
    try {
      const res = await api.adminUploads(password, status);
      setUploads(res.uploads || []);
    } catch (e) {
      setError('加载上传列表失败');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-surface-container-low bg-grid-pattern flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-0 bg-primary translate-x-2 translate-y-2 rounded-[32px]" />
            <div className="relative bg-surface-container-lowest border-[3px] border-primary rounded-[32px] p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary-container border-4 border-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-secondary symbol-filled">admin_panel_settings</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface">Director Panel</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">Game Director Access Required</p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-on-primary-fixed placeholder-primary transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-1"
                />
                {error && (
                  <div className="p-3 rounded-lg bg-error-container border-2 border-error text-on-error-container text-sm">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleVerify}
                  className="w-full bg-primary text-on-primary font-button-text text-button-text py-4 rounded-full border-4 border-on-primary-container shadow-[6px_6px_0px_0px_#770143] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all"
                >
                  Verify Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="min-h-screen bg-surface-container-low bg-grid-pattern flex items-center justify-center p-4">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <h1 className="text-xl font-bold mb-2">管理面板加载失败</h1>
        <p className="text-on-surface-variant mb-4">{error?.message || '未知错误'}</p>
        <a href="/" className="text-primary underline">返回首页</a>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-surface-container-low bg-grid-pattern flex">
      {/* Side Navigation */}
      <nav className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-full z-40 bg-slate-50 border-r-4 border-cyan-100">
        <div className="p-md border-b-2 border-slate-200">
          <h1 className="text-xl font-bold text-cyan-600 font-['Plus_Jakarta_Sans']">Admin Panel</h1>
          <p className="text-sm font-['Plus_Jakarta_Sans'] font-medium text-slate-500 mt-xs">Game Director Access</p>
        </div>
        <ul className="flex-1 py-margin flex flex-col gap-sm">
          <li className="pl-md pr-sm">
            <a className="flex items-center gap-sm px-sm py-sm font-['Plus_Jakarta_Sans'] font-medium bg-cyan-500 text-white font-bold rounded-r-full shadow-[4px_0px_0px_0px_rgba(0,188,212,1)] translate-x-1" href="#">
              <span className="material-symbols-outlined symbol-filled">dashboard</span>
              Dashboard
            </a>
          </li>
          <li className="pl-md pr-sm">
            <a className="flex items-center gap-sm px-sm py-sm font-['Plus_Jakarta_Sans'] font-medium text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors rounded-r-full" href="#">
              <span className="material-symbols-outlined">group</span>
              Player Management
            </a>
          </li>
          <li className="pl-md pr-sm">
            <a className="flex items-center gap-sm px-sm py-sm font-['Plus_Jakarta_Sans'] font-medium text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors rounded-r-full" href="#">
              <span className="material-symbols-outlined">payments</span>
              Economy Config
            </a>
          </li>
          <li className="pl-md pr-sm">
            <a className="flex items-center gap-sm px-sm py-sm font-['Plus_Jakarta_Sans'] font-medium text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors rounded-r-full" href="#">
              <span className="material-symbols-outlined">campaign</span>
              Banner Schedule
            </a>
          </li>
        </ul>
      </nav>

      {/* Main Canvas */}
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto relative pt-24 lg:pt-0 pb-xl">
        <div className="max-w-[1400px] mx-auto p-margin lg:p-lg relative z-10 flex flex-col gap-margin">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
            <div>
              <h2 className="font-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_rgba(255,119,175,0.4)]">
                System Dashboard
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
                Real-time metrics and live pool configurations.
              </p>
            </div>
          </div>

           {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-margin">
            <MetricCard
              icon="groups"
              label="Total Users"
              value={users.length}
              color="primary"
            />
            <MetricCard
              icon="upload"
              label="Pending Uploads"
              value={uploads.filter(u => u.status === 'pending').length}
              color="secondary"
            />
            <MetricCard
              icon="inventory_2"
              label="Data Tables"
              value="8"
              subtitle="users, gallery, inventory, logs, rewards, titles, uploads, draw_history"
              color="tertiary"
            />
          </div>

          {/* Users Table */}
          <div className="bg-surface rounded-xl border-2 border-outline-variant shadow-[4px_4px_0px_0px_#dbbfc7] overflow-hidden">
            <div className="p-md border-b-2 border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-tertiary">group</span>
                Recent Users
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-variant sticky top-0 z-10 border-b-2 border-outline-variant">
                  <tr>
                    <th className="p-sm font-label-bold text-label-bold text-on-surface-variant uppercase">User</th>
                    <th className="p-sm font-label-bold text-label-bold text-on-surface-variant uppercase">Level</th>
                    <th className="p-sm font-label-bold text-label-bold text-on-surface-variant uppercase">Coins</th>
                    <th className="p-sm font-label-bold text-label-bold text-on-surface-variant uppercase text-right">Pulls</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-outline-variant/30 hover:bg-surface-container transition-colors">
                      <td className="p-sm">
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 rounded-full bg-primary-fixed border border-primary flex items-center justify-center font-bold text-primary text-xs">
                            {(u.nickname || u.username || '?')[0].toUpperCase()}
                          </div>
                          <span className="font-body-md font-bold text-on-surface">{u.nickname || u.username}</span>
                        </div>
                      </td>
                      <td className="p-sm font-body-md text-on-surface-variant">Lv.{u.level}</td>
                      <td className="p-sm font-body-md text-on-surface-variant">{u.coins?.toLocaleString()}</td>
                      <td className="p-sm text-right font-body-md text-on-surface">{u.draw_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcement */}
          <div className="bg-surface rounded-xl border-2 border-outline-variant shadow-[4px_4px_0px_0px_#dbbfc7] p-md">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm mb-md">
              <span className="material-symbols-outlined text-primary">campaign</span>
              Publish Announcement
            </h3>
            <div className="space-y-4">
              <input
                value={announcement.title}
                onChange={e => setAnnouncement({ ...announcement, title: e.target.value })}
                placeholder="Title"
                className="w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md"
              />
              <textarea
                value={announcement.content}
                onChange={e => setAnnouncement({ ...announcement, content: e.target.value })}
                placeholder="Content"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md resize-none"
              />
              <button
                onClick={async () => {
                  try {
                    await api.adminSaveAnnouncement(password, { ...announcement, enabled: true });
                    setAnnouncement({ title: '', content: '' });
                  } catch (e) {
                    console.error('Publish failed:', e);
                  }
                }}
                className="bg-primary text-on-primary font-button-text text-button-text px-8 py-3 rounded-full border-2 border-on-primary-container shadow-[4px_4px_0px_0px_#770143] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, trend, subtitle, color }) {
  return (
    <div className={`bg-surface rounded-xl border-2 border-outline-variant p-md shadow-[4px_4px_0px_0px_#dbbfc7] relative overflow-hidden flex flex-col justify-between h-40`}>
      <div className="flex justify-between items-start">
        <div className={`flex items-center gap-xs text-on-surface-variant font-label-bold text-label-bold uppercase tracking-widest`}>
          <span className={`material-symbols-outlined text-${color} text-sm`}>{icon}</span>
          {label}
        </div>
        {trend && (
          <div className={`bg-${color}-container text-on-${color}-container px-xs py-[2px] rounded font-label-bold text-[10px] border border-${color} flex items-center gap-[2px]`}>
            <span className="material-symbols-outlined text-[12px]">trending_up</span> {trend}
          </div>
        )}
      </div>
      <div className="font-display-lg text-[40px] font-extrabold text-on-surface leading-none mt-auto">
        {value}
      </div>
      {subtitle && (
        <p className="font-body-md text-sm text-on-surface-variant">{subtitle}</p>
      )}
    </div>
  );
}
