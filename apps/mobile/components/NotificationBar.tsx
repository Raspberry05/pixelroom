import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, space, typography } from "../theme";

export type Notification = {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  type: "message" | "call" | "system";
  onPress?: () => void;
};

type Props = {
  notification: Notification | null;
  onDismiss: () => void;
  autoDismissMs?: number;
};

export function NotificationBar({
  notification,
  onDismiss,
  autoDismissMs = 5000,
}: Props) {
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (notification) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      if (autoDismissMs > 0) {
        const timer = setTimeout(() => {
          dismissWithAnimation();
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      slideAnim.setValue(-100);
    }
  }, [notification, slideAnim, autoDismissMs]);

  const dismissWithAnimation = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case "message":
        return "💬";
      case "call":
        return "📞";
      case "system":
        return "ℹ️";
      default:
        return "🔔";
    }
  };

  const handlePress = () => {
    if (notification.onPress) {
      notification.onPress();
    }
    dismissWithAnimation();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        style={[
          styles.notification,
          notification.type === "call" && styles.notificationCall,
        ]}
        onPress={handlePress}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <Pressable
          style={styles.dismissBtn}
          onPress={dismissWithAnimation}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
  },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    padding: space.md,
    gap: space.sm,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  notificationCall: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.title,
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  body: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
});
