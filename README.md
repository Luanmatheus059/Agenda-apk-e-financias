# 📋💰 Minha Agenda & Minhas Finanças

Dois apps pessoais (Capacitor + WebView Android + PWA pra iOS). Funcionam **100% offline**, dados ficam só no celular.

## 🌐 Página de instalação (para compartilhar com qualquer pessoa)

Depois de habilitar GitHub Pages (instruções abaixo), o site fica em:

```
https://luanmatheus059.github.io/Agenda-apk-e-financias/
```

Manda esse link pra quem quiser instalar. A página detecta automaticamente Android/iOS e mostra as instruções certas pra cada um.

### Como ativar GitHub Pages (1x, ~30 segundos)

1. Vai em https://github.com/Luanmatheus059/Agenda-apk-e-financias/settings/pages
2. Em **Source** seleciona: **Deploy from a branch**
3. **Branch:** `main`
4. **Folder:** `/docs`
5. **Save**
6. Espera 1-2 minutos. O site fica online em `https://luanmatheus059.github.io/Agenda-apk-e-financias/`

---

## 🤖 Para Android (você)

APKs **assinados com chave de release** (não debug). Reduz muito os bloqueios do Play Protect.

### Baixar e instalar

| App | Direto pelo GitHub | Pelo site (Pages) |
|---|---|---|
| 📋 Agenda | [apks/minha-agenda.apk](apks/minha-agenda.apk) | `…/apks/minha-agenda.apk` |
| 💰 Finanças | [apks/minhas-financas.apk](apks/minhas-financas.apk) | `…/apks/minhas-financas.apk` |

### O que vai acontecer ao instalar

1. **Aviso "este tipo de arquivo pode prejudicar..."** → toca em **Baixar mesmo assim**
2. **"Por segurança, seu celular não permite..."** → ativa "Permitir desta fonte" no Chrome (Configurações → Apps → Chrome → Instalar apps desconhecidos → Permitir)
3. **Play Protect: "App não verificado"** → toca em **Mais detalhes** → **Instalar mesmo assim**
4. Instala

> ⚠️ Esses avisos **vão aparecer enquanto o app não estiver na Play Store**. Não tem como contornar — é segurança do Android. Eliminar 100% dos avisos = R$ 25 + Google Play Console + review do Google (~3 dias). É a única forma "oficial".

---

## 📱 Para iOS (esposa, qualquer iPhone)

**iOS não permite `.ipa` fora da App Store.** Mas o app já é um **PWA** — instala parecido como app nativo, sem App Store:

1. Abre **no Safari** (não funciona em outros browsers):
   - Agenda: `https://luanmatheus059.github.io/Agenda-apk-e-financias/agenda/`
   - Finanças: `https://luanmatheus059.github.io/Agenda-apk-e-financias/financas/`
2. Toca no ícone **Compartilhar** (quadrado com seta pra cima, embaixo da tela)
3. Rola e toca em **Adicionar à Tela de Início**
4. Confirma → vai aparecer o ícone na tela inicial
5. Abre **pelo ícone novo** (não pelo Safari) — assim roda em tela cheia, sem barra do browser

### O que funciona no iOS (PWA)
- ✅ Toda a interface e funções dos apps
- ✅ Funciona offline depois da primeira abertura
- ✅ Ícone na tela inicial, splash screen
- ✅ Notificações no iOS 16.4+

### O que NÃO funciona no iOS
- ❌ **Captura de notificações dos apps de banco** — proibido pela Apple pra qualquer app, não tem como
- Use a importação manual (CSV/extrato) na Finanças

---

## 🎯 Lembretes inteligentes

### 📋 Agenda
| Quando | O que aparece |
|---|---|
| 8h diário | "Você tem X tarefas hoje" ou "Nada cadastrado — abra e adicione!" |
| 15min após hora marcada | "Tarefa 'X' estava marcada pra 14:30. Já fez?" |
| Domingo 19h | "Hora da revisão da semana" |
| Segunda 9h | "Você não definiu Objetivos/Projetos" (só se vazio) |

### 💰 Finanças
| Quando | O que aparece |
|---|---|
| 20h diário | "Lançou os gastos de hoje?" (ou "Você não lança há X dias") |
| Domingo 19h | "Revisão financeira da semana" |
| Imediato | "Saldo negativo!" se despesas > receitas |

---

## 🏦 Captura automática de movimentações (só Android)

A aba **🔔 Bancos** lê notificações dos apps de banco e te deixa lançar como Entrada ou Saída com 1 toque.

### Bancos suportados
Nubank · Itaú · Bradesco · Santander · Inter · Banco do Brasil · C6 · Original · Next · Caixa · BRB · Sicredi · Sicoob · Pan · Mercado Pago · PicPay · Will · Neon

### Como ativar
1. Aba 🔔 Bancos → **Abrir Configurações de Notificação**
2. Acha **Minhas Finanças** na lista de "Acesso a notificações"
3. Ativa o toggle, confirma

Pronto. Qualquer PIX, compra ou transferência aparece automaticamente.

**Privacidade:** tudo fica no celular (`SharedPreferences`). Nada vai pra servidor.

---

## 🛠️ Build local (avançado)

```bash
cd agenda   # ou financas
npm install
npx cap add android
cp android-overrides/AndroidManifest.xml android/app/src/main/
cp -r android-overrides/java/* android/app/src/main/java/ 2>/dev/null || true
cp -r android-overrides/res/* android/app/src/main/res/ 2>/dev/null || true
cat android-overrides/release-signing.gradle >> android/app/build.gradle
npx cap sync android
cd android && ./gradlew assembleRelease
# APK em: app/build/outputs/apk/release/app-release.apk
```

A keystore (`keystore/release.jks`) e suas senhas estão no repo pra reproducibilidade. Se quiser trocar, edita `*/android-overrides/release-signing.gradle`.

---

## 📂 Estrutura

```
/
├── agenda/                 ← projeto Capacitor da Agenda
├── financas/               ← projeto Capacitor das Finanças
├── apks/                   ← APKs prontos (release-signed)
├── docs/                   ← Site GitHub Pages (PWA pra iOS + download Android)
├── keystore/               ← Chave de assinatura release
└── .github/workflows/      ← CI que rebuilda os APKs automaticamente
```

A pasta `*/android/` é regenerada a cada build (não commitada) — customizações ficam em `*/android-overrides/`.
