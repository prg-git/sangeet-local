package com.sangeet.local;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Foreground Service for Sangeet Local media playback.
 * Keeps music playing uninterrupted in the background when the user exits the app,
 * locks the phone, or switches to other apps, and maintains native media controls
 * in the Android notification drawer and lockscreen.
 */
public class MediaPlaybackService extends Service {

    public static final String ACTION_UPDATE_NOTIFICATION = "com.sangeet.local.ACTION_UPDATE_NOTIFICATION";
    public static final String ACTION_STOP_SERVICE = "com.sangeet.local.ACTION_STOP_SERVICE";
    public static final String CHANNEL_ID = "sangeet_playback_channel_v2";
    public static final int NOTIFICATION_ID = 1001;

    private boolean isForeground = false;
    private String lastTitle = "Sangeet Local";
    private String lastArtist = "Regional Music Studio";
    private boolean lastIsPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel(this);
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm != null) {
                NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
                if (existing == null) {
                    NotificationChannel channel = new NotificationChannel(
                            CHANNEL_ID,
                            "Sangeet Playback Controls",
                            NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("Shows currently playing song and playback controls");
                    channel.setShowBadge(false);
                    channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                    channel.setSound(null, null);
                    channel.enableVibration(false);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_UPDATE_NOTIFICATION.equals(action)) {
            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            boolean isPlaying = intent.getBooleanExtra("isPlaying", false);

            if (title != null && !title.isEmpty()) lastTitle = title;
            if (artist != null && !artist.isEmpty()) lastArtist = artist;
            lastIsPlaying = isPlaying;

            Notification notification = buildNotification(lastTitle, lastArtist, lastIsPlaying);

            if (lastIsPlaying) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                    } else {
                        startForeground(NOTIFICATION_ID, notification);
                    }
                    isForeground = true;
                } catch (Exception e) {
                    NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification);
                }
            } else {
                NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification);
                if (isForeground) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        stopForeground(STOP_FOREGROUND_DETACH);
                    } else {
                        stopForeground(false);
                    }
                    isForeground = false;
                }
            }
        } else if (ACTION_STOP_SERVICE.equals(action)) {
            if (isForeground) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
                isForeground = false;
            } else {
                NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID);
            }
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    private Notification buildNotification(String title, String artist, boolean isPlaying) {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPending = PendingIntent.getActivity(this, 0, contentIntent, flags);

        Intent playPauseIntent = new Intent(MainActivity.ACTION_PLAY_PAUSE);
        playPauseIntent.setPackage(getPackageName());
        PendingIntent playPausePending = PendingIntent.getBroadcast(this, 1, playPauseIntent, flags);

        Intent prevIntent = new Intent(MainActivity.ACTION_PREV);
        prevIntent.setPackage(getPackageName());
        PendingIntent prevPending = PendingIntent.getBroadcast(this, 2, prevIntent, flags);

        Intent nextIntent = new Intent(MainActivity.ACTION_NEXT);
        nextIntent.setPackage(getPackageName());
        PendingIntent nextPending = PendingIntent.getBroadcast(this, 3, nextIntent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(artist)
                .setSubText("Sangeet Local")
                .setContentIntent(contentPending)
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending)
                .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        isPlaying ? "Pause" : "Play", playPausePending)
                .addAction(android.R.drawable.ic_media_next, "Next", nextPending);

        try {
            androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
                    new androidx.media.app.NotificationCompat.MediaStyle()
                            .setShowActionsInCompactView(0, 1, 2);
            builder.setStyle(mediaStyle);
        } catch (Throwable ignored) {}

        return builder.build();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (isForeground) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            isForeground = false;
        }
        super.onDestroy();
    }
}
