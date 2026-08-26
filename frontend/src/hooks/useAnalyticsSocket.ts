import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAnalyticsStore } from '@/store/analyticsStore';

export function useAnalyticsSocket() {
  const { socket } = useSocket();
  const { fetchRealtime, fetchOverview } = useAnalyticsStore();
  const throttleRef = useRef(0);

  useEffect(() => {
    if (!socket) return;

    socket.emit('analytics:subscribe');

    const handlePageView = () => {
      const now = Date.now();
      if (now - throttleRef.current > 10000) {
        throttleRef.current = now;
        fetchRealtime();
      }
    };

    const handleHeartbeat = () => {
      const now = Date.now();
      if (now - throttleRef.current > 10000) {
        throttleRef.current = now;
        fetchRealtime();
      }
    };

    const handleJourney = () => {
      fetchOverview('24h');
    };

    socket.on('analytics:page-view', handlePageView);
    socket.on('analytics:heartbeat', handleHeartbeat);
    socket.on('analytics:journey', handleJourney);

    return () => {
      socket.emit('analytics:unsubscribe');
      socket.off('analytics:page-view', handlePageView);
      socket.off('analytics:heartbeat', handleHeartbeat);
      socket.off('analytics:journey', handleJourney);
    };
  }, [socket]);
}
