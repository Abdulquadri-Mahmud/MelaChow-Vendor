package com.melachow.vendor;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Locale;
import java.util.Map;

/**
 * Intercepts high-priority data-only FCM order alerts even when MelaChow Vendor is
 * backgrounded, locked, or swiped away, starting or silencing VendorAlarmService.
 */
public class VendorAlarmFirebaseMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            String rawType = firstNonEmpty(
                data.get("type"),
                data.get("event"),
                data.get("eventType"),
                data.get("notificationType")
            );
            String normalizedType = rawType != null ? rawType.trim().toLowerCase(Locale.ROOT) : "";
            boolean explicitDismiss = "true".equalsIgnoreCase(data.get("dismissAlarm")) || "1".equals(data.get("dismissAlarm"));
            boolean explicitAlarm = "true".equalsIgnoreCase(data.get("alarm")) || "1".equals(data.get("alarm"));

            if (explicitDismiss || "vendor_order_cancelled".equals(normalizedType) || "order_cancelled".equals(normalizedType)) {
                VendorAlarmService.stopAlarm(this);
                return;
            }

            if (explicitAlarm || "vendor_new_order".equals(normalizedType) || "new_order".equals(normalizedType)) {
                String title = firstNonEmpty(
                    data.get("title"),
                    remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : null,
                    "New Order Received!"
                );
                String body = firstNonEmpty(
                    data.get("body"),
                    data.get("message"),
                    remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : null,
                    "Open MelaChow Vendor now to review and accept this order."
                );
                String orderId = firstNonEmpty(data.get("orderDatabaseId"), data.get("orderId"), data.get("vendorOrderId"));
                String route = firstNonEmpty(data.get("route"), data.get("url"), "/vendors/order");
                long durationMs = parseLongOrDefault(data.get("durationMs"), 60_000L);

                VendorAlarmService.startAlarmSafely(this, title, body, orderId, route, durationMs, false);
                VendorAlarmPlugin.emitEvent("alarmStarted", orderId, route);
                return;
            }
        }

        super.onMessageReceived(remoteMessage);
    }

    private static String firstNonEmpty(String... values) {
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) return v.trim();
        }
        return null;
    }

    private static long parseLongOrDefault(String value, long fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }
}
