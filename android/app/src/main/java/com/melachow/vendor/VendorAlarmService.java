package com.melachow.vendor;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * Foreground service that plays a loud looping kitchen order alarm on Android's ALARM stream
 * with repeating vibration and a high-priority full-screen notification.
 */
public class VendorAlarmService extends Service {
    private static final String TAG = "VendorAlarmService";

    public static final String ACTION_START = "com.melachow.vendor.action.START_ALARM";
    public static final String ACTION_STOP = "com.melachow.vendor.action.STOP_ALARM";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_ORDER_ID = "orderId";
    public static final String EXTRA_ROUTE = "route";
    public static final String EXTRA_DURATION_MS = "durationMs";
    public static final String EXTRA_VIBRATE = "vibrate";

    public static final int ALARM_NOTIFICATION_ID = 64001;
    private static final long DEFAULT_DURATION_MS = 60_000L;
    private static final long MIN_DURATION_MS = 3_000L;
    private static final long MAX_DURATION_MS = 120_000L;
    private static final long[] VIBRATION_WAVEFORM = new long[] { 0L, 500L, 250L, 500L, 250L, 700L, 500L };

    private static volatile boolean ringing = false;

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable autoStopRunnable = () -> stopAlarmInternal(true);

    public static boolean isRinging() {
        return ringing;
    }

