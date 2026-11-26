package com.sangeet.local;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
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
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private SharedPreferences prefs;
    private WebViewAssetLoader assetLoader;

    private static final String PREF_KEY_URL = "server_url";
    private static final String LOCAL_ASSET_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String GITHUB_PAGES_URL = "https://prg-git.github.io/sangeet-local/";

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

        // Long press to change connection or switch between offline/online
        webView.setOnLongClickListener(v -> {
            promptChangeServerUrl();
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
                // If offline and trying to load remote URL, offer to load local bundled app
                if (request.isForMainFrame() && !request.getUrl().toString().startsWith(LOCAL_ASSET_URL)) {
                    Toast.makeText(MainActivity.this, "Network unavailable: Loading bundled offline app...", Toast.LENGTH_SHORT).show();
                    view.loadUrl(LOCAL_ASSET_URL);
                }
            }
        });

        // Pull to refresh
        if (swipeRefresh != null) {
            swipeRefresh.setColorSchemeColors(0xFF10B981, 0xFF8B5CF6, 0xFF06B6D4);
            swipeRefresh.setOnRefreshListener(() -> {
                if (webView != null) {
                    webView.reload();
                }
            });
        }

        loadCurrentServerUrl();
    }

    private void loadCurrentServerUrl() {
        String currentUrl = prefs.getString(PREF_KEY_URL, LOCAL_ASSET_URL);
        if (webView != null) {
            webView.loadUrl(currentUrl);
        }
    }

    private void promptChangeServerUrl() {
        String currentUrl = prefs.getString(PREF_KEY_URL, LOCAL_ASSET_URL);
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

        builder.setNegativeButton("Online (GitHub)", (dialog, which) -> {
            prefs.edit().putString(PREF_KEY_URL, GITHUB_PAGES_URL).apply();
            webView.loadUrl(GITHUB_PAGES_URL);
            Toast.makeText(MainActivity.this, "Switched to GitHub Online Version", Toast.LENGTH_SHORT).show();
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
}
