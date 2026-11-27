package com.melachow.vendor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

/**
 * Manages MelaChow Vendor Android notification channels and persisted kitchen alarm preferences.
 */
public final class VendorAlarmChannels {
    public static final String CHANNEL_ORDERS = "melachow_orders";
    public static final String CHANNEL_ORDER_UPDATES = "melachow_order_updates_v1";
    public static final String CHANNEL_ORDER_ALARM = "melachow_vendor_order_alarm_v1";
    public static final String CHANNEL_ORDER_ALARM_SERVICE = "melachow_vendor_alarm_service_v1";

    public static final String PREFS_NAME = "melachow_vendor_alarm_prefs";
    public static final String KEY_ALARM_ENABLED = "alarm_enabled";
    public static final String KEY_VIBRATION_ENABLED = "vibration_enabled";

    private static final long[] ALARM_VIBRATION_PATTERN = new long[] {
        0L, 500L, 200L, 500L, 200L, 700L
    };

    private VendorAlarmChannels() {}

    public static Uri getAlarmSoundUri(Context context) {
        return Uri.parse(
            ContentResolver.SCHEME_ANDROID_RESOURCE
                + "://"
                + context.getPackageName()
                + "/"
                + R.raw.vendor_order_alarm
        );
    }

    public static void ensureAll(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Uri alarmSound = getAlarmSoundUri(context);
        AudioAttributes alarmAudio = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        if (nm.getNotificationChannel(CHANNEL_ORDER_ALARM) == null) {
            NotificationChannel alarmChannel = new NotificationChannel(
                CHANNEL_ORDER_ALARM,
                "Incoming Order Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            alarmChannel.setDescription("Loud repeating kitchen alarm when a new customer order arrives");
            alarmChannel.setSound(alarmSound, alarmAudio);
            alarmChannel.enableVibration(true);
            alarmChannel.setVibrationPattern(ALARM_VIBRATION_PATTERN);
            alarmChannel.enableLights(true);
            alarmChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            alarmChannel.setBypassDnd(true);
            nm.createNotificationChannel(alarmChannel);
        }

        // Fresh normal-sound channel for routine order status updates, payouts, and account notifications
        if (nm.getNotificationChannel(CHANNEL_ORDER_UPDATES) == null) {
            NotificationChannel updatesChannel = new NotificationChannel(
                CHANNEL_ORDER_UPDATES,
                "Order Status Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            updatesChannel.setDescription("Order status updates, payouts, and account notifications");
            AudioAttributes normalAudio = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            updatesChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), normalAudio);
            updatesChannel.enableVibration(true);
            updatesChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(updatesChannel);
        }

        // General order-update channel uses normal notification sound (NOT the loud new-order kitchen alarm)
        NotificationChannel existingOrders = nm.getNotificationChannel(CHANNEL_ORDERS);
        if (existingOrders != null && alarmSound.equals(existingOrders.getSound())) {
            nm.deleteNotificationChannel(CHANNEL_ORDERS);
            existingOrders = null;
        }
        if (existingOrders == null) {
            NotificationChannel ordersChannel = new NotificationChannel(
                CHANNEL_ORDERS,
                "MelaChow Order Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            ordersChannel.setDescription("Order status updates, payouts, and account notifications");
            AudioAttributes normalAudio = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            ordersChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), normalAudio);
            ordersChannel.enableVibration(true);
            ordersChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ordersChannel);
        }

        if (nm.getNotificationChannel(CHANNEL_ORDER_ALARM_SERVICE) == null) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ORDER_ALARM_SERVICE,
                "Active Order Alarm Banner",
                NotificationManager.IMPORTANCE_HIGH
            );
            serviceChannel.setDescription("Heads-up lock-screen alert while the kitchen order alarm is ringing");
            serviceChannel.setSound(null, null);
            serviceChannel.enableVibration(false);
            serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            serviceChannel.setBypassDnd(true);
            nm.createNotificationChannel(serviceChannel);
        }
    }

    public static boolean isAlarmEnabled(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_ALARM_ENABLED, true);
    }

    public static boolean isVibrationEnabled(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_VIBRATION_ENABLED, true);
    }

    public static void setPreferences(Context context, Boolean alarmEnabled, Boolean vibrationEnabled) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        if (alarmEnabled != null) editor.putBoolean(KEY_ALARM_ENABLED, alarmEnabled);
        if (vibrationEnabled != null) editor.putBoolean(KEY_VIBRATION_ENABLED, vibrationEnabled);
        editor.apply();
    }
}
