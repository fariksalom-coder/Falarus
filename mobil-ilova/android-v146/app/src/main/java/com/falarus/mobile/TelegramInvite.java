package com.falarus.mobile;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Telegram kanaliga taklif: ro'yxatdan o'tgandan 1 soat keyin, bir marta.
 * AlarmManager orqali rejalashtiriladi — ilova yopiq bo'lsa ham keladi.
 * Telefon qayta yoqilsa, ilova ochilganda {@link #restore} rejani tiklaydi.
 */
final class TelegramInvite {
    static final String CHANNEL = "community";
    static final int NOTIFICATION_ID = 2002;
    static final String DEFAULT_URL = "https://t.me/falarus";

    private static final String PREFS = "community";
    private static final String KEY_SHOWN = "telegramInviteShown_v4";
    private static final String KEY_AT = "telegramInviteAt_v4";
    private static final String KEY_URL = "telegramInviteUrl";
    private static final String KEY_TITLE = "telegramInviteTitle";
    private static final String KEY_BODY = "telegramInviteBody";
    private static final String KEY_BUTTON = "telegramInviteButton";

    private TelegramInvite() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Bildirishnomani `delayMs` dan keyin chiqishga rejalashtiradi (allaqachon ko'rsatilgan bo'lsa — yo'q). */
    static boolean schedule(Context ctx, long delayMs, String url, String title, String body, String button) {
        SharedPreferences p = prefs(ctx);
        if (p.getBoolean(KEY_SHOWN, false)) return false;
        long at = System.currentTimeMillis() + Math.max(0, delayMs);
        p.edit()
                .putLong(KEY_AT, at)
                .putString(KEY_URL, url)
                .putString(KEY_TITLE, title)
                .putString(KEY_BODY, body)
                .putString(KEY_BUTTON, button)
                .apply();
        setAlarm(ctx, at);
        return true;
    }

    /**
     * Ilova o'rnatilgandan keyingi BIRINCHI ochilishda — `FIRST_LAUNCH_DELAY_MS` dan keyin.
     * Ro'yxatdan o'tgan-o'tmaganiga, eski hisobi bor-yo'qligiga qaramaydi; har o'rnatishga bir marta.
     */
    // Ilova birinchi ochilgandan 1 soat keyin.
    static final long FIRST_LAUNCH_DELAY_MS = 60L * 60L * 1000L;

    static void scheduleOnFirstLaunch(Context ctx) {
        SharedPreferences p = prefs(ctx);
        if (p.getLong(KEY_AT, 0) != 0 || p.getBoolean(KEY_SHOWN, false)) return;
        schedule(ctx, FIRST_LAUNCH_DELAY_MS, DEFAULT_URL,
                "FalaRus — bepul darslar",
                "Bepul darslar uchun Telegram kanalga obuna bo'ling",
                "Telegram kanalga qo'shilish");
    }

    /** Ilova ochilganda: reja bor-u ko'rsatilmagan bo'lsa — vaqti o'tgan bo'lsa darhol, aks holda budilnikni tiklaydi. */
    static void restore(Context ctx) {
        SharedPreferences p = prefs(ctx);
        long at = p.getLong(KEY_AT, 0);
        if (at == 0 || p.getBoolean(KEY_SHOWN, false)) return;
        if (System.currentTimeMillis() >= at) {
            post(ctx);
        } else {
            setAlarm(ctx, at);
        }
    }

    private static void setAlarm(Context ctx, long at) {
        AlarmManager alarms = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(ctx, TelegramInviteReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
                ctx, NOTIFICATION_ID, intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        // Aniq vaqt ruxsatisiz ishlaydi; telefon uxlash rejimida bo'lsa bir oz kechikishi mumkin.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
    }

    /** Bildirishnomani hozir chiqaradi. Bildirishnomalar o'chiq bo'lsa — keyingi ochilishda qayta uriniladi. */
    static void post(Context ctx) {
        SharedPreferences p = prefs(ctx);
        if (p.getBoolean(KEY_SHOWN, false)) return;
        NotificationManagerCompat manager = NotificationManagerCompat.from(ctx);
        if (!manager.areNotificationsEnabled()) return;

        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL, "FalaRus hamjamiyati", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Telegram kanali va hamjamiyat yangiliklari");
            NotificationManager system = ctx.getSystemService(NotificationManager.class);
            if (system != null) system.createNotificationChannel(channel);
        }

        String url = p.getString(KEY_URL, DEFAULT_URL);
        String title = p.getString(KEY_TITLE, "FalaRus — bepul darslar");
        String body = p.getString(KEY_BODY, "Bepul darslar uchun Telegram kanalga obuna bo'ling");
        String button = p.getString(KEY_BUTTON, "Telegram kanalga qo'shilish");

        PendingIntent open = PendingIntent.getActivity(
                ctx, NOTIFICATION_ID, openIntent(ctx, url),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Bitmap icon = appIconBitmap(ctx, 96);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_falarus)
                .setColor(0xFF0B2A6B)
                .setLargeIcon(icon)
                .setContentTitle(title)
                .setContentText(body)
                // Katta banner — bildirishnoma odatdagidan ~3 baravar baland ko'rinadi.
                .setStyle(new NotificationCompat.BigPictureStyle()
                        .bigPicture(banner(ctx, icon))
                        .bigLargeIcon((Bitmap) null)
                        .setSummaryText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
                .setAutoCancel(true)
                .setContentIntent(open)
                .addAction(0, button, open);

        try {
            manager.notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException e) {
            return;
        }
        p.edit().putBoolean(KEY_SHOWN, true).apply();
    }

    /** Telegram o'rnatilgan bo'lsa — Telegram ilovasida, aks holda brauzerda. */
    private static Intent openIntent(Context ctx, String url) {
        Uri parsed = Uri.parse(url);
        String host = parsed.getHost();
        String domain = parsed.getLastPathSegment();
        Intent intent = null;
        if (host != null && host.endsWith("t.me") && domain != null && !domain.isEmpty()) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse("tg://resolve?domain=" + domain));
            if (intent.resolveActivity(ctx.getPackageManager()) == null) intent = null;
        }
        if (intent == null) intent = new Intent(Intent.ACTION_VIEW, parsed);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    private static Bitmap appIconBitmap(Context ctx, int dp) {
        try {
            Drawable drawable = ctx.getPackageManager().getApplicationIcon(ctx.getPackageName());
            int size = Math.round(dp * ctx.getResources().getDisplayMetrics().density);
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, size, size);
            drawable.draw(canvas);
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    /** Bildirishnoma ichidagi katta banner: ko'k fon, FalaRus logotipi va "Bepul darslar". */
    private static Bitmap banner(Context ctx, Bitmap icon) {
        int w = 1024;
        int h = 512;
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setShader(new LinearGradient(0, 0, w, h, 0xFF0B2A6B, 0xFF2563EB, Shader.TileMode.CLAMP));
        canvas.drawRect(0, 0, w, h, bg);

        Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        glow.setColor(0x1FFFFFFF);
        canvas.drawCircle(w - 80, 60, 220, glow);
        canvas.drawCircle(60, h - 20, 160, glow);

        if (icon != null) {
            int size = 220;
            RectF dst = new RectF(70, (h - size) / 2f, 70 + size, (h + size) / 2f);
            canvas.drawBitmap(icon, null, dst, new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
        }

        Paint headline = new Paint(Paint.ANTI_ALIAS_FLAG);
        headline.setColor(0xFFFFFFFF);
        headline.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        headline.setTextSize(86);
        canvas.drawText("Bepul darslar", 340, 230, headline);

        Paint sub = new Paint(Paint.ANTI_ALIAS_FLAG);
        sub.setColor(0xE6FFFFFF);
        sub.setTextSize(46);
        canvas.drawText("Telegram kanalimizda", 340, 300, sub);

        Paint chip = new Paint(Paint.ANTI_ALIAS_FLAG);
        chip.setColor(0xFFFFFFFF);
        RectF pill = new RectF(340, 340, 700, 410);
        canvas.drawRoundRect(pill, 35, 35, chip);
        Paint chipText = new Paint(Paint.ANTI_ALIAS_FLAG);
        chipText.setColor(0xFF0B2A6B);
        chipText.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        chipText.setTextSize(36);
        chipText.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("t.me/falarus", pill.centerX(), pill.centerY() + 13, chipText);
        return bitmap;
    }
}
