# 📋💰 Minha Agenda & Minhas Finanças — APKs Android

Dois apps Android nativos (Capacitor + WebView), gerados a partir dos HTMLs originais. Funcionam **100% offline**, dados ficam só no celular, e o build dos `.apk` é feito automaticamente pelo GitHub Actions.

---

## 📦 Como pegar os APKs prontos

1. **Faça push** desta branch (ou abra a aba **Actions** do GitHub e rode o workflow `Build APKs (Agenda + Finanças)` manualmente).
2. Espere o workflow terminar (~3–5 min).
3. Clique no run que terminou → role até **Artifacts**.
4. Baixe `agenda-apk` e `financas-apk`. Cada um é um `.zip` com o `.apk` dentro.

## 📲 Como instalar no celular

1. Transfira o `.apk` pro telefone (USB, Google Drive, Telegram pra si mesmo, qualquer jeito).
2. Abra o `.apk` pelo gerenciador de arquivos.
3. O Android vai pedir **"Permitir instalação de fontes desconhecidas"** — habilite só pra esse app (Configurações → Aplicativos → app de origem → Permitir).
4. Instale.

> **Sobre o "aviso de vírus":** o Play Protect e antivírus às vezes pedem confirmação pra apps instalados fora da Play Store. Isso **não é detecção de malware** — é a tela padrão de apps não publicados. O APK é assinado em modo debug pelo próprio Android Studio/CI, sem ofuscação suspeita, sem permissões abusivas. Pra eliminar o aviso por completo, publique na Play Store (Google Play Console, R$ 25 conta de desenvolvedor uma única vez).

---

## 📋 Minha Agenda

App da agenda semanal com tarefas, objetivos, projetos, compromissos, decisões e revisão semanal.

### Lembretes inteligentes (locais, sem servidor)

| Lembrete | Quando dispara | O que mostra |
|---|---|---|
| 🌅 Bom dia | Todo dia às **8h** | "Você tem X tarefas hoje" ou "Nada cadastrado pra hoje — abra e adicione!" |
| ⏰ Cobrança de atraso | 15 min após a hora marcada de cada tarefa pendente | "Tarefa 'X' estava marcada pra 14:30. Já fez?" |
| 📝 Revisão semanal | Todo **domingo às 19h** | "Hora da revisão da semana" |
| 🎯 Aba vazia | **Segunda às 9h**, só se você não preencheu Objetivos ou Projetos | "Sua semana ainda está em branco" |

Os lembretes são reagendados automaticamente a cada vez que você salva alguma coisa no app (todo `input`/`change`). Você não precisa configurar nada.

Pra ativar: toque no botão **🔔 Ativar** no topo. O Android vai pedir permissão de notificação — aceite.

---

## 💰 Minhas Finanças

Controle de receitas, despesas, status (Não Pago / Guardado / Pago), aquisições com meta mensal, investimentos por mês, e metas financeiras.

### Cálculos automáticos
Saldo, totais por status, % gastos por categoria, % concluído da aquisição, meta de investimento por % da renda mensal, total investido no ano — tudo recalculado a cada lançamento.

### 🏦 Captura automática das notificações dos bancos

A aba **🔔 Bancos** lê as notificações dos apps de banco instalados no seu celular (PIX, compras, transferências) e te deixa lançar com 1 toque como Entrada ou Saída.

**Bancos suportados** (basta o app oficial estar instalado e disparar notificação):
Nubank · Itaú · Bradesco · Santander · Inter · Banco do Brasil · C6 · Original · Next · Caixa · BRB · Sicredi · Sicoob · Pan · Mercado Pago · PicPay · Will · Neon

**Como ativar a captura:**
1. Abra a aba **🔔 Bancos** no app.
2. Toque em **"Abrir Configurações de Notificação"**.
3. Encontre **Minhas Finanças** na lista de "Acesso a notificações".
4. Ative o toggle. O Android vai pedir confirmação — confirme.
5. Pronto. A partir daí, toda notificação dos bancos da lista vira um item na aba 🔔 Bancos automaticamente.

> **Privacidade**: os dados ficam só no seu celular (`SharedPreferences` do app). Nada vai pra servidor — não tem servidor. Você pode revogar a permissão a qualquer momento nas mesmas Configurações.

### Lembretes da Finanças

| Lembrete | Quando |
|---|---|
| 💸 "Lançou os gastos de hoje?" | Todo dia às 20h |
| 📊 Revisão financeira | Domingo às 19h |
| ⚠️ Saldo negativo | Imediato, quando você lança uma despesa que deixa o saldo negativo |

### Importação manual (CSV/OFX)
Botão **🏦 Importar** no topo aceita CSV no formato `data;descrição;valor` (positivo = entrada, negativo = saída).

---

## 🛠️ Build local (se quiser compilar você mesmo)

Pré-requisitos: Node 20+, JDK 21, Android Studio (com SDK 34 instalado).

```bash
# Para cada app (agenda ou financas):
cd agenda
npm install
npx cap add android
# Copia AndroidManifest customizado e plugin Java
cp android-overrides/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
cp -r android-overrides/java/* android/app/src/main/java/   # só financas tem java overrides
npx cap sync android
cd android
./gradlew assembleDebug
# APK fica em: android/app/build/outputs/apk/debug/app-debug.apk
```

Pra build de release assinado, gere uma keystore (`keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias minhas-apps`) e configure no `android/app/build.gradle`.

---

## ⚠️ Sobre as expectativas

**O que esses apps fazem:**
- Empacotam os HTMLs originais como app Android nativo instalável
- Notificações locais funcionam mesmo com o app fechado, sem internet, sem servidor
- O app de Finanças lê notificações dos bancos (não os apps em si — só o que aparece na barra de notificação)
- Cálculos rodam no celular; nada sai dali

**O que NÃO fazem (e por quê):**
- ❌ **Não leem o saldo direto dos apps de banco.** Os apps de banco são isolados pelo Android (sandboxing) — nenhum outro app consegue ler dados deles. A única forma legal de ter saldo automaticamente é via **Open Finance Brasil**, que exige a empresa ser autorizada pelo Banco Central. Pra uso pessoal, a captura por notificação é o mais próximo que dá.
- ❌ **Não conseguem evitar 100% o aviso do Android ao instalar.** Apps fora da Play Store sempre mostram "fonte desconhecida". Não é vírus, é só a tela padrão.

---

## 📂 Estrutura do repo

```
/
├── agenda/                          ← projeto Capacitor da Agenda
│   ├── package.json
│   ├── capacitor.config.json
│   ├── www/index.html               ← HTML adaptado com Capacitor + notifs locais
│   └── android-overrides/
│       └── AndroidManifest.xml      ← manifest customizado (permissões)
│
├── financas/                        ← projeto Capacitor das Finanças
│   ├── package.json
│   ├── capacitor.config.json
│   ├── www/index.html               ← HTML com aba "🔔 Bancos"
│   └── android-overrides/
│       ├── AndroidManifest.xml      ← + serviço NotificationListener
│       └── java/com/luanmatheus/financas/
│           ├── BancoNotificationService.java   ← escuta notificações
│           ├── BancoNotificationPlugin.java    ← ponte JS ↔ Android
│           └── MainActivity.java               ← registra o plugin
│
└── .github/workflows/build-apks.yml ← CI que gera os 2 APKs
```

A pasta `*/android/` (gerada por `cap add android`) **não é commitada** — o CI gera ela do zero a cada build e aplica as customizações de `android-overrides/`.
