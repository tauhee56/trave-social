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
    if (!userId || !autoStart) {
      setLoading(false);
      return;
    }

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', setAppState);

    let unsubscribeFn: (() => void) | null = null;
    let isMounted = true;
    let pollStarted = false;

    // Start polling when app is active
    if (appState === 'active') {
      console.log(`📱 Starting inbox polling for user: ${userId}`);
      
      startConversationsPolling(
        userId,
        (data) => {
          console.log(`📬 Inbox callback received ${data.length} conversations`);
          if (!isMounted) return;
          setConversations(data);
          setLoading(false);
          setError(null);
        },
        pollingInterval
      ).then(unsub => {
        if (isMounted) {
          unsubscribeFn = unsub;
          pollStarted = true;
        }
      }).catch((err) => {
        console.error('❌ Failed to start polling:', err);
        // Even if polling fails, stop showing loading after 3 seconds
        if (isMounted) {
          setLoading(false);
          setError(err.message || 'Failed to load conversations');
          setConversations([]); // Show empty state
        }
      });
    } else {
      // Stop polling when app goes to background
      console.log('📵 Stopping inbox polling - app backgrounded');
      stopPolling(`conversations-${userId}`);
    }

    // Timeout to prevent infinite loading - max 5 seconds
    const timeoutId = setTimeout(() => {
      if (isMounted && loading && !pollStarted) {
        console.warn('⏱️ Inbox polling timeout - forcing loading off after 5s');
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (unsubscribeFn) {
        console.log('🧹 Cleaning up inbox polling');
        unsubscribeFn();
      }
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
    }).catch((err) => {
      if (isMounted) {
        setLoading(false);
        setError(err.message || 'Failed to load messages');
      }
    });

    // Timeout to prevent infinite loading - max 5 seconds
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⏱️ Messages polling timeout - forcing loading off');
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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
