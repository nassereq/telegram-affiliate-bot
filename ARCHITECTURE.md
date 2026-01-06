# 🏗️ Arquitetura do Projeto - Telegram Affiliate Bot

## 📋 Visão Geral

Bot multi-plataforma automatizado para criar e publicar anúncios de produtos da Mercado Livre e Amazon com links de afiliados. Utiliza análise de imagem com IA, sistema de fila com agendamento automático, e broadcasting simultâneo para Telegram e WhatsApp.

---

## 🛠️ Stack Tecnológica

### **Linguagem Principal**

- **TypeScript** (superset de JavaScript com tipagem estática)

### **Runtime**

- **Node.js** (ambiente de execução JavaScript)

### **Frameworks e Bibliotecas**

- **Telegraf 4.16.3** - Framework para criar bots do Telegram
- **whatsapp-web.js 1.26.0** - Cliente WhatsApp Web API (integração WhatsApp)
- **Puppeteer 21.11.0** - Headless Chrome para scraping e WhatsApp
- **Axios 0.21.4** - Cliente HTTP para requisições
- **Cheerio 1.1.2** - Parser HTML para scraping (Amazon/ML)
- **dotenv** - Gerenciamento de variáveis de ambiente
- **Sharp 0.33.5** - Processamento e otimização de imagens
- **qrcode-terminal 0.12.0** - Exibição de QR code no terminal
- **Express 4.18.2** - Servidor HTTP

### **APIs Externas**

- **GitHub Models API** - Análise de imagem com GPT-4 Vision
- **Telegram Bot API** - Comunicação com o Telegram
- **WhatsApp Web API** - Comunicação com WhatsApp (via whatsapp-web.js)
- **Mercado Livre** - Scraping de produtos com Puppeteer
- **Amazon Brasil** - Scraping de produtos com Cheerio

---

## 📁 Estrutura de Diretórios

```
telegram-affiliate-bot/
│
├── src/                          # Código fonte
│   ├── app.ts                    # Aplicação principal (Entry point)
│   │
│   ├── config/                   # Configurações
│   │   ├── config.ts             # Carrega variáveis de ambiente
│   │   └── whatsapp.config.ts    # Configuração WhatsApp (NEW v7.0)
│   │
│   ├── controllers/              # Controladores (Lógica de negócio)
│   │   └── adGenerator.ts        # Orquestra geração de anúncios
│   │
│   ├── services/                 # Serviços (Integrações externas)
│   │   ├── imageAnalysis.ts      # Análise de imagem com IA
│   │   ├── mercadoLivre.ts       # Integração Mercado Livre
│   │   ├── telegram.ts           # Serviço Telegram
│   │   ├── postQueue.ts          # Sistema de fila de postagem (NEW v7.0)
│   │   ├── whatsapp.ts           # Serviço WhatsApp (NEW v7.0)
│   │   └── broadcaster.ts        # Broadcasting multi-plataforma (NEW v7.0)
│   │
│   ├── utils/                    # Utilitários
│   │   ├── formatter.ts          # Formatação de mensagens
│   │   ├── validator.ts          # Validações de dados
│   │   └── sessionManager.ts     # Gerenciamento de sessões de usuário
│   │
│   └── types/                    # Definições de tipos TypeScript
│       └── index.ts              # Interfaces e tipos
│
├── .env                          # Variáveis de ambiente (não versionado)
├── .env.example                  # Exemplo de variáveis de ambiente
├── .gitignore                    # Arquivos ignorados pelo Git
├── nodemon.json                  # Configuração do Nodemon
├── package.json                  # Dependências e scripts NPM
├── tsconfig.json                 # Configuração do TypeScript
└── README.md                     # Documentação principal
```

---

## 🏛️ Arquitetura Multi-Plataforma (v7.0)

