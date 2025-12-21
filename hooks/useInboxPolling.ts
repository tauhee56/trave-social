/**
 * useInboxPolling Hook
 * Replaces real-time listeners with efficient polling
 * 
 * Usage:
 * const { conversations, loading, error } = useInboxPolling(userId);
 */

import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { startConversationsPolling, stopPolling } from '../lib/pollingService';
import { getCachedUserProfile, cacheUserProfile } from '../lib/redisCache';

interface UseInboxPollingOptions {
  pollingInterval?: number;
  autoStart?: boolean;
}

export function useInboxPolling(
  userId: string | null,
  options: UseInboxPollingOptions = {}
) {
  const { pollingInterval = 15000, autoStart = true } = options;

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>('active');


  useEffect(() => {
    if (!userId || !autoStart) return;

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', setAppState);

    let unsubscribeFn: (() => void) | null = null;
    let isMounted = true;

    // Start polling when app is active
    if (appState === 'active') {
      startConversationsPolling(
        userId,
        (data) => {
          if (!isMounted) return;
          setConversations(data);
          setLoading(false);
          setError(null);
        },
        pollingInterval
      ).then(unsub => {
        unsubscribeFn = unsub;
      });
    } else {
      // Stop polling when app goes to background
      stopPolling(`conversations-${userId}`);
    }

    return () => {
      isMounted = false;
      if (unsubscribeFn) unsubscribeFn();
      subscription.remove();
    };
  }, [userId, autoStart, pollingInterval, appState]);

  return { conversations, loading, error };
}

/**
 * useMessagesPolling Hook
 * Polls for new messages in a conversation
 */
import { startMessagesPolling, stopPolling as stopMessagePolling } from '../lib/pollingService';

interface UseMessagesPollingOptions {
  pollingInterval?: number;
  enabled?: boolean;
}

export function useMessagesPolling(
  conversationId: string | null,
  options: UseMessagesPollingOptions = {}
) {
  const { pollingInterval = 8000, enabled = true } = options;

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!conversationId || !enabled) return;

    let unsubscribeFn: (() => void) | null = null;
    let isMounted = true;

    startMessagesPolling(
      conversationId,
      (data) => {
        if (!isMounted) return;
        setMessages(data);
        setLoading(false);
        setError(null);
      },
      pollingInterval
    ).then(unsub => {
      unsubscribeFn = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [conversationId, enabled, pollingInterval]);

  return { messages, loading, error };
}

/**
 * Optimized hook for fetching user profiles with cache
 */
export function useUserProfileOptimized(userId: string | null) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    (async () => {
      // Try cache first
      const cached = await getCachedUserProfile(userId);
      if (cached) {
        setProfile(cached);
        setLoading(false);
        return;
      }

      // Fall back to Firebase
      try {
        const { getUserProfile } = await import('../lib/firebaseHelpers/user');
        const result = await getUserProfile(userId);
        if (result && result.success && result.data) {
          // Cache the profile
          await cacheUserProfile(userId, result.data);
          setProfile(result.data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return { profile, loading };
}
