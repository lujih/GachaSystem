import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import LoginForm from '~/components/LoginForm';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="container">
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>
          <span style={{ color: 'var(--primary)' }}>Chouka</span> 抽卡
        </h1>
        <p style={{ color: 'var(--text-light)', marginBottom: 24 }}>登录或注册以开始</p>
      </div>
      <LoginForm />
    </div>
  );
}
