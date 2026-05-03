import { Navigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import LoginForm from '~/components/LoginForm';

export default function Login() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <LoginForm />;
}
