package com.falarus.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Budilnik vaqti kelganda Telegram taklifi bildirishnomasini chiqaradi (ilova yopiq bo'lsa ham). */
public class TelegramInviteReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        TelegramInvite.post(context);
    }
}
