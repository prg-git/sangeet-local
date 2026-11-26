package com.sangeet.local;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewAssetLoader;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private SharedPreferences prefs;
    private WebViewAssetLoader assetLoader;
    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener audioFocusListener;

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
        swipeRefresh = findViewById(R.id.swipeRefresh);

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
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Customize User-Agent so web app knows it is running as native Android APK
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " SangeetLocalApp/1.0.0 Mobile");

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
                if (swipeRefresh != null) {
                    swipeRefresh.setRefreshing(false);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (swipeRefresh != null) {
                    swipeRefresh.setRefreshing(false);
                }
                // If offline and trying to load remote URL, smoothly fallback to bundled local app
                if (request.isForMainFrame() && !request.getUrl().toString().startsWith(LOCAL_ASSET_URL)) {
                    Toast.makeText(MainActivity.this, "Offline: Using cached music library", Toast.LENGTH_SHORT).show();
                    view.loadUrl(LOCAL_ASSET_URL);
                }
            }
        });

        // Pull to refresh: swipe down to instantly sync latest songs and changes from GitHub
        if (swipeRefresh != null) {
            swipeRefresh.setColorSchemeColors(0xFF10B981, 0xFF8B5CF6, 0xFF06B6D4);
            swipeRefresh.setOnRefreshListener(() -> {
                if (webView != null) {
                    webView.reload();
                }
            });
        }

        // Setup background audio focus management
        setupAudioFocus();

        // Check and request runtime audio permissions
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
            if (checkSelfPermission(android.Manifest.permission.READ_MEDIA_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.READ_MEDIA_AUDIO}, 101);
            }
        } else {
            if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.READ_EXTERNAL_STORAGE}, 101);
            }
        }
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
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (audioManager != null && audioFocusListener != null) {
            audioManager.abandonAudioFocus(audioFocusListener);
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