    public static void startAlarmSafely(
        Context context,
        String title,
        String body,
        String orderId,
        String route,
        long durationMs,
        boolean forcePlay
    ) {
        VendorAlarmChannels.ensureAll(context);
        if (!forcePlay && !VendorAlarmChannels.isAlarmEnabled(context)) {
            postFallbackNotification(context, title, body, orderId, route, durationMs, false);
            return;
        }

        long safeDuration = Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, durationMs > 0 ? durationMs : DEFAULT_DURATION_MS));
        boolean vibrate = VendorAlarmChannels.isVibrationEnabled(context);

        Intent intent = new Intent(context, VendorAlarmService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_TITLE, title != null && !title.isEmpty() ? title : "New Order Received!");
        intent.putExtra(EXTRA_BODY, body != null && !body.isEmpty() ? body : "Tap now to review and accept this customer order.");
        intent.putExtra(EXTRA_ORDER_ID, orderId != null ? orderId : "");
        intent.putExtra(EXTRA_ROUTE, route != null && !route.isEmpty() ? route : "/vendors/order");
        intent.putExtra(EXTRA_DURATION_MS, safeDuration);
        intent.putExtra(EXTRA_VIBRATE, vibrate);

        try {
            ContextCompat.startForegroundService(context, intent);
        } catch (Throwable error) {
            Log.w(TAG, "Foreground alarm start blocked by OS; falling back to insistent alarm notification", error);
            postFallbackNotification(context, title, body, orderId, route, safeDuration, true);
        }
    }

    public static void stopAlarm(Context context) {
        ringing = false;
        try {
            Intent stopIntent = new Intent(context, VendorAlarmService.class);
            stopIntent.setAction(ACTION_STOP);
            context.stopService(stopIntent);
        } catch (Throwable ignored) {}

        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(ALARM_NOTIFICATION_ID);
        } catch (Throwable ignored) {}

        VendorAlarmPlugin.emitEvent("alarmStopped", null, null);
    }

    private static void postFallbackNotification(
        Context context,
        String title,
        String body,
        String orderId,
        String route,
        long durationMs,
        boolean insistent
    ) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Notification notification = buildAlarmNotification(
            context,
            VendorAlarmChannels.CHANNEL_ORDER_ALARM,
            title,
            body,
            orderId,
            route,
            durationMs
        );
        if (insistent) notification.flags |= Notification.FLAG_INSISTENT;
        ringing = insistent;
        nm.notify(ALARM_NOTIFICATION_ID, notification);
    }

    private static Notification buildAlarmNotification(
        Context context,
        String channelId,
        String title,
        String body,
        String orderId,
        String route,
        long durationMs
    ) {
        String safeTitle = (title != null && !title.isEmpty()) ? title : "New Order Received!";
        String safeBody = (body != null && !body.isEmpty()) ? body : "Open MelaChow Vendor now to accept this customer order.";
        String safeRoute = (route != null && !route.isEmpty()) ? route : "/vendors/order";

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("vendorAlarmAction", "open");
        openIntent.putExtra("route", safeRoute);
        if (orderId != null && !orderId.isEmpty()) {
            openIntent.putExtra("orderId", orderId);
        }

        PendingIntent openPendingIntent = PendingIntent.getActivity(
            context,
            64100,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent silenceIntent = new Intent(context, VendorAlarmService.class);
        silenceIntent.setAction(ACTION_STOP);
        PendingIntent silencePendingIntent = PendingIntent.getService(
            context,
            64101,
            silenceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(safeTitle)
            .setContentText(safeBody)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(safeBody))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(true)
            .setTimeoutAfter(durationMs)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .setDeleteIntent(silencePendingIntent)
            .addAction(android.R.drawable.ic_menu_view, "Open Order", openPendingIntent)
            .addAction(android.R.drawable.ic_lock_silent_mode, "Silence", silencePendingIntent);

        return builder.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopAlarmInternal(true);
            return START_NOT_STICKY;
        }

        VendorAlarmChannels.ensureAll(this);

        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        String orderId = intent.getStringExtra(EXTRA_ORDER_ID);
        String route = intent.getStringExtra(EXTRA_ROUTE);
        long durationMs = intent.getLongExtra(EXTRA_DURATION_MS, DEFAULT_DURATION_MS);
        boolean vibrate = intent.getBooleanExtra(EXTRA_VIBRATE, true);

        Notification notification = buildAlarmNotification(
            this,
            VendorAlarmChannels.CHANNEL_ORDER_ALARM_SERVICE,
            title,
            body,
            orderId,
            route,
            durationMs
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    ALARM_NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(ALARM_NOTIFICATION_ID, notification);
            }
        } catch (Throwable error) {
            Log.e(TAG, "Failed to enter foreground for VendorAlarmService", error);
            stopAlarmInternal(false);
            postFallbackNotification(this, title, body, orderId, route, durationMs, true);
            return START_NOT_STICKY;
        }

        acquireWakeLock(durationMs + 5_000L);
        boolean audioStarted = startLoopingAlarmAudio();
        if (vibrate) startLoopingVibration();
        if (!audioStarted) {
            postFallbackNotification(this, title, body, orderId, route, durationMs, true);
        }

        ringing = true;
        mainHandler.removeCallbacks(autoStopRunnable);
        mainHandler.postDelayed(autoStopRunnable, durationMs);
        VendorAlarmPlugin.emitEvent("alarmStarted", orderId, route);

        return START_NOT_STICKY;
    }

    private void acquireWakeLock(long timeoutMs) {
        releaseWakeLock();
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "melachow:vendor_order_alarm");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(timeoutMs);
            }
        } catch (Throwable error) {
            Log.w(TAG, "Unable to acquire wake lock", error);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Throwable ignored) {}
        wakeLock = null;
    }

    private boolean startLoopingAlarmAudio() {
        stopAudio();
        try {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(attrs)
                        .setWillPauseWhenDucked(false)
                        .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                }
            }

            AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.vendor_order_alarm);
            if (afd == null) return false;

            MediaPlayer player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            player.setLooping(true);
            player.setVolume(1.0f, 1.0f);
            player.prepare();
            player.start();
            mediaPlayer = player;
            return true;
        } catch (Throwable error) {
            Log.e(TAG, "Failed to play looping vendor alarm audio", error);
            return false;
        }
    }

    private void stopAudio() {
        if (mediaPlayer != null) {
            try { if (mediaPlayer.isPlaying()) mediaPlayer.stop(); } catch (Throwable ignored) {}
            try { mediaPlayer.release(); } catch (Throwable ignored) {}
            mediaPlayer = null;
        }
        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            } catch (Throwable ignored) {}
            audioFocusRequest = null;
        }
    }

    private void startLoopingVibration() {
        stopVibration();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                    vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION_WAVEFORM, 0), attrs);
                } else {
                    vibrator.vibrate(VIBRATION_WAVEFORM, 0);
                }
            }
        } catch (Throwable error) {
            Log.w(TAG, "Vibration start failed", error);
        }
    }

    private void stopVibration() {
        try { if (vibrator != null) vibrator.cancel(); } catch (Throwable ignored) {}
        vibrator = null;
    }

    private void stopAlarmInternal(boolean emitEvent) {
        mainHandler.removeCallbacks(autoStopRunnable);
        ringing = false;
        stopAudio();
        stopVibration();
        releaseWakeLock();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
            else stopForeground(true);
        } catch (Throwable ignored) {}
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(ALARM_NOTIFICATION_ID);
        } catch (Throwable ignored) {}
        if (emitEvent) VendorAlarmPlugin.emitEvent("alarmStopped", null, null);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopAlarmInternal(false);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