### **Fluxo de Broadcasting com Fila**

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUÁRIO                                   │
│             Envia link → Confirma com "SIM"                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   POST QUEUE SERVICE                             │
│   • Adiciona anúncio à fila (queue.json)                        │
│   • Primeira postagem: +3 minutos                               │
│   • Postagens seguintes: +5 minutos (configurável)              │
│   • Processamento a cada 30 segundos                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    (scheduledAt <= now)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BROADCASTER SERVICE                           │
│   • Envia para múltiplas plataformas simultaneamente            │
│   • Rastreamento individual de sucesso/falha                    │
│   • Fallback gracioso se uma plataforma falhar                  │
└──────────────────┬───────────────────────┬──────────────────────┘
                   │                       │
                   ▼                       ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │  TELEGRAM SERVICE    │   │  WHATSAPP SERVICE    │
    │  • Envia mensagem    │   │  • QR Auth           │
    │  • Envia imagem      │   │  • LocalAuth         │
    │  • Canal/Grupo       │   │  • Envia imagem      │
    └──────────────────────┘   └──────────────────────┘
```

### **Queue System - Fluxo Detalhado**

1. **Entrada do Usuário**

   - Usuário envia link do produto
   - Bot faz scraping (Mercado Livre ou Amazon)
   - Exibe preview do anúncio

2. **Confirmação e Agendamento**

   - Usuário confirma com "SIM"
   - `postQueue.addToQueue()` é chamado
   - Calcula `scheduledAt`:
     - Se fila vazia: `now + 3 minutos`
     - Se há fila: `último scheduledAt + intervalMinutes`

3. **Processamento Automático**

   - Timer executa `processQueue()` a cada 30 segundos
   - Filtra ads com `status: "pending"` e `scheduledAt <= now`
   - Para cada ad pendente:
     - Chama `broadcaster.broadcastAd()`
     - Atualiza status para "posted" ou "error"
     - Persiste em `queue.json`

4. **Persistência**
   - Toda alteração salva em `queue.json`
   - Carrega fila ao reiniciar bot
   - Recalcula horários se intervalo mudado

### **WhatsApp Integration - Arquitetura**

```
┌─────────────────────────────────────────────────────────────────┐
│                   WHATSAPP SERVICE                               │
├─────────────────────────────────────────────────────────────────┤
│  whatsapp-web.js Client                                         │
│    ├── AuthStrategy: LocalAuth                                  │
│    │     └── Sessão persistida em whatsapp-session/             │
│    ├── Puppeteer (headless Chrome)                              │
│    └── Events:                                                   │
│          • "qr" → Exibe QR no terminal                          │
│          • "ready" → Conectado                                  │
│          • "disconnected" → Reconexão                           │
└─────────────────────────────────────────────────────────────────┘
```

**Autenticação WhatsApp:**

1. Primeira execução: exibe QR code no terminal
2. Usuário escaneia com WhatsApp mobile
3. Sessão salva em `whatsapp-session/`
4. Próximas execuções: carrega sessão automaticamente

**Envio de Mensagem:**

1. Formata texto do anúncio
2. Baixa imagem do produto (axios)
3. Converte para Buffer com Sharp
4. Cria MessageMedia com base64
5. Envia para grupo configurado em `WHATSAPP_GROUP_ID`

---

## 🎭 Responsabilidades dos Componentes

### **1. app.ts** - Orquestrador Principal

**Papel:** Entry point da aplicação, gerencia handlers do bot

**Responsabilidades:**

- Inicializa o bot do Telegram
- Inicializa WhatsApp Service (v7.0)
- Define comandos básicos (`/start`, `/help`, `/cancelar`)
- Define comandos de fila (`/fila`, `/intervalo`, `/pausar`, `/limpar`) (v7.0)
- Define comandos WhatsApp (`/whatsapp_status`, `/whatsapp_reconnect`, `/status`) (v7.0)
- Gerencia fluxo de conversa com usuário
- Trata mensagens de texto e imagens
- Coordena chamadas aos serviços
- Integração com PostQueueService em vez de envio direto (v7.0)

---

### **2. config/config.ts** - Gerenciador de Configuração

**Papel:** Centraliza configurações da aplicação

**Responsabilidades:**

- Carrega variáveis do arquivo `.env`
- Valida presença de variáveis obrigatórias
- Exporta configurações para toda aplicação

**Variáveis:**

```typescript
{
  telegramToken: string,    // Token do bot
  openAIKey: string,        // GitHub Token
  chatId: string,           // ID do canal
  nodeEnv: string           // Ambiente (dev/prod)
}
```

---

### **3. controllers/adGenerator.ts** - Controlador de Anúncios

**Papel:** Orquestra lógica de negócio para geração de anúncios

**Responsabilidades:**

- Coordena análise de imagem
- Valida dados extraídos
- Gera preview do anúncio
- Envia anúncio para o canal

**Principais Métodos:**

```typescript
generateAdFromImage(imageUrl: string): Promise<{success, ad, error}>
generateAndSendAd(imageUrl: string, chatId?: string): Promise<boolean>
```

---

### **4. services/imageAnalysis.ts** - Serviço de IA

**Papel:** Integração com GitHub Models API para análise de imagem

**Responsabilidades:**

- Envia imagem para API do GitHub Models (GPT-4o)
- Extrai informações do produto (título, preços, desconto)
- Trata erros da API (401, 429, etc.)
- Retorna dados estruturados

**Entrada:** URL da imagem  
**Saída:**

```typescript
{
  success: boolean,
  data?: {
    title: string,
    originalPrice?: string,
    discountPrice: string,
    discountPercentage?: string,
    url: string
  },
  error?: string
}
```

---

### **5. services/mercadoLivre.ts** - Serviço Mercado Livre

**Papel:** Integração com Mercado Livre (opcional)

**Responsabilidades:**

- Extrai ID do produto de URLs
- Valida URLs do Mercado Livre
- Busca detalhes de produtos (via API)
- Normaliza links de afiliado

**Principais Métodos:**

```typescript
extractProductId(url: string): string | null
isValidMercadoLivreUrl(url: string): boolean
fetchProductDetails(productId: string): Promise<any>
```

---

### **6. services/telegram.ts** - Serviço Telegram

**Papel:** Abstração da API do Telegram

**Responsabilidades:**

- Envia anúncios para canal/grupo
- Obtém URLs de arquivos enviados
- Gerencia bot instance
- Trata erros de envio

**Principais Métodos:**

```typescript
sendAd(ad: Ad, chatId?: string): Promise<boolean>
getFileUrl(fileId: string): Promise<string | null>
launch(): Promise<void>
```

---

### **7. services/postQueue.ts** - Sistema de Fila de Postagem (NEW v7.0)

**Papel:** Gerencia fila de postagem com agendamento automático

**Responsabilidades:**

- Mantém fila de anúncios agendados
- Calcula horários de postagem (3min inicial + intervalo configurável)
- Processa fila automaticamente a cada 30 segundos
- Persiste estado em `queue.json`
- Recalcula horários quando intervalo muda
- Gerencia pause/resume da fila
- Limpa anúncios completados/com erro

**Principais Métodos:**

```typescript
addToQueue(ad: Ad, userId: number, username?: string): string
processQueue(): Promise<void>
setInterval(minutes: number): void
pauseQueue(): void
resumeQueue(): void
clearQueue(): void
getQueueStatus(): { pending: QueuedAd[], config: QueueConfig }
```

**Configuração:**

```typescript
{
  intervalMinutes: 5,      // Intervalo entre posts (default: 5 min)
  isPaused: false,         // Status da fila
  maxQueueSize: 50         // Limite de anúncios
}
```

**Fluxo:**

1. `addToQueue()` → calcula scheduledAt
2. Timer 30s → `processQueue()` verifica ads prontos
3. scheduledAt <= now → chama broadcaster
4. Atualiza status → salva em queue.json

---

### **8. services/whatsapp.ts** - Serviço WhatsApp (NEW v7.0)

**Papel:** Integração completa com WhatsApp Web via whatsapp-web.js

**Responsabilidades:**

- Gerencia autenticação via QR code
- Mantém sessão persistente (LocalAuth)
- Envia mensagens formatadas
- Envia imagens de produtos
- Lista grupos disponíveis
- Gerencia conexão/reconexão
- Download de imagens de URLs

**Principais Métodos:**

```typescript
initialize(): Promise<void>
sendAd(ad: Ad): Promise<boolean>
reconnect(): Promise<void>
getStatus(): string
listGroups(): Promise<Array<{ id: string, name: string }>>
isConnected(): boolean
```

**Eventos Gerenciados:**

- `qr` → Exibe QR code no terminal
- `ready` → WhatsApp conectado
- `authenticated` → Sessão autenticada
- `disconnected` → Tentativa de reconexão

**Autenticação:**

```typescript
new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-session'
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', ...]
  }
})
```

---

### **9. services/broadcaster.ts** - Broadcasting Multi-Plataforma (NEW v7.0)

**Papel:** Coordena envio simultâneo para múltiplas plataformas

**Responsabilidades:**

- Envia anúncio para Telegram E WhatsApp
- Rastreia sucesso individual de cada plataforma
- Retorna status consolidado
- Fallback gracioso se plataforma falhar
- Consolida status de todas plataformas

**Principais Métodos:**

```typescript
broadcastAd(ad: Ad): Promise<{
  telegram: boolean,
  whatsapp: boolean,
  success: boolean
}>
getStatus(): string
```

**Lógica:**

```typescript
// Tenta ambas plataformas
telegram = await telegramService.sendAd(ad);
whatsapp = await whatsappService.sendAd(ad); // se conectado

