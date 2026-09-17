package com.alcaldia.aseourbano.censo;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;
    private LocationManager locationManager;
    private Location lastLocation;
    private static final int PERMISSION_REQUEST_CODE = 1001;

    public static final double ROSARIO_LAT = 10.3267;
    public static final double ROSARIO_LNG = -72.3125;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(0xFF070B14);
            window.setNavigationBarColor(0xFF070B14);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 10; Mobile) AseoUrbanoRosario/2.3");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.addJavascriptInterface(new NativeGpsBridge(), "AndroidGPS");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                startLocationUpdates();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, true);
            }
        });

        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        checkLocationPermissions();

        webView.loadUrl("file:///android_asset/index.html");
    }

    private void checkLocationPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms = {
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            };
            boolean need = false;
            for (String p : perms) {
                if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) {
                    need = true;
                    break;
                }
            }
            if (need) {
                requestPermissions(perms, PERMISSION_REQUEST_CODE);
                return;
            }
        }
        startLocationUpdates();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        startLocationUpdates();
    }

    private void startLocationUpdates() {
        if (locationManager == null) return;

        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location loc) {
                if (loc != null) {
                    lastLocation = loc;
                    dispatchLocation(loc.getLatitude(), loc.getLongitude(), loc.getAccuracy(), "GPS Satelital Vivo");
                }
            }
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };

        try {
            boolean hasGps = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
            boolean hasNet = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);

            if (hasGps) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, listener);
            }
            if (hasNet) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 1000, 0, listener);
            }

            Location best = null;
            if (hasGps) best = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (best == null && hasNet) best = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (best == null) {
                try {
                    best = locationManager.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER);
                } catch (Exception ignored) {}
            }

            if (best != null) {
                lastLocation = best;
                dispatchLocation(best.getLatitude(), best.getLongitude(), best.getAccuracy(), "GPS Directo");
            } else {
                dispatchLocation(ROSARIO_LAT, ROSARIO_LNG, 5.0f, "Villa del Rosario");
            }
        } catch (SecurityException se) {
            dispatchLocation(ROSARIO_LAT, ROSARIO_LNG, 10.0f, "Villa del Rosario");
        }
    }

    private void dispatchLocation(final double lat, final double lng, final float acc, final String source) {
        if (webView != null) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    String js = "if (window.onNativeGps) { window.onNativeGps(" + lat + ", " + lng + ", " + acc + ", '" + source + "'); }";
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                        webView.evaluateJavascript(js, null);
                    } else {
                        webView.loadUrl("javascript:" + js);
                    }
                }
            });
        }
    }

    public class NativeGpsBridge {
        @JavascriptInterface
        public void refreshGps() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startLocationUpdates();
                }
            });
        }

        @JavascriptInterface
        public String getLastCoordinates() {
            if (lastLocation != null) {
                return lastLocation.getLatitude() + "," + lastLocation.getLongitude() + "," + lastLocation.getAccuracy();
            }
            try {
                if (locationManager != null) {
                    Location loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    if (loc == null) loc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    if (loc != null) {
                        lastLocation = loc;
                        return loc.getLatitude() + "," + loc.getLongitude() + "," + loc.getAccuracy();
                    }
                }
            } catch (SecurityException ignored) {}
            return "";
        }

        @JavascriptInterface
        public String getDeviceCoordinates() {
            return getLastCoordinates();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
