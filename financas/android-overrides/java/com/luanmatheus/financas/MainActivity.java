package com.luanmatheus.financas;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BancoNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
