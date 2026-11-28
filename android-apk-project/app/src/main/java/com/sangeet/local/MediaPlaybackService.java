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
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * High-performance MediaPlaybackService with native MediaSessionCompat integration.
 * Ensures the Android SystemUI notification panel, quick settings media carousel,
 * and lock screen display the full media control card with real-time Play/Pause/Next/Prev controls.
 */
public class MediaPlaybackService extends Service {

    public static final String ACTION_UPDATE_NOTIFICATION = "com.sangeet.local.ACTION_UPDATE_NOTIFICATION";
    public static final String ACTION_STOP_SERVICE = "com.sangeet.local.ACTION_STOP_SERVICE";
    public static final String CHANNEL_ID = "sangeet_playback_channel_v3";
    public static final int NOTIFICATION_ID = 1001;

    private MediaSessionCompat mediaSession;
    private boolean isForeground = false;
    private String lastTitle = "Sangeet Local";
    private String lastArtist = "Regional Music Studio";
    private boolean lastIsPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel(this);
        setupMediaSession();
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
                            NotificationManager.IMPORTANCE_DEFAULT
                    );
                    channel.setDescription("Shows currently playing song and playback controls in notification panel");
                    channel.setShowBadge(true);
                    channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                    channel.setSound(null, null); // Completely silent, prevents beeping on track changes
                    channel.enableVibration(false);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    private void setupMediaSession() {
        try {
            mediaSession = new MediaSessionCompat(this, "SangeetLocalMediaSession");
            mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
            mediaSession.setCallback(new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    sendBroadcastAction(MainActivity.ACTION_PLAY_PAUSE);
                }

                @Override
                public void onPause() {
                    sendBroadcastAction(MainActivity.ACTION_PLAY_PAUSE);
                }

                @Override
                public void onSkipToNext() {
                    sendBroadcastAction(MainActivity.ACTION_NEXT);
                }

                @Override
                public void onSkipToPrevious() {
                    sendBroadcastAction(MainActivity.ACTION_PREV);
                }
            });
            mediaSession.setActive(true);
        } catch (Exception ignored) {}
    }

    private void sendBroadcastAction(String action) {
        Intent intent = new Intent(action);
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
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

            updateMediaSessionState(lastTitle, lastArtist, lastIsPlaying);
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
            if (mediaSession != null) {
                mediaSession.setActive(false);
            }
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

    private void updateMediaSessionState(String title, String artist, boolean isPlaying) {
        if (mediaSession == null) return;
        try {
            PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                    .setActions(PlaybackStateCompat.ACTION_PLAY |
                            PlaybackStateCompat.ACTION_PAUSE |
                            PlaybackStateCompat.ACTION_PLAY_PAUSE |
                            PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
                    .setState(isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                            PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);
            mediaSession.setPlaybackState(stateBuilder.build());

            MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Sangeet Local");
            mediaSession.setMetadata(metaBuilder.build());
        } catch (Exception ignored) {}
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
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending)
                .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        isPlaying ? "Pause" : "Play", playPausePending)
                .addAction(android.R.drawable.ic_media_next, "Next", nextPending);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }

        androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
                new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1, 2);
        if (mediaSession != null) {
            mediaStyle.setMediaSession(mediaSession.getSessionToken());
        }
        builder.setStyle(mediaStyle);

        return builder.build();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            try {
                mediaSession.setActive(false);
                mediaSession.release();
            } catch (Exception ignored) {}
        }
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
