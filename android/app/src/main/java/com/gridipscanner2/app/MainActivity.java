package com.gridipscanner2.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private MobileEngineServer mobileEngine;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        mobileEngine = new MobileEngineServer(this);
        mobileEngine.start();
        super.onCreate(savedInstanceState);

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public String getApiBaseUrl() {
                        return mobileEngine != null ? mobileEngine.getBaseUrl() : "http://127.0.0.1:3031";
                    }
                }, "AndroidScanBridge");
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onDestroy() {
        if (mobileEngine != null) {
            mobileEngine.stop();
        }
        super.onDestroy();
    }
}
