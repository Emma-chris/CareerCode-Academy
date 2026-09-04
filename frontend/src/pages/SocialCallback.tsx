import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
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
    // Cookie-only flow — no token in URL. Just fetch /auth/me via httpOnly cookie
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    // Legacy support: if token present (old flow), still handle via setTokens
    if (token && refreshToken) {
      useAuthStore.getState().setTokens(token, refreshToken).then(() => {
        const user = useAuthStore.getState().user;
        const target = user?.role === 'instructor' ? '/instructor/dashboard' : user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/dashboard' : '/student/dashboard';
        navigate(target, { replace: true });
      }).catch(() => navigate('/login?error=oauth_auth_failed', { replace: true }));
      return;
    }
    fetchUser().then(() => {
      const user = useAuthStore.getState().user;
      if (!user) {
        navigate('/login?error=oauth_no_user', { replace: true });
        return;
      }
      const intent = params.get('intent');
      const target = user.role === 'instructor' ? '/instructor/dashboard' : user.role === 'admin' || user.role === 'super_admin' ? '/admin/dashboard' : '/student/dashboard';
      // For signup intent, optionally show welcome toast
      if (intent === 'signup') {
        // could navigate to onboarding
      }
      navigate(target, { replace: true });
    }).catch(() => navigate('/login?error=oauth_auth_failed', { replace: true }));
  }, [params, navigate, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );
}
