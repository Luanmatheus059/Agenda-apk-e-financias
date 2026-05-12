package com.luanmatheus.financas;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "BancoNotif")
public class BancoNotificationPlugin extends Plugin {

    private static final String PREFS = "banco_captured";
    private static final String KEY_LIST = "list";
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        super.load();
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                notifyListeners("newBankNotif", new JSObject());
            }
        };
        IntentFilter filter = new IntentFilter("com.luanmatheus.financas.NEW_BANK_NOTIF");
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        try { if (receiver != null) getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
        super.handleOnDestroy();
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isNotificationListenerEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getCaptured(final PluginCall call) {
        // Roda em background thread pra NÃO travar o thread principal
        new Thread(() -> {
            try {
                SharedPreferences sp = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                String raw = sp.getString(KEY_LIST, "[]");
                JSONArray arr = new JSONArray(raw);
                // Limita aos 100 mais recentes (evita travamento se acumulou muitos)
                int max = Math.min(100, arr.length());
                JSONArray limited = new JSONArray();
                for (int i = arr.length() - max; i < arr.length(); i++) {
                    if (i >= 0) limited.put(arr.get(i));
                }
                JSObject ret = new JSObject();
                // Retorna como STRING pra deixar JS parsar em background — não JSArray.from() que parsea 2x
                ret.put("items", limited.toString());
                ret.put("total", arr.length());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("get failed", e);
            }
        }).start();
    }

    @PluginMethod
    public void markResolved(final PluginCall call) {
        new Thread(() -> {
            try {
                String id = call.getString("id", "");
                if (TextUtils.isEmpty(id)) { call.reject("missing id"); return; }
                SharedPreferences sp = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                JSONArray arr = new JSONArray(sp.getString(KEY_LIST, "[]"));
                JSONArray out = new JSONArray();
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject o = arr.getJSONObject(i);
                    if (!o.optString("id").equals(id)) out.put(o);
                }
                sp.edit().putString(KEY_LIST, out.toString()).apply();
                call.resolve();
            } catch (Exception e) {
                call.reject("mark failed", e);
            }
        }).start();
    }

    @PluginMethod
    public void clearAll(final PluginCall call) {
        new Thread(() -> {
            getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_LIST, "[]").apply();
            call.resolve();
        }).start();
    }

    private boolean isNotificationListenerEnabled() {
        ComponentName cn = new ComponentName(getContext(), BancoNotificationService.class);
        String flat = Settings.Secure.getString(getContext().getContentResolver(),
                "enabled_notification_listeners");
        if (TextUtils.isEmpty(flat)) return false;
        for (String name : flat.split(":")) {
            ComponentName c = ComponentName.unflattenFromString(name);
            if (c != null && c.equals(cn)) return true;
        }
        return false;
    }
}
