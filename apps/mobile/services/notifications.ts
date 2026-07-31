import { Platform } from "react-native";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export type PushNotification = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

/**
 * Request notification permissions from the user.
 * On iOS, this will prompt the user. On Android, permissions are granted by default.
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web") {
    if (!("Notification" in window)) {
      return "denied";
    }
    
    if (Notification.permission === "granted") {
      return "granted";
    }
    
    if (Notification.permission === "denied") {
      return "denied";
    }
    
    const permission = await Notification.requestPermission();
    return permission === "granted" ? "granted" : "denied";
  }
  
  // For native platforms, we'd use expo-notifications here
  // This is a placeholder implementation
  return "granted";
}

/**
 * Check current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web") {
    if (!("Notification" in window)) {
      return "denied";
    }
    
    switch (Notification.permission) {
      case "granted":
        return "granted";
      case "denied":
        return "denied";
      default:
        return "undetermined";
    }
  }
  
  return "granted";
}

/**
 * Send a local notification
 */
export async function sendLocalNotification(notification: PushNotification): Promise<void> {
  if (Platform.OS === "web") {
    const permission = await getNotificationPermissionStatus();
    if (permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }
    
    if ("Notification" in window) {
      new Notification(notification.title, {
        body: notification.body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: notification.data?.id,
        requireInteraction: false,
      });
    }
  }
  
  // For native platforms, we'd use expo-notifications.scheduleNotificationAsync here
}

/**
 * Cancel all pending notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  // Implementation would use expo-notifications.cancelAllScheduledNotificationsAsync
}

/**
 * Set up notification handlers for incoming notifications
 */
export function setupNotificationHandlers(
  onNotificationReceived?: (notification: PushNotification) => void,
  onNotificationTapped?: (notification: PushNotification) => void,
): () => void {
  // This would set up listeners for expo-notifications events
  // Return a cleanup function
  return () => {
    // Cleanup
  };
}
