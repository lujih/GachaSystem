import { Navigate, useRouteError } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import LoginForm from '~/components/LoginForm';

export default function Login() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <LoginForm />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <h1 className="text-xl font-bold mb-2">登录页加载失败</h1>
        <p className="text-on-surface-variant mb-4">{error?.message || '未知错误'}</p>
        <a href="/" className="text-primary underline">返回首页</a>
      </div>
    </div>
  );
}