// Sucesso se pelo menos uma funcionar
success = telegram || whatsapp;
```

---

### **10. config/whatsapp.config.ts** - Configuração WhatsApp (NEW v7.0)

**Papel:** Centraliza configurações do WhatsApp

**Responsabilidades:**

- Carrega `WHATSAPP_GROUP_ID` do .env
- Define caminho da sessão
- Configura opções do Puppeteer

**Configuração:**

```typescript
{
  groupId: process.env.WHATSAPP_GROUP_ID || "",
  sessionPath: "./whatsapp-session",
  puppeteerOptions: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
}
```

---

### **11. utils/formatter.ts** - Formatador de Mensagens

**Papel:** Formata dados em mensagens bonitas para Telegram

**Responsabilidades:**

- Formata anúncios com emojis
- Formata preços em R$
- Limpa e normaliza texto

**Exemplo de Saída:**

```
⚡️ Smartphone Motorola Moto g05

De ❌ R$ 999
Por ✨ R$ 575

🔥 42% OFF

🔗 https://mercadolivre.com/...
```

---

### **8. utils/validator.ts** - Validador de Dados

**Papel:** Valida entradas do usuário e dados extraídos

**Responsabilidades:**

- Valida URLs
- Valida dados de produto completos
- Valida formato de preços brasileiros

**Principais Funções:**

```typescript
isValidUrl(url: string): boolean
isValidProductData(data: ProductData): boolean
isValidBrazilianPrice(price: string): boolean
```

---

### **9. utils/sessionManager.ts** - Gerenciador de Sessões

**Papel:** Gerencia estado da conversa de cada usuário

**Responsabilidades:**

- Cria sessões para novos usuários
- Armazena dados temporários (produto, etapa)
- Limpa sessões expiradas (timeout: 10 min)
- Controla fluxo: `waiting_product_link` → `waiting_affiliate_link`

**Estados da Sessão:**

```typescript
{
  step: 'waiting_product_link' | 'waiting_affiliate_link',
  productData?: ProductData,
  productUrl?: string,
  timestamp: number
}
```

---

### **10. types/index.ts** - Definições de Tipos

**Papel:** Define contratos e interfaces TypeScript

**Principais Tipos:**

```typescript
interface ProductData {
  title: string;
  originalPrice?: string;
  discountPrice: string;
  discountPercentage?: string;
  url: string;
  imageUrl?: string;
}

