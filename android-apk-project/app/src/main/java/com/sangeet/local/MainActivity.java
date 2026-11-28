package com.sangeet.local;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.webkit.WebViewAssetLoader;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SharedPreferences prefs;
    private WebViewAssetLoader assetLoader;
    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener audioFocusListener;
    private PowerManager.WakeLock wakeLock;
    private BroadcastReceiver playbackReceiver;

    private static final String CHANNEL_ID = "sangeet_playback_channel";
    private static final int NOTIFICATION_ID = 1001;
    public static final String ACTION_PLAY_PAUSE = "com.sangeet.local.ACTION_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.sangeet.local.ACTION_NEXT";
    public static final String ACTION_PREV = "com.sangeet.local.ACTION_PREV";

    private static final String PREF_KEY_URL = "server_url";
    private static final String GITHUB_PAGES_URL = "https://prg-git.github.io/sangeet-local/";
    private static final String LOCAL_ASSET_URL = "https://appassets.androidplatform.net/assets/index.html";

    // BoundedInputStream to read exactly 'limit' bytes for HTTP 206 Partial Content ranges
    private static class BoundedInputStream extends InputStream {
        private final InputStream in;
        private long remaining;

        public BoundedInputStream(InputStream in, long limit) {
            this.in = in;
            this.remaining = limit;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = in.read();
            if (b != -1) remaining--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int toRead = (int) Math.min(len, remaining);
            int read = in.read(b, off, toRead);
            if (read != -1) remaining -= read;
            return read;
        }

        @Override
        public void close() throws IOException {
            in.close();
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hardware acceleration for 60fps smooth animations and visualizers
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences("SangeetPrefs", Context.MODE_PRIVATE);
        webView = findViewById(R.id.webView);

        // Configure WebView smooth scrolling & overscroll
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

        // Configure WebViewAssetLoader for safe HTTPS loading of local APK assets
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadsImagesAutomatically(true);

        // Do not force desktop 980px viewport! Ensure true mobile viewport is respected
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Customize User-Agent so web app knows it is running as native Android APK
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " SangeetLocalApp/2.0.0 Mobile");

        // Long press anywhere to open source switch menu (GitHub Live, Bundled Offline, Local Wi-Fi)
        webView.setOnLongClickListener(v -> {
            promptConnectionOptions();
            return true;
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null) {
                    String path = uri.getPath();
                    if (path != null) {
                        String lower = path.toLowerCase();
                        if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg")
                                || lower.endsWith(".m4a") || lower.endsWith(".flac")) {
                            WebResourceResponse audioResp = handleAssetAudioRequest(request, path);
                            if (audioResp != null) {
                                return audioResp;
                            }
                        }
                    }
                }
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                // If offline and trying to load remote URL, smoothly fallback to bundled local app
                if (request.isForMainFrame() && !request.getUrl().toString().startsWith(LOCAL_ASSET_URL)) {
                    Toast.makeText(MainActivity.this, "Offline: Using cached music library", Toast.LENGTH_SHORT).show();
                    view.loadUrl(LOCAL_ASSET_URL);
                }
            }
        });

        // Initialize media playback notification channel
        createNotificationChannel();

        // Setup notification action broadcast receiver (Play/Pause, Next, Prev)
        setupPlaybackReceiver();

        // Register AndroidBridge so web app can control native notifications & keep background playback
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // Setup background audio focus management
        setupAudioFocus();

        // Check and request runtime audio & notification permissions
        checkAudioPermissions();

        // Live sync by default: Newly added songs and updates appear automatically!
        loadCurrentServerUrl();
    }

    /**
     * Handles HTTP Range requests for local APK asset audio files so Android WebView
     * HTML5 <audio> can seek forward/backward reliably with HTTP 206 Partial Content.
     */
    private WebResourceResponse handleAssetAudioRequest(WebResourceRequest request, String path) {
        String cleanPath = path;
        if (cleanPath.startsWith("/assets/")) {
            cleanPath = cleanPath.substring("/assets/".length());
        } else if (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
        }
        if (cleanPath.contains("?")) {
            cleanPath = cleanPath.substring(0, cleanPath.indexOf("?"));
        }

        String mimeType = "audio/mpeg";
        if (cleanPath.endsWith(".wav")) mimeType = "audio/wav";
        else if (cleanPath.endsWith(".ogg")) mimeType = "audio/ogg";
        else if (cleanPath.endsWith(".m4a")) mimeType = "audio/mp4";
        else if (cleanPath.endsWith(".flac")) mimeType = "audio/flac";

        AssetFileDescriptor afd = null;
        try {
            afd = getAssets().openFd(cleanPath);
        } catch (IOException ignored) {}

        long totalLength = -1;
        if (afd != null) {
            totalLength = afd.getLength();
        } else {
            try {
                InputStream testStream = getAssets().open(cleanPath);
                totalLength = testStream.available();
                testStream.close();
            } catch (IOException ignored) {}
        }

        if (totalLength <= 0) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
        }

        Map<String, String> reqHeaders = request.getRequestHeaders();
        String rangeHeader = null;
        if (reqHeaders != null) {
            for (Map.Entry<String, String> entry : reqHeaders.entrySet()) {
                if ("range".equalsIgnoreCase(entry.getKey())) {
                    rangeHeader = entry.getValue();
                    break;
                }
            }
        }

        try {
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                long start = 0;
                long end = totalLength - 1;
                String rangeSpec = rangeHeader.substring(6).trim();
                String[] parts = rangeSpec.split("-", -1);
                if (!parts[0].isEmpty()) {
                    start = Long.parseLong(parts[0]);
                }
                if (parts.length > 1 && !parts[1].isEmpty()) {
                    end = Long.parseLong(parts[1]);
                }
                if (end >= totalLength) {
                    end = totalLength - 1;
                }
                if (start > end) {
                    start = 0;
                }

                long contentLength = end - start + 1;
                InputStream stream;
                if (afd != null) {
                    FileInputStream fis = afd.createInputStream();
                    fis.skip(start);
                    stream = fis;
                } else {
                    InputStream is = getAssets().open(cleanPath);
                    is.skip(start);
                    stream = is;
                }

                BoundedInputStream boundedStream = new BoundedInputStream(stream, contentLength);

                Map<String, String> respHeaders = new HashMap<>();
                respHeaders.put("Accept-Ranges", "bytes");
                respHeaders.put("Content-Range", "bytes " + start + "-" + end + "/" + totalLength);
                respHeaders.put("Content-Length", String.valueOf(contentLength));
                respHeaders.put("Content-Type", mimeType);
                respHeaders.put("Access-Control-Allow-Origin", "*");
                respHeaders.put("Access-Control-Allow-Headers", "Range");
                respHeaders.put("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

                return new WebResourceResponse(
                        mimeType,
                        "UTF-8",
                        206,
                        "Partial Content",
                        respHeaders,
                        boundedStream
                );
            } else {
                InputStream is;
                if (afd != null) {
                    is = afd.createInputStream();
                } else {
                    is = getAssets().open(cleanPath);
                }

                Map<String, String> respHeaders = new HashMap<>();
                respHeaders.put("Accept-Ranges", "bytes");
                respHeaders.put("Content-Length", String.valueOf(totalLength));
                respHeaders.put("Content-Type", mimeType);
                respHeaders.put("Access-Control-Allow-Origin", "*");
                respHeaders.put("Access-Control-Allow-Headers", "Range");
                respHeaders.put("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

                return new WebResourceResponse(
                        mimeType,
                        "UTF-8",
                        200,
                        "OK",
                        respHeaders,
                        is
                );
            }
        } catch (IOException e) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
        }
    }

    private void setupAudioFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        audioFocusListener = focusChange -> {
            if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.pause();", null));
                }
            } else if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.pause();", null));
                }
            } else if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.setVolume(0.3);", null));
                }
            } else if (focusChange == AudioManager.AUDIOFOCUS_GAIN) {
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.setVolume(1.0);", null));
                }
            }
        };

        if (audioManager != null) {
            audioManager.requestAudioFocus(audioFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void checkAudioPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            java.util.List<String> perms = new java.util.ArrayList<>();
            if (checkSelfPermission(android.Manifest.permission.READ_MEDIA_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.READ_MEDIA_AUDIO);
            }
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.POST_NOTIFICATIONS);
            }
            if (!perms.isEmpty()) {
                requestPermissions(perms.toArray(new String[0]), 101);
            }
        } else {
            if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.READ_EXTERNAL_STORAGE}, 101);
            }
        }
    }

    private void createNotificationChannel() {
        MediaPlaybackService.createNotificationChannel(this);
    }

    private void setupPlaybackReceiver() {
        playbackReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) return;
                String action = intent.getAction();
                if (ACTION_PLAY_PAUSE.equals(action)) {
                    if (webView != null) {
                        webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.togglePlay();", null);
                    }
                } else if (ACTION_NEXT.equals(action)) {
                    if (webView != null) {
                        webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.playNext();", null);
                    }
                } else if (ACTION_PREV.equals(action)) {
                    if (webView != null) {
                        webView.evaluateJavascript("if (window.audioEngine) window.audioEngine.playPrevious();", null);
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PLAY_PAUSE);
        filter.addAction(ACTION_NEXT);
        filter.addAction(ACTION_PREV);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(playbackReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(playbackReceiver, filter);
        }
    }

    public class AndroidBridge {
        @android.webkit.JavascriptInterface
        public void updateNotification(String title, String artist, boolean isPlaying) {
            runOnUiThread(() -> showMediaNotification(title, artist, isPlaying));
        }

        @android.webkit.JavascriptInterface
        public void clearNotification() {
            runOnUiThread(() -> removeMediaNotification());
        }
    }

    private void showMediaNotification(String title, String artist, boolean isPlaying) {
        if (title == null || title.isEmpty()) title = "Sangeet Local";
        if (artist == null || artist.isEmpty()) artist = "Regional Music Studio";

        if (isPlaying) {
            acquireWakeLock();
        } else {
            releaseWakeLock();
        }

        // On Android 13+ (API 33+), ensure notification permission is requested if not yet granted
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 102);
            }
        }

        // Route media notification & foreground execution through MediaPlaybackService
        try {
            Intent serviceIntent = new Intent(this, MediaPlaybackService.class);
            serviceIntent.setAction(MediaPlaybackService.ACTION_UPDATE_NOTIFICATION);
            serviceIntent.putExtra("title", title);
            serviceIntent.putExtra("artist", artist);
            serviceIntent.putExtra("isPlaying", isPlaying);

            if (isPlaying) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            // Direct notification fallback
            fallbackDirectNotification(title, artist, isPlaying);
        }
    }

    private void fallbackDirectNotification(String title, String artist, boolean isPlaying) {
        try {
            Intent contentIntent = new Intent(this, MainActivity.class);
            contentIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentPending = PendingIntent.getActivity(this, 0, contentIntent, flags);

            Intent playPauseIntent = new Intent(ACTION_PLAY_PAUSE);
            playPauseIntent.setPackage(getPackageName());
            PendingIntent playPausePending = PendingIntent.getBroadcast(this, 1, playPauseIntent, flags);

            Intent prevIntent = new Intent(ACTION_PREV);
            prevIntent.setPackage(getPackageName());
            PendingIntent prevPending = PendingIntent.getBroadcast(this, 2, prevIntent, flags);

            Intent nextIntent = new Intent(ACTION_NEXT);
            nextIntent.setPackage(getPackageName());
            PendingIntent nextPending = PendingIntent.getBroadcast(this, 3, nextIntent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MediaPlaybackService.CHANNEL_ID)
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

            NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, builder.build());
        } catch (Exception ignored) {}
    }

    private void removeMediaNotification() {
        releaseWakeLock();
        try {
            Intent stopIntent = new Intent(this, MediaPlaybackService.class);
            stopIntent.setAction(MediaPlaybackService.ACTION_STOP_SERVICE);
            startService(stopIntent);
        } catch (Exception ignored) {}
        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        nm.cancel(NOTIFICATION_ID);
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SangeetLocal:PlaybackWakeLock");
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(12 * 60 * 60 * 1000L); // 12h safety
            }
        } catch (Exception ignored) {}
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Crucial: Do NOT call webView.onPause() or webView.pauseTimers()!
        // Preserves continuous HTML5 audio playback when minimizing app or switching apps.
    }

    @Override
    protected void onStop() {
        super.onStop();
        // MediaPlaybackService maintains foreground priority so background audio remains continuous.
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    @Override
    protected void onDestroy() {
        releaseWakeLock();
        if (playbackReceiver != null) {
            try {
                unregisterReceiver(playbackReceiver);
            } catch (Exception ignored) {}
        }
        removeMediaNotification();
        if (audioManager != null && audioFocusListener != null) {
            audioManager.abandonAudioFocus(audioFocusListener);
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    private void loadCurrentServerUrl() {
        // Defaults to GITHUB_PAGES_URL so updates published from PC automatically appear
        String currentUrl = prefs.getString(PREF_KEY_URL, GITHUB_PAGES_URL);
        if (webView != null) {
            webView.loadUrl(currentUrl);
        }
    }

    private void promptConnectionOptions() {
        String currentUrl = prefs.getString(PREF_KEY_URL, GITHUB_PAGES_URL);
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Sangeet Local Connection");
        builder.setMessage("Select app source or enter custom URL:");

        final EditText input = new EditText(this);
        input.setText(currentUrl);
        input.setSelection(currentUrl.length());
        builder.setView(input);

        builder.setPositiveButton("Connect", (dialog, which) -> {
            String newUrl = input.getText().toString().trim();
            if (!newUrl.isEmpty()) {
                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                    newUrl = "http://" + newUrl;
                }
                prefs.edit().putString(PREF_KEY_URL, newUrl).apply();
                webView.loadUrl(newUrl);
                Toast.makeText(MainActivity.this, "Connecting to: " + newUrl, Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNeutralButton("Bundled App (Offline)", (dialog, which) -> {
            prefs.edit().putString(PREF_KEY_URL, LOCAL_ASSET_URL).apply();
            webView.loadUrl(LOCAL_ASSET_URL);
            Toast.makeText(MainActivity.this, "Switched to Bundled Offline App", Toast.LENGTH_SHORT).show();
        });

        builder.setNegativeButton("Online (Auto-Update)", (dialog, which) -> {
            prefs.edit().putString(PREF_KEY_URL, GITHUB_PAGES_URL).apply();
            webView.loadUrl(GITHUB_PAGES_URL);
            Toast.makeText(MainActivity.this, "Switched to Live Online Auto-Update", Toast.LENGTH_SHORT).show();
        });

        builder.show();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return true;
            }
            // Move task to back instead of finishing/killing the activity!
            // Music keeps playing seamlessly in background and notification drawer remains active.
            moveTaskToBack(true);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        moveTaskToBack(true);
    }
}
