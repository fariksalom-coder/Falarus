package com.falarus.mobile;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.ActionMode;
import android.view.View;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    /** Pastki menyu gradientining pastki rangi — tizim paneli oq qolmasin. */
    private static final int NAV_BLUE = 0xFF092B73;
    private static final int STATUS_BLUE = 0xFF0B2A6B;
    private static final int NOTIFICATION_REQ = 43;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NotificationSettingsPlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        // Barcha Android versiyalarida bir xil: oyna edge-to-edge, WebView chegaralarini Capacitor
        // (adjustMarginsForEdgeToEdge: force) va klaviatura plagini beradi. Android 14 va eskisida
        // shunday bo'lmasa, tepa ikki marta hisoblanib, klaviatura chatning yozish maydonini yopardi.
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.getDecorView().setBackgroundColor(STATUS_BLUE);
        window.setStatusBarColor(STATUS_BLUE);
        window.setNavigationBarColor(NAV_BLUE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }
        if (getBridge() != null && getBridge().getWebView() != null) {
            sozlaWebView(getBridge().getWebView());
        }
        sozlaBoshlangichRuxsatlar();
        // Telegram taklifi: birinchi ochilishda rejalashtiriladi; keyingi ochilishlarda reja tiklanadi
        // (telefon qayta yoqilgan bo'lsa yoki vaqti o'tib ketgan bo'lsa — darhol chiqadi).
        TelegramInvite.scheduleOnFirstLaunch(this);
        TelegramInvite.restore(this);
        sozlaSaytSahifasidanOrqaga();
    }

    /**
     * Saytdan ochilgan sahifada (video dars — falarus.uz/exercise.html) ilovaning JS «Orqaga»
     * mantig'i yo'q. Bu yerda telefonning «Orqaga» tugmasi ilovaga qaytaradi; boshqa joylarda
     * odatdagi (Capacitor App plugini) ishlov ishlaydi. Keyin qo'shilgani uchun ustuvor.
     */
    private void sozlaSaytSahifasidanOrqaga() {
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                String url = webView != null ? webView.getUrl() : null;
                if (webView != null && url != null && isFalarusHost(Uri.parse(url).getHost())) {
                    if (webView.canGoBack()) webView.goBack();
                    else webView.loadUrl("https://localhost/games");
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() != null && getBridge().getWebView() != null) {
            sozlaWebView(getBridge().getWebView());
        }
    }

    private boolean webViewSozlangan;

    private void sozlaWebView(WebView webView) {
        if (!webViewSozlangan) {
            webView.setBackgroundColor(NAV_BLUE);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setHapticFeedbackEnabled(false);
            webView.setLongClickable(false);
            webView.setOnLongClickListener(v -> true);
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setTextZoom(100);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                settings.setOffscreenPreRaster(true);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
            }
            webViewSozlangan = true;
        }
        sozlaChromeRuxsat(webView);
        mediaProksiniUla();
        webView.post(this::mediaProksiniUla);
    }

    private void sozlaChromeRuxsat(WebView webView) {
        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (request == null) return;
                /*
                 * Telefon ruxsatlari allaqachon berilgan bo'lsa — sahifa so'raganining HAMMASI beriladi.
                 * Ilgari faqat mikrofon berilardi: video dars kamera+mikrofonni birga so'raganda
                 * kamera tashlab yuborilib, o'quvchi o'zini qora ekranda ko'rardi.
                 * Biror ruxsat hali berilmagan bo'lsa — Capacitor uni telefondan o'zi so'raydi.
                 */
                boolean allGranted = true;
                boolean known = true;
                for (String resource : request.getResources()) {
                    String perm;
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) perm = Manifest.permission.RECORD_AUDIO;
                    else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) perm = Manifest.permission.CAMERA;
                    else { known = false; break; }
                    if (ContextCompat.checkSelfPermission(MainActivity.this, perm) != PackageManager.PERMISSION_GRANTED) {
                        allGranted = false;
                    }
                }
                if (known && allGranted && request.getResources().length > 0) {
                    final String[] resources = request.getResources();
                    webView.post(() -> request.grant(resources));
                    return;
                }
                super.onPermissionRequest(request);
            }
        });
    }

    private void mediaProksiniUla() {
        if (getBridge() == null) return;
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String mediaUrl = mediaUrl(request);
                if (mediaUrl != null) {
                    WebResourceResponse proxied = proxyFalarusMedia(request, mediaUrl);
                    if (proxied != null) return proxied;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String appUrl = request != null ? appUrlForLeavingLesson(view, request.getUrl()) : null;
                if (appUrl != null) {
                    view.loadUrl(appUrl);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (view == null || url == null) return;
                if (url.contains("/oauth/google-done") || url.contains("/oauth/google-native")) return;
                view.evaluateJavascript(
                    "(function(){try{var p=new URLSearchParams((location.hash||'').replace(/^#/,''));var t=p.get('id_token');return t||'';}catch(e){return '';}})()",
                    value -> {
                        if (value == null || "null".equals(value) || "\"\"".equals(value)) return;
                        String token = value;
                        if (token.length() >= 2 && token.charAt(0) == '"' && token.charAt(token.length() - 1) == '"') {
                            token = token.substring(1, token.length() - 1).replace("\\\"", "\"");
                        }
                        if (token.isEmpty() || !token.contains(".")) return;
                        final String dest = "https://localhost/oauth/google-done#id_token=" + Uri.encode(token);
                        view.post(() -> view.loadUrl(dest));
                    }
                );
            }
        });
    }

    /** Live /uploads video-rasm yoki Capacitor HTTP proxy orqali kelgan media. */
    private static String mediaUrl(WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        String method = request.getMethod();
        if (method == null) return null;
        String m = method.toUpperCase(Locale.US);
        if (m.equals("HEAD")) return null;
        if (!m.equals("GET")) return null;
        Uri uri = request.getUrl();
        String path = uri.getPath();
        if (path != null && path.startsWith("/_capacitor_http_interceptor_")) {
            String u = uri.getQueryParameter("u");
            if (u != null && (u.contains("/uploads/") || u.contains("/courses/") || u.contains("/videos/") || u.contains("/payment-guide/") || u.contains(".mp4"))) {
                return u;
            }
            return null;
        }
        String host = uri.getHost();
        if (host == null) return null;
        host = host.toLowerCase(Locale.US);
        if (!host.equals("falarus.uz") && !host.equals("www.falarus.uz") && !host.equals("media.falarus.uz")) {
            return null;
        }
        if (path == null) return null;
        if (path.startsWith("/uploads/") || path.startsWith("/courses/") || path.startsWith("/videos/")
                || path.startsWith("/payment-guide/")) {
            return uri.toString();
        }
        return null;
    }

    /**
     * Video dars sahifasi (falarus.uz/exercise.html) saytdan ochiladi — 100MB+ video
     * proksi orqali o'ynamaydi, saytning o'zidan esa darhol boshlanadi.
     * Dars sahifasidan saytning boshqa sahifasiga o'tilsa (masalan «Назад» → /games),
     * saytga emas, ilovaning o'zidagi shu sahifaga qaytamiz.
     */
    private static String appUrlForLeavingLesson(WebView view, Uri target) {
        if (view == null || target == null) return null;
        String current = view.getUrl();
        if (current == null) return null;
        Uri from = Uri.parse(current);
        if (!isFalarusHost(from.getHost()) || from.getPath() == null || !from.getPath().startsWith("/exercise")) return null;
        if (!isFalarusHost(target.getHost())) return null;
        String path = target.getPath();
        if (path == null || path.startsWith("/exercise") || path.startsWith("/api/")) return null;
        String query = target.getEncodedQuery();
        return "https://localhost" + path + (query != null ? "?" + query : "");
    }

    private static boolean isFalarusHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.US);
        return h.equals("falarus.uz") || h.equals("www.falarus.uz");
    }

    /**
     * falarus.uz CORP=same-origin — WebView (localhost) to‘g‘ridan-to‘g‘ri o‘qiy olmaydi.
     * Range ni serverga uzatamiz: butun 19MB ni 200 qilib qaytarsak video yarimyo‘lda qotadi.
     */
    private WebResourceResponse proxyFalarusMedia(WebResourceRequest request, String mediaUrl) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(mediaUrl).openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "FalaRusAndroid");
            String range = requestHeader(request, "Range");
            if (range != null && !range.isEmpty()) {
                conn.setRequestProperty("Range", range);
            }
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK && code != HttpURLConnection.HTTP_PARTIAL) {
                conn.disconnect();
                return null;
            }
            String mime = conn.getContentType();
            if (mime == null || mime.isEmpty()) mime = mimeFromPath(mediaUrl);
            int semi = mime.indexOf(';');
            if (semi > 0) mime = mime.substring(0, semi).trim();
            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", mime);
            String contentLength = conn.getHeaderField("Content-Length");
            if (contentLength != null && !contentLength.isEmpty()) {
                headers.put("Content-Length", contentLength);
            }
            String contentRange = conn.getHeaderField("Content-Range");
            if (contentRange != null && !contentRange.isEmpty()) {
                headers.put("Content-Range", contentRange);
            }
            headers.put("Accept-Ranges", "bytes");
            headers.put("Access-Control-Allow-Origin", "*");
            String reason = code == HttpURLConnection.HTTP_PARTIAL ? "Partial Content" : "OK";
            // WebView Range ni o'zi ham qo'llaydi: javobdagi oqimdan boshlang'ich baytgacha skip() qiladi.
            // Server esa allaqachon o'sha joydan boshlab bergan — ikki marta o'tkazib yubormaslik uchun
            // shu birinchi skip ni "bajarildi" deb qaytaramiz (aks holda moov oxirida turgan .m4a ochilmaydi).
            long alreadySkipped = code == HttpURLConnection.HTTP_PARTIAL ? rangeStart(contentRange) : 0;
            InputStream body = new DisconnectOnClose(conn.getInputStream(), conn, alreadySkipped);
            conn = null;
            return new WebResourceResponse(mime, null, code, reason, headers, body);
        } catch (Exception ignored) {
            if (conn != null) conn.disconnect();
            return null;
        }
    }

    private static String requestHeader(WebResourceRequest request, String name) {
        if (request == null) return null;
        Map<String, String> headers = request.getRequestHeaders();
        if (headers == null || headers.isEmpty()) return null;
        String direct = headers.get(name);
        if (direct != null) return direct;
        for (Map.Entry<String, String> e : headers.entrySet()) {
            if (e.getKey() != null && e.getKey().equalsIgnoreCase(name)) {
                return e.getValue();
            }
        }
        return null;
    }

    private static final class DisconnectOnClose extends InputStream {
        private final InputStream in;
        private final HttpURLConnection conn;

        /** Server Range bo'yicha tashlab yuborgan baytlar: WebView skip() qilganda shuncha "o'tkazilgan" deymiz. */
        private long serverSkipped;

        DisconnectOnClose(InputStream in, HttpURLConnection conn, long serverSkipped) {
            this.in = in;
            this.conn = conn;
            this.serverSkipped = Math.max(0, serverSkipped);
        }

        @Override
        public int read() throws IOException {
            return in.read();
        }

        @Override
        public int read(byte[] b) throws IOException {
            return in.read(b);
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            return in.read(b, off, len);
        }

        @Override
        public long skip(long n) throws IOException {
            if (serverSkipped > 0 && n > 0) {
                long virtual = Math.min(n, serverSkipped);
                serverSkipped -= virtual;
                return virtual + (n > virtual ? in.skip(n - virtual) : 0);
            }
            return in.skip(n);
        }

        @Override
        public int available() throws IOException {
            return in.available();
        }

        @Override
        public void close() throws IOException {
            try {
                in.close();
            } finally {
                conn.disconnect();
            }
        }
    }

    /** "bytes 260000-266547/266548" -> 260000; tushunarsiz bo'lsa 0. */
    private static long rangeStart(String contentRange) {
        if (contentRange == null) return 0;
        String v = contentRange.trim();
        if (v.toLowerCase(Locale.US).startsWith("bytes")) v = v.substring(5).trim();
        int dash = v.indexOf('-');
        if (dash <= 0) return 0;
        try {
            return Long.parseLong(v.substring(0, dash).trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String mimeFromPath(String path) {
        if (path == null) return "application/octet-stream";
        String lower = path.toLowerCase(Locale.US);
        int query = lower.indexOf('?');
        if (query >= 0) lower = lower.substring(0, query);
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "application/octet-stream";
    }

    @Override
    public ActionMode startActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    public ActionMode startActionMode(ActionMode.Callback callback, int type) {
        return null;
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        if (mode != null) mode.finish();
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN
                || requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            return;
        }
        if (getBridge() == null) return;
        PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
        if (pluginHandle == null) {
            Log.i("Google Activity Result", "SocialLogin handle is null");
            return;
        }
        Plugin plugin = pluginHandle.getInstance();
        if (!(plugin instanceof SocialLoginPlugin)) {
            Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
            return;
        }
        ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}

    private void sozlaBoshlangichRuxsatlar() {
        android.content.SharedPreferences prefs = getSharedPreferences("permissions", MODE_PRIVATE);
        if (Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("notificationsAsked", false)
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            prefs.edit().putBoolean("notificationsAsked", true).apply();
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQ);
        }
        // Mikrofon ochilishda so'ralmaydi (Google Play: ruxsat kerak bo'lgan paytda so'ralsin).
        // Sahifa mikrofonni yoqqanda BridgeWebChromeClient ruxsatni o'zi so'raydi.
    }
}
