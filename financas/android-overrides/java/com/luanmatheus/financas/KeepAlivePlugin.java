package com.luanmatheus.financas;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KeepAlive")
public class KeepAlivePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Intent svc = new Intent(getContext(), KeepAliveService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getContext().startForegroundService(svc);
        } else {
            getContext().startService(svc);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent svc = new Intent(getContext(), KeepAliveService.class);
        getContext().stopService(svc);
        call.resolve();
    }
}
