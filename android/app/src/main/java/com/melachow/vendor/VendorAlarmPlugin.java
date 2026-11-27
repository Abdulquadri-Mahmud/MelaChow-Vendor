package com.melachow.vendor;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

/**
 * Capacitor plugin exposing MelaChow Vendor's native background/foreground kitchen alarm,
 * preferences, and Android battery/lock-screen permission helpers to JavaScript.
 */
@CapacitorPlugin(name = "VendorAlarm")
public class VendorAlarmPlugin extends Plugin {
    private static WeakReference<VendorAlarmPlugin> activeInstance = new WeakReference<>(null);
    private static String pendingOpenedRoute = null;
    private static String pendingOpenedOrderId = null;

    @Override
    public void load() {
        super.load();
        activeInstance = new WeakReference<>(this);
        VendorAlarmChannels.ensureAll(getContext());
        if (pendingOpenedRoute != null) {
            String route = pendingOpenedRoute;
            String orderId = pendingOpenedOrderId;
            pendingOpenedRoute = null;
            pendingOpenedOrderId = null;
            emitEvent("alarmOpened", orderId, route);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleAlarmLaunchIntent(getContext(), intent);
    }

    public static void handleAlarmLaunchIntent(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("vendorAlarmAction");
        if (!"open".equals(action)) return;

        String route = intent.getStringExtra("route");
        String orderId = intent.getStringExtra("orderId");
        intent.removeExtra("vendorAlarmAction");

        VendorAlarmService.stopAlarm(context);

        VendorAlarmPlugin plugin = activeInstance.get();
        if (plugin != null) {
            emitEvent("alarmOpened", orderId, route != null ? route : "/vendors/order");
        } else {
            pendingOpenedRoute = route != null ? route : "/vendors/order";
            pendingOpenedOrderId = orderId;
        }
    }

    public static void emitEvent(String eventName, String orderId, String route) {
        VendorAlarmPlugin plugin = activeInstance.get();
        if (plugin == null) return;

        JSObject payload = new JSObject();
        payload.put("ringing", VendorAlarmService.isRinging());
        if (orderId != null) payload.put("orderId", orderId);
        if (route != null) payload.put("route", route);
        plugin.notifyListeners(eventName, payload, true);
    }

    @PluginMethod
    public void startAlarm(PluginCall call) {
        String title = call.getString("title", "New Order Received!");
        String body = call.getString("body", "Open MelaChow Vendor now to review and accept this order.");
        String orderId = call.getString("orderId", "");
        String route = call.getString("route", "/vendors/order");
        long durationMs = call.getInt("durationMs", 60000);
        boolean forcePlay = Boolean.TRUE.equals(call.getBoolean("force", false));

        VendorAlarmService.startAlarmSafely(getContext(), title, body, orderId, route, durationMs, forcePlay);

        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        VendorAlarmService.stopAlarm(getContext());
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isRinging(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ringing", VendorAlarmService.isRinging());
        call.resolve(ret);
    }

    @PluginMethod
    public void setPreferences(PluginCall call) {
        Boolean alarmEnabled = call.hasOption("alarmEnabled") ? call.getBoolean("alarmEnabled") : null;
        Boolean vibrationEnabled = call.hasOption("vibrationEnabled") ? call.getBoolean("vibrationEnabled") : null;
        VendorAlarmChannels.setPreferences(getContext(), alarmEnabled, vibrationEnabled);

        JSObject ret = new JSObject();
        ret.put("alarmEnabled", VendorAlarmChannels.isAlarmEnabled(getContext()));
        ret.put("vibrationEnabled", VendorAlarmChannels.isVibrationEnabled(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void getPreferences(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("alarmEnabled", VendorAlarmChannels.isAlarmEnabled(getContext()));
        ret.put("vibrationEnabled", VendorAlarmChannels.isVibrationEnabled(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void getAlarmPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean notificationsEnabled = NotificationManagerCompat.from(ctx).areNotificationsEnabled();

        boolean ignoringBatteryOptimizations = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            ignoringBatteryOptimizations = pm == null || pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }

        boolean fullScreenIntentAllowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            fullScreenIntentAllowed = nm == null || nm.canUseFullScreenIntent();
        }

        JSObject ret = new JSObject();
        ret.put("notificationsEnabled", notificationsEnabled);
        ret.put("ignoringBatteryOptimizations", ignoringBatteryOptimizations);
        ret.put("fullScreenIntentAllowed", fullScreenIntentAllowed);
        ret.put("androidSdkInt", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
            call.resolve();
        } catch (Throwable error) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(fallback);
                call.resolve();
            } catch (Throwable ignored) {
                call.reject("Could not open battery optimization settings");
            }
        }
    }

    @PluginMethod
    public void openFullScreenIntentSettings(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            } else {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Throwable error) {
            call.reject("Could not open full-screen alert settings");
        }
    }

    @PluginMethod
    public void openAlarmChannelSettings(PluginCall call) {
        Context ctx = getContext();
        VendorAlarmChannels.ensureAll(ctx);
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
                intent.putExtra(Settings.EXTRA_CHANNEL_ID, VendorAlarmChannels.CHANNEL_ORDER_ALARM);
            } else {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Throwable error) {
            call.reject("Could not open alarm channel settings");
        }
    }
}
