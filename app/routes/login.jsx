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

  return <LoginForm />;
}
