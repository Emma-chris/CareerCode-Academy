import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { Loader2 } from 'lucide-react';

export default function SocialCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      navigate(`/login?error=${error}`, { replace: true });
      return;
    }

    const targetFor = (role?: string) =>
      role === 'instructor'
        ? '/instructor/dashboard'
        : role === 'admin' || role === 'super_admin'
          ? '/admin/dashboard'
          : '/student/dashboard';

    const finish = () => {
      const user = useAuthStore.getState().user;
      if (!user) {
        navigate('/login?error=oauth_no_user', { replace: true });
        return;
      }
      navigate(targetFor(user.role), { replace: true });
    };

    const fail = () => navigate('/login?error=oauth_auth_failed', { replace: true });

    const code = params.get('code');
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    // Primary flow: exchange the short-lived code for real tokens over a normal
    // request. This works even when third-party auth cookies are blocked.
    if (code) {
      api
        .post('/auth/oauth/exchange', { code })
        .then(({ data }) => {
          const d = data.data;
          return useAuthStore.getState().setTokens(d.token, d.refreshToken);
        })
        .then(finish)
        .catch(fail);
      return;
    }

    // Legacy support: tokens present in URL (old flow)
    if (token && refreshToken) {
      useAuthStore
        .getState()
        .setTokens(token, refreshToken)
        .then(finish)
        .catch(fail);
      return;
    }

    // Fallback: cookie-only flow — fetch /auth/me via httpOnly cookie
    fetchUser().then(finish).catch(fail);
  }, [params, navigate, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );
}
