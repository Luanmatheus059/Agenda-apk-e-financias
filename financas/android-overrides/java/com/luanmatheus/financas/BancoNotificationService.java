package com.luanmatheus.financas;

import android.app.Notification;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Escuta notificações dos apps de banco instalados no celular.
 * Filtra por pacote conhecido, parseia valor + descrição, e armazena
 * num SharedPreferences que o WebView lê via plugin.
 *
 * Importante: o usuário precisa habilitar manualmente o acesso à notificação
 * em Configurações → Notificações → Acesso a notificações → Minhas Finanças.
 * Isso é exigência do Android, nenhum app consegue contornar.
 */
public class BancoNotificationService extends NotificationListenerService {
    private static final String TAG = "BancoNotif";
    private static final String PREFS = "banco_captured";
    private static final String KEY_LIST = "list";

    // Pacotes oficiais dos principais bancos brasileiros
    private static final Set<String> BANCOS = new HashSet<>();
    static {
        BANCOS.add("com.nu.production");                 // Nubank
        BANCOS.add("com.itau");                          // Itaú
        BANCOS.add("br.com.bradesco");                   // Bradesco
        BANCOS.add("com.santander.app");                 // Santander
        BANCOS.add("br.com.intermedium");                // Inter
        BANCOS.add("com.bb.android");                    // Banco do Brasil
        BANCOS.add("br.com.bb.android");
        BANCOS.add("com.c6bank.app");                    // C6 Bank
        BANCOS.add("br.com.original.bank");              // Original
        BANCOS.add("br.com.gerenciador.next");           // Next
        BANCOS.add("com.picpay");                        // PicPay
        BANCOS.add("br.com.mobicare.minhaoi");
        BANCOS.add("br.com.brb.mobilebanking");          // BRB
        BANCOS.add("br.com.sicredi.android");            // Sicredi
        BANCOS.add("br.com.sicoob");                     // Sicoob
        BANCOS.add("br.com.caixa");                      // Caixa
        BANCOS.add("br.com.bancopan.android");           // Pan
        BANCOS.add("com.mercadopago.wallet");            // Mercado Pago
        BANCOS.add("com.willbank.app");                  // Will Bank
        BANCOS.add("com.neon");                          // Neon
    }

    // Regex que casa "R$ 1.234,56" ou "R$ 1234.56" etc.
    private static final Pattern VALOR = Pattern.compile(
            "R\\$\\s*([0-9]{1,3}(?:[\\.,][0-9]{3})*(?:[\\.,][0-9]{2})?|[0-9]+(?:[\\.,][0-9]{1,2})?)"
    );

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            String pkg = sbn.getPackageName();
            if (!BANCOS.contains(pkg)) return;

            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            Bundle extras = n.extras;

            CharSequence tt = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence tx = extras.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence bg = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

            String titulo = tt != null ? tt.toString() : "";
            String texto = (bg != null ? bg.toString() : (tx != null ? tx.toString() : ""));
            String full = (titulo + " " + texto).trim();
            if (full.isEmpty()) return;

            Matcher m = VALOR.matcher(full);
            if (!m.find()) return;

            double valor = parseBR(m.group(1));
            if (valor <= 0) return;

            String tipo = guessTipo(full);   // "entrada" | "saida"
            String banco = nomeBanco(pkg);

            JSONObject item = new JSONObject();
            item.put("id", System.currentTimeMillis() + "-" + sbn.getId());
            item.put("pkg", pkg);
            item.put("banco", banco);
            item.put("titulo", titulo);
            item.put("texto", texto);
            item.put("valor", valor);
            item.put("tipo", tipo);
            item.put("data", new SimpleDateFormat("dd/MM/yyyy", new Locale("pt","BR")).format(new Date()));
            item.put("ts", System.currentTimeMillis());
            item.put("resolvido", false);

            SharedPreferences sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = sp.getString(KEY_LIST, "[]");
            JSONArray arr = new JSONArray(raw);

            // de-dup: se já tem um do mesmo pacote+valor+texto nos últimos 60s, pula
            long now = System.currentTimeMillis();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject prev = arr.getJSONObject(i);
                if (prev.optString("pkg").equals(pkg)
                        && Math.abs(prev.optDouble("valor") - valor) < 0.01
                        && (now - prev.optLong("ts")) < 60_000) return;
            }
            arr.put(item);

            // mantém só os últimos 200 pra não inflar storage
            while (arr.length() > 200) arr.remove(0);

            sp.edit().putString(KEY_LIST, arr.toString()).apply();

            // avisa o WebView se estiver aberto
            Intent broadcast = new Intent("com.luanmatheus.financas.NEW_BANK_NOTIF");
            broadcast.setPackage(getPackageName());
            sendBroadcast(broadcast);

            Log.d(TAG, "Captured " + banco + " " + tipo + " R$" + valor);
        } catch (Exception e) {
            Log.e(TAG, "onNotificationPosted error", e);
        }
    }

    @Override public void onNotificationRemoved(StatusBarNotification sbn) {}

    private static double parseBR(String s) {
        try {
            String clean = s.replace(".", "").replace(",", ".");
            // se tinha só vírgula como decimal o replace acima resolve;
            // se tinha ponto como decimal e nenhuma vírgula, precisa tratar:
            if (s.contains(",") || s.matches(".*\\.[0-9]{3}.*")) {
                clean = s.replace(".", "").replace(",", ".");
            } else {
                clean = s; // ex "1234.56"
            }
            return Double.parseDouble(clean);
        } catch (Exception e) { return 0; }
    }

    private static String guessTipo(String t) {
        String s = t.toLowerCase(new Locale("pt","BR"));
        // saídas
        if (s.contains("compra") || s.contains("pagamento") || s.contains("débito")
                || s.contains("debito") || s.contains("pix enviado") || s.contains("transferência enviada")
                || s.contains("transferencia enviada") || s.contains("ted enviada")
                || s.contains("saque") || s.contains("fatura")) return "saida";
        // entradas
        if (s.contains("recebido") || s.contains("recebeu") || s.contains("crédito")
                || s.contains("credito") || s.contains("entrada") || s.contains("depósito")
                || s.contains("deposito") || s.contains("salário") || s.contains("salario")
                || s.contains("pix recebido")) return "entrada";
        // default conservador: saída (a maioria das notificações são gasto)
        return "saida";
    }

    private static String nomeBanco(String pkg) {
        if (pkg.contains("nu.production")) return "Nubank";
        if (pkg.contains("itau")) return "Itaú";
        if (pkg.contains("bradesco")) return "Bradesco";
        if (pkg.contains("santander")) return "Santander";
        if (pkg.contains("intermedium")) return "Inter";
        if (pkg.contains("bb.android")) return "Banco do Brasil";
        if (pkg.contains("c6bank")) return "C6";
        if (pkg.contains("original")) return "Original";
        if (pkg.contains("next")) return "Next";
        if (pkg.contains("picpay")) return "PicPay";
        if (pkg.contains("brb")) return "BRB";
        if (pkg.contains("sicredi")) return "Sicredi";
        if (pkg.contains("sicoob")) return "Sicoob";
        if (pkg.contains("caixa")) return "Caixa";
        if (pkg.contains("bancopan")) return "Pan";
        if (pkg.contains("mercadopago")) return "Mercado Pago";
        if (pkg.contains("willbank")) return "Will";
        if (pkg.contains("neon")) return "Neon";
        return "Banco";
    }
}
