package com.luanmatheus.financas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service que mantém o app vivo em background.
 * Android NÃO pode matar foreground services sem o usuário explicitamente parar.
 * Notif persistente fica visível (pequena) na bandeja.
 */
public class KeepAliveService extends Service {
    private static final int NOTIF_ID = 1001;
    private static final String CHANNEL_ID = "financas-keepalive";

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Agente Financeiro 24/7",
                NotificationManager.IMPORTANCE_MIN  // discreto, sem som
            );
            channel.setDescription("Mantém o agente financeiro rodando em background");
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Agente Financeiro ativo")
            .setContentText("Monitorando mercado 24/7. Toque para abrir.")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pi)
            .build();
        startForeground(NOTIF_ID, n);
        return START_STICKY;  // sistema reinicia se matado
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
