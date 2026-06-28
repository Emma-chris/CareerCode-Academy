import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function SocialCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);

  useEffect(() => {
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (!token || !refreshToken) {
      navigate('/login?error=invalid_oauth_response', { replace: true });
      return;
    }

    setTokens(token, refreshToken).then(() => {
      navigate('/dashboard', { replace: true });
    }).catch(() => {
      navigate('/login?error=oauth_auth_failed', { replace: true });
    });
  }, [params, navigate, setTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );
}
