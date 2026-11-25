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
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SharedPreferences prefs;
    private static final String PREF_KEY_URL = "server_url";
    private static final String DEFAULT_URL = "http://192.168.31.41:8080";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences("SangeetPrefs", Context.MODE_PRIVATE);
        webView = findViewById(R.id.webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Long press anywhere with 2 fingers or long click to change server URL
        webView.setOnLongClickListener(v -> {
            promptChangeServerUrl();
            return true;
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
            }
        });

        loadCurrentServerUrl();
    }

    private void loadCurrentServerUrl() {
        String currentUrl = prefs.getString(PREF_KEY_URL, DEFAULT_URL);
        if (webView != null) {
            webView.loadUrl(currentUrl);
        }
    }

    private void promptChangeServerUrl() {
        String currentUrl = prefs.getString(PREF_KEY_URL, DEFAULT_URL);
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Change Sangeet Server URL");
        builder.setMessage("Enter Wi-Fi IP (e.g. http://192.168.31.41:8080) or Cloudflare Mobile Data URL (https://*.trycloudflare.com):");

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

        builder.setNegativeButton("Reset Default", (dialog, which) -> {
            prefs.edit().putString(PREF_KEY_URL, DEFAULT_URL).apply();
            webView.loadUrl(DEFAULT_URL);
            Toast.makeText(MainActivity.this, "Reset to default Wi-Fi URL", Toast.LENGTH_SHORT).show();
        });

        builder.setNeutralButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