interface Ad {
  text: string;
  imageUrl?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface BotConfig {
  telegramToken: string;
  openAIKey: string;
  chatId: string;
  nodeEnv: string;
}
```

---

## 🔄 Fluxo de Execução

### **Fluxo Normal:**

```
1. Usuário → /start
   ↓
2. Bot: "Envie link ou screenshot"
   ↓
3. Usuário → [Screenshot]
   ↓
4. app.ts → telegramService.getFileUrl()
   ↓
5. app.ts → imageAnalyzer.analyzeProductImage()
   ↓
6. imageAnalysis.ts → GitHub Models API
   ↓
7. API retorna dados extraídos
   ↓
8. app.ts → validator.isValidProductData()
   ↓
9. app.ts → formatter.formatProductAd()
   ↓
10. Bot: "Preview do anúncio + aguarde link afiliado"
    ↓
11. Usuário → [Link de afiliado]
    ↓
12. app.ts → telegramService.sendAd()
    ↓
13. Bot posta no canal!
```

### **Fluxo com Fallback (se IA falhar):**

```
1-6. [Igual ao fluxo normal]
   ↓
7. API falha ou dados incompletos
   ↓
8. Bot: "Modo Manual: Digite título, preço, link"
   ↓
9. Usuário digita manualmente
   ↓
10. [Continue fluxo normal]
```

---

## 🔐 Variáveis de Ambiente Necessárias

```bash
# Obrigatórias
TELEGRAM_BOT_TOKEN=    # Token do @BotFather
GITHUB_TOKEN=          # Token do GitHub (Models API)
TELEGRAM_CHAT_ID=      # ID do canal/grupo (-100...)

# Opcionais
NODE_ENV=development   # Ambiente (development/production)
```

---

## 🚀 Scripts de Execução

### **Desenvolvimento (com hot-reload):**

```bash
npm run dev
```

Usa `nodemon` para reiniciar automaticamente ao editar código.

### **Execução Direta:**

```bash
npx ts-node src/app.ts
```

Executa TypeScript diretamente sem compilar.

### **Produção (compilado):**

```bash
npm run build    # Compila TS → JS
npm start        # Executa JS compilado
```

---

## 📊 Dependências Principais

```json
{
  "dependencies": {
    "telegraf": "^4.16.3", // Framework bot Telegram
    "axios": "^0.21.4", // HTTP client
    "dotenv": "^10.0.0", // Env vars
    "typescript": "^4.9.5" // TypeScript
  },
  "devDependencies": {
    "@types/node": "^16.18.126", // Types Node.js
    "nodemon": "^3.1.11", // Hot reload
    "ts-node": "^10.9.2" // Executa TS
  }
}
```

---

## 🔄 Estados e Transições

```
┌─────────────────────┐
│   waiting_product   │  ← Estado inicial
│       _link         │
└──────────┬──────────┘
           │
           │ Recebe link/screenshot
           │ Análise OK
           ↓
┌─────────────────────┐
│  waiting_affiliate  │
│       _link         │
└──────────┬──────────┘
           │
           │ Recebe link afiliado
           │ Posta anúncio
           ↓
┌─────────────────────┐
│   Sessão limpa      │
│   (volta ao início) │
└─────────────────────┘
```

---

## 🎯 Padrões de Design Utilizados

1. **Service Pattern** - Serviços isolados para cada integração externa
2. **Controller Pattern** - Controladores orquestram lógica de negócio
3. **Singleton Pattern** - Instâncias únicas de serviços exportadas
4. **Dependency Injection** - Configurações injetadas via `APP_CONFIG`
5. **Session Management** - Estado persistente por usuário

---

## 🧪 Casos de Uso

### **Caso 1: Anúncio via Screenshot**

1. Usuário tira print do produto no Mercado Livre
2. Envia para o bot
3. Bot extrai dados com IA
4. Usuário confirma com link de afiliado
5. Bot posta no canal

### **Caso 2: Anúncio via Link**

1. Usuário envia link do Mercado Livre
2. Bot faz **scraping da página** com Cheerio
3. Extrai: título, preços, desconto, imagem
4. Se scraping falhar, pede screenshot
5. Continua fluxo normal

### **Caso 3: Modo Manual (Fallback)**

1. IA não consegue extrair dados
2. Bot pede entrada manual
3. Usuário digita título, preço, link
4. Bot gera anúncio manualmente

---

## 📈 Escalabilidade e Melhorias Futuras

- [ ] Adicionar banco de dados (MongoDB/PostgreSQL)
- [ ] Implementar cache de produtos
- [ ] Adicionar analytics de anúncios
- [ ] Suporte a múltiplos canais
- [ ] Dashboard web de controle
- [ ] Agendamento de posts
- [ ] A/B testing de anúncios

---

## 🐛 Troubleshooting Comum

| Erro                    | Causa                 | Solução                            |
| ----------------------- | --------------------- | ---------------------------------- |
| `429 Too Many Requests` | Limite API excedido   | Aguardar ou usar modo manual       |
| `401 Unauthorized`      | Token inválido        | Verificar `GITHUB_TOKEN` no `.env` |
| `Bot não responde`      | Token Telegram errado | Verificar `TELEGRAM_BOT_TOKEN`     |
| `Não posta no canal`    | Bot não é admin       | Adicionar bot como admin do canal  |

---

**Versão:** 1.0.0  
**Última Atualização:** 12/11/2025  
**Licença:** MIT
