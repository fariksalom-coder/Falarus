package com.falarus.mobile;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.view.View;
import android.view.Window;
import androidx.annotation.NonNull;
import androidx.core.graphics.ColorUtils;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tizim panellari (yuqoridagi soat/batareya va pastdagi tugmalar) sahifa bilan bir rangda bo'lsin.
 * Sahifa o'zining eng yuqori va eng pastki rangini yuboradi; oyna foni ikki qismga bo'yaladi
 * (WebView o'rtani yopadi, ko'rinadigani — faqat panellar ostidagi qism), belgilar rangi esa
 * fon ochiq bo'lsa to'q, to'q bo'lsa ochiq qilinadi.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    private int lastTop = 0;
    private int lastBottom = 0;

    @PluginMethod
    public void setColors(PluginCall call) {
        final int top;
        final int bottom;
        try {
            top = Color.parseColor(call.getString("top", "#0B2A6B"));
            bottom = Color.parseColor(call.getString("bottom", "#092B73"));
        } catch (IllegalArgumentException e) {
            call.reject("bad color");
            return;
        }
        if (top == lastTop && bottom == lastBottom) {
            call.resolve();
            return;
        }
        lastTop = top;
        lastBottom = bottom;
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            View decor = window.getDecorView();
            decor.setBackground(new SplitDrawable(top, bottom));
            window.setStatusBarColor(top);
            window.setNavigationBarColor(bottom);
            WindowInsetsControllerCompat c = WindowCompat.getInsetsController(window, decor);
            c.setAppearanceLightStatusBars(ColorUtils.calculateLuminance(top) > 0.5);
            c.setAppearanceLightNavigationBars(ColorUtils.calculateLuminance(bottom) > 0.5);
        });
        call.resolve();
    }

    /** Yuqori yarmi — bitta rang, pastki yarmi — boshqasi. */
    private static final class SplitDrawable extends Drawable {
        private final Paint top = new Paint();
        private final Paint bottom = new Paint();

        SplitDrawable(int topColor, int bottomColor) {
            top.setColor(topColor);
            bottom.setColor(bottomColor);
        }

        @Override
        public void draw(@NonNull Canvas canvas) {
            Rect b = getBounds();
            int mid = b.top + b.height() / 2;
            canvas.drawRect(b.left, b.top, b.right, mid, top);
            canvas.drawRect(b.left, mid, b.right, b.bottom, bottom);
        }

        @Override public void setAlpha(int alpha) {}
        @Override public void setColorFilter(ColorFilter colorFilter) {}
        @Override public int getOpacity() { return PixelFormat.OPAQUE; }
    }
}
