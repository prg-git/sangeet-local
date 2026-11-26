package com.sangeet.local;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.View;
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
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private SharedPreferences prefs;
    private WebViewAssetLoader assetLoader;

    private static final String PREF_KEY_URL = "server_url";
    private static final String GITHUB_PAGES_URL = "https://prg-git.github.io/sangeet-local/";
    private static final String LOCAL_ASSET_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String GITHUB_RELEASES_API = "https://api.github.com/repos/prg-git/sangeet-local/releases/latest";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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

        // Customize User-Agent so website knows it is native Android mobile app
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " SangeetLocalApp/1.0.0 Mobile");

        // Long press anywhere to open Connection & Update options
        webView.setOnLongClickListener(v -> {
            promptConnectionOptions();
            return true;
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
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

        // Pull to refresh: sync latest songs and changes from GitHub immediately
        if (swipeRefresh != null) {
            swipeRefresh.setColorSchemeColors(0xFF10B981, 0xFF8B5CF6, 0xFF06B6D4);
            swipeRefresh.setOnRefreshListener(() -> {
                if (webView != null) {
                    webView.reload();
                }
            });
        }

        // 1. Load live web URL by default so newly added songs appear automatically
        loadCurrentServerUrl();

        // 2. Check for APK binary updates in the background on startup
        checkForAppUpdates(false);
    }

    private void loadCurrentServerUrl() {
        // Defaults to GITHUB_PAGES_URL so updates published from PC automatically appear
        String currentUrl = prefs.getString(PREF_KEY_URL, GITHUB_PAGES_URL);
        if (webView != null) {
            webView.loadUrl(currentUrl);
        }
    }

    // ==============================================================
    // IN-APP APK AUTO-UPDATER (OTA)
    // ==============================================================
    private void checkForAppUpdates(boolean userInitiated) {
        new Thread(() -> {
            try {
                URL url = new URL(GITHUB_RELEASES_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "SangeetLocalApp");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject release = new JSONObject(sb.toString());
                    String latestTag = release.optString("tag_name", "");
                    JSONArray assets = release.optJSONArray("assets");

                    String apkDownloadUrl = null;
                    if (assets != null) {
                        for (int i = 0; i < assets.length(); i++) {
                            JSONObject asset = assets.getJSONObject(i);
                            String assetName = asset.optString("name", "");
                            if (assetName.endsWith(".apk")) {
                                apkDownloadUrl = asset.optString("browser_download_url", null);
                                break;
                            }
                        }
                    }

                    String currentVersion = "1.0.0";
                    try {
                        currentVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                    } catch (PackageManager.NameNotFoundException ignored) {}

                    String cleanLatest = latestTag.replaceFirst("^[vV]", "").trim();
                    String cleanCurrent = currentVersion.replaceFirst("^[vV]", "").trim();

                    final String finalApkUrl = apkDownloadUrl;
                    final String finalVersion = latestTag;
                    final String finalCur = currentVersion;

                    if (!cleanLatest.isEmpty() && isNewerVersion(cleanLatest, cleanCurrent) && finalApkUrl != null) {
                        runOnUiThread(() -> showUpdateDialog(finalVersion, finalApkUrl));
                    } else if (userInitiated) {
                        runOnUiThread(() -> Toast.makeText(MainActivity.this, 
                                "You are on the latest version (v" + finalCur + ")", Toast.LENGTH_SHORT).show());
                    }
                } else if (userInitiated) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, 
                            "Could not check for updates (HTTP " + conn.getResponseCode() + ")", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                if (userInitiated) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, 
                            "Update check error: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                }
            }
        }).start();
    }

    private boolean isNewerVersion(String latest, String current) {
        String[] lParts = latest.split("\\.");
        String[] cParts = current.split("\\.");
        int len = Math.max(lParts.length, cParts.length);
        for (int i = 0; i < len; i++) {
            int lNum = i < lParts.length ? parseSafeInt(lParts[i]) : 0;
            int cNum = i < cParts.length ? parseSafeInt(cParts[i]) : 0;
            if (lNum > cNum) return true;
            if (lNum < cNum) return false;
        }
        return false;
    }

    private int parseSafeInt(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    private void showUpdateDialog(String newVersion, String apkUrl) {
        new AlertDialog.Builder(this)
                .setTitle("🎵 New App Update Available!")
                .setMessage("Sangeet Local " + newVersion + " is ready.\n\nTap 'Update Now' to automatically download and install the new update.")
                .setPositiveButton("Update Now", (dialog, which) -> startApkDownload(apkUrl, newVersion))
                .setNegativeButton("Later", null)
                .setCancelable(true)
                .show();
    }

    private void startApkDownload(String apkUrl, String versionName) {
        Toast.makeText(this, "Downloading Sangeet Local " + versionName + " in background...", Toast.LENGTH_LONG).show();

        File downloadsDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloadsDir != null && !downloadsDir.exists()) {
            downloadsDir.mkdirs();
        }
        final File destination = new File(downloadsDir, "Sangeet-Local.apk");
        if (destination.exists()) {
            destination.delete();
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
        request.setTitle("Sangeet Local Update (" + versionName + ")");
        request.setDescription("Downloading Sangeet-Local.apk...");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationUri(Uri.fromFile(destination));
        request.setMimeType("application/vnd.android.package-archive");

        DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager != null) {
            final long downloadId = manager.enqueue(request);

            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        try {
                            unregisterReceiver(this);
                        } catch (Exception ignored) {}
                        installDownloadedApk(destination);
                    }
                }
            };

            registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }
    }

    private void installDownloadedApk(File apkFile) {
        if (!apkFile.exists()) {
            Toast.makeText(this, "Downloaded update file not found", Toast.LENGTH_SHORT).show();
            return;
        }

        // For Android 8.0+ (Oreo), verify permission to install unknown apps
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getPackageManager().canRequestPackageInstalls()) {
                Toast.makeText(this, "Please enable 'Allow from this source' to install update", Toast.LENGTH_LONG).show();
                Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse("package:" + getPackageName()));
                startActivity(permissionIntent);
                return;
            }
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Install failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    // ==============================================================
    // CONNECTION & SETTINGS MENU
    // ==============================================================
    private void promptConnectionOptions() {
        String currentUrl = prefs.getString(PREF_KEY_URL, GITHUB_PAGES_URL);
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Sangeet Local Menu");

        String[] options = {
            "🔄 Check for APK Updates",
            "🌐 Live Online Sync (GitHub Pages)",
            "💾 Bundled Offline App",
            "💻 Custom Server URL (PC Wi-Fi)"
        };

        builder.setItems(options, (dialog, which) -> {
            switch (which) {
                case 0:
                    checkForAppUpdates(true);
                    break;
                case 1:
                    prefs.edit().putString(PREF_KEY_URL, GITHUB_PAGES_URL).apply();
                    webView.loadUrl(GITHUB_PAGES_URL);
                    Toast.makeText(MainActivity.this, "Switched to Live Online Sync", Toast.LENGTH_SHORT).show();
                    break;
                case 2:
                    prefs.edit().putString(PREF_KEY_URL, LOCAL_ASSET_URL).apply();
                    webView.loadUrl(LOCAL_ASSET_URL);
                    Toast.makeText(MainActivity.this, "Switched to Bundled Offline App", Toast.LENGTH_SHORT).show();
                    break;
                case 3:
                    promptCustomUrl(currentUrl);
                    break;
            }
        });

        builder.setNegativeButton("Close", null);
        builder.show();
    }

    private void promptCustomUrl(String currentUrl) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Custom Server URL");
        builder.setMessage("Enter Wi-Fi IP (e.g. http://192.168.31.41:8080):");

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

        builder.setNegativeButton("Cancel", null);
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
}
