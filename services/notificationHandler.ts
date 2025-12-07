import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

/**
 * Setup notification listeners
 */
export function setupNotificationListeners() {
  // Handle notification received while app is foregrounded
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received:', notification);
  });

  // Handle notification tapped
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data.type === 'passport' && data.screen === 'passport') {
      // Navigate to passport screen
      router.push('/passport' as any);
    }
  });
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

