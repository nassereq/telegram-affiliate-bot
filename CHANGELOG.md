# Histórico de Versões - Telegram Affiliate Bot

## 📋 Índice de Versões

- [v7.0](#v70---18122025) - Atual ⭐
- [v6.1](#v61---01122025)
- [v6.0](#v60---01122025)
- [v5.1](#v51---25112025)
- [v5.0](#v50---23112025)
- [v4.0](#v40---23112025)
- [v3.0](#v30---22112025)
- [v2.2](#v22---18112025)
- [v2.1](#v21---18112025)
- [v2.0](#v20---17112025)
- [v1.1](#v11---14112025)
- [v1.0](#v10---14112025)

---

## v7.0 - 18/12/2025

**Tag:** `v7.0` | **Branch:** `feature/improvements`

### 🚀 Novas Funcionalidades Principais

#### ⏰ Sistema de Fila de Postagem

- **Serviço de Fila (PostQueueService)**

  - Agendamento automático com intervalos configuráveis
  - Primeira postagem: 3 minutos após confirmação
  - Postagens subsequentes: intervalo de 5 minutos (padrão, configurável)
  - Persistência em `queue.json`
  - Limite máximo de 50 anúncios na fila
  - Processamento automático a cada 30 segundos
  - Recálculo automático quando o intervalo é alterado

- **Comandos de Gerenciamento da Fila**
  - `/fila` - Visualizar todos os posts agendados com horários
  - `/intervalo [min]` - Configurar intervalo entre posts (1-1440 minutos)
  - `/pausar` - Pausar/retomar postagens automáticas
  - `/limpar` - Limpar todos os anúncios pendentes da fila

#### 💬 Integração com WhatsApp

- **WhatsAppService**

  - Integração completa com WhatsApp Web.js
  - Autenticação via QR Code (configuração única)
  - Persistência de sessão com LocalAuth (sem necessidade de QR repetido)
  - Envio de mensagens formatadas com imagens
  - Suporte para grupos do WhatsApp
  - Download e envio de imagens de produtos
  - Gerenciamento de conexão e reconexão automática

- **Arquitetura de Broadcaster**

  - Postagem simultânea em Telegram E WhatsApp
  - Rastreamento de status individual por plataforma
  - Fallback gracioso se WhatsApp desconectado
  - Sucesso se pelo menos uma plataforma receber a mensagem
  - Serviço centralizado para multi-plataforma

- **Comandos do WhatsApp**
  - `/whatsapp_status` - Ver status de conexão e listar grupos disponíveis
  - `/whatsapp_reconnect` - Reconectar se desconectado
  - `/status` - Status combinado (Telegram + WhatsApp + Fila)

#### 📝 Simplificação do Formato dos Anúncios

- Exibição apenas do preço final (com cupom calculado automaticamente)
- Remoção de exibições de preços intermediários
- Formato mais limpo e menos confuso
- Emoji ⚡️ para indicar preço promocional

### 🔧 Detalhes Técnicos

**Novos Arquivos Criados:**

- `src/services/postQueue.ts` - Gerenciamento de fila (~320 linhas)
- `src/services/whatsapp.ts` - Serviço WhatsApp (~200 linhas)
- `src/services/broadcaster.ts` - Broadcaster multi-plataforma (~60 linhas)
- `src/config/whatsapp.config.ts` - Configuração do WhatsApp
- `src/types/index.ts` - Interfaces QueuedAd, QueueConfig

**Arquivos Modificados:**

- `src/app.ts` - Adicionados 7 novos comandos, integração com fila
- `src/utils/formatter.ts` - Simplificação do formato (apenas preço final)
- `package.json` - Novas dependências

**Fluxo de Postagem Atualizado:**

1. Usuário envia link do produto
2. Bot faz scraping e mostra preview
3. Usuário confirma com "SIM"
4. Anúncio adicionado à fila com agendamento
5. Processador de fila executa a cada 30 segundos
6. Quando scheduledAt <= agora, broadcaster envia para ambas plataformas
7. Status atualizado (posted/error) e persistido

### 📦 Dependências Adicionadas

- `whatsapp-web.js` (^1.26.0) - Cliente WhatsApp Web API
- `qrcode-terminal` (^0.12.0) - Exibição de QR code no terminal
- `sharp` (^0.33.5) - Processamento de imagens
- `@types/qrcode-terminal` (^0.12.2) - Tipos TypeScript

### 🌐 Variáveis de Ambiente

**Nova variável:**

- `WHATSAPP_GROUP_ID` - ID do grupo WhatsApp para postagens

### 📊 Estatísticas

- **3 novos arquivos de serviço**: ~580 linhas de código
- **2 arquivos fortemente modificados**: app.ts, formatter.ts
- **4 novos pacotes npm**
- **7 novos comandos** de bot

### 🎯 Melhorias de Arquitetura

- Padrão Broadcaster para abstração multi-plataforma
- Separação de responsabilidades (Queue, WhatsApp, Broadcaster)
- Persistência robusta com JSON
- Gerenciamento de estado de fila
- Autenticação persistente do WhatsApp

---

## v6.1 - 01/12/2025

**Tag:** `v6.1` | **Branch:** `v.4`

### 🤖 Módulo de Automação de Navegador

#### ✨ Novas Funcionalidades

- **BrowserAutomationService**

  - Serviço completo para automação de navegador
  - Métodos: `initializeBrowser`, `login`, `navigateTo`, `clickButton`, `waitFor`, `extractGeneratedLink`, `closeBrowser`
  - Preparado para integração com Puppeteer/Playwright

- **API REST para Automação**

  - Servidor Express com rotas HTTP
  - `POST /automation/generate-link` - Gera links através de automação
  - `GET /automation/status` - Verifica status do serviço
  - `GET /health` - Health check da API

- **Sistema de Configuração**

  - `automation.config.ts` com todas as configurações necessárias
  - Validação automática de variáveis de ambiente
  - Configurações de navegador, seletores CSS e credenciais

- **Controller de Automação**

  - `AutomationController` com fluxo completo de automação
  - Tratamento robusto de erros
  - Logs detalhados de cada etapa

- **Servidor HTTP Opcional**
  - Integrado ao app.ts principal
  - Ativado via `ENABLE_API_SERVER=true`
  - Não interfere no funcionamento do bot Telegram

#### 📚 Documentação

- **docs/automation.md**
  o de configuração

  - Instruções de uso da API
  - Fluxo detalhado de automação
  - Troubleshooting e exemplos

- **src/automation/README.md**
  - Quick start guide
  - Exemplos de código
  - Guia de desenvolvimento

#### 📝 Arquivos Criados

- `src/services/browserAutomation.ts` - Serviço principal
- `src/services/index.ts` - Índice de serviços
- `src/controllers/automationController.ts` - Controller HTTP
- `src/config/automation.config.ts` - Configurações
- `src/server.ts` - Servidor Express
- `docs/automation.md` - Documentação completa
- `src/automation/README.md` - Guia rápido

#### 🔧 Arquivos Modificados

- `src/app.ts` - Integração com servidor API opcional
- `package.json` - Dependências: express, puppeteer, @types/express
- `.env.example` - Novas variáveis de ambiente para automação

#### 🌐 Variáveis de Ambiente Adicionadas

```env
ENABLE_API_SERVER=true/false
API_PORT=3000
AUTOMATION_USERNAME=usuario
AUTOMATION_PASSWORD=senha
AUTOMATION_URL=https://site.com
AUTOMATION_BUTTON_SELECTOR=#btn
AUTOMATION_RESULT_SELECTOR=.link
AUTOMATION_WAIT_SECONDS=3
AUTOMATION_SESSION_COOKIE=session_id
```

#### 📊 Estatísticas

- **10 arquivos criados**: ~900 linhas de código
- **3 arquivos modificados**: app.ts, package.json, .env.example
- **2 documentações**: automation.md, README.md

---

## v6.0 - 01/12/2025

**Tag:** `v6.0` | **Branch:** `v.4`

### 🔧 Melhorias de Manutenção

#### ✨ Novas Funcionalidades

- **Ignorar Arquivos de Debug**
  - Adicionado `debug_*.html` ao `.gitignore`
  - Arquivos de debug não são mais commitados no repositório
  - Mantém o repositório limpo e focado no código fonte

#### 📝 Arquivos Modificados

- `.gitignore`: Adicionado padrão para arquivos debug
- Removidos `debug_amazon.html` e `debug_ml.html` do histórico

---

## v5.1 - 25/11/2025

**Tag:** `v5.1` | **Branch:** `v.3`

### 🚀 Melhorias de Scraping e UX

#### ✨ Novas Funcionalidades

- **Reutilização de Cupom com "mesmo"**

  - Digite "mesmo" (minúsculas) para usar o último cupom aplicado
  - Mantém código, desconto e valor mínimo do cupom anterior
  - Exibe hint do último cupom disponível na confirmação

- **Cálculo Automático de Desconto (Amazon)**

  - Calcula percentual de OFF quando não encontrado no HTML
  - Fórmula: `((De - Por) / De) * 100`
  - Fallback inteligente para produtos sem badge de desconto

- **Extração Aprimorada de Preços (Amazon)**
  - Novo seletor: `span.a-size-small.aok-offscreen` para preço "De"
  - Extração via `displayPrice` no JSON do HTML para preço "Por"
  - Logs detalhados para debugging de preços

#### 🔧 Melhorias Técnicas

- **SessionManager expandido**:

  - Campos `lastCoupon`, `lastCouponDiscount`, `lastCouponMinValue`
  - Métodos `saveLastCoupon()` e `getLastCoupon()`
  - Persistência de cupom entre anúncios na mesma sessão

- **Validação de Preços Amazon**:
  - Verificação de valores numéricos válidos
  - Logs de fallback quando seletores falham
  - Proteção contra cálculo de desconto inválido (Por > De)

#### 📝 Arquivos Modificados

- `src/app.ts`: Lógica de detecção "mesmo" e salvamento de cupom
- `src/utils/sessionManager.ts`: Campos e métodos para último cupom
- `src/platforms/amazon/scraper.ts`: Novos seletores e cálculo de desconto

---

## v5.0 - 23/11/2025

**Tag:** `v5.0` | **Commit:** `f394772` | **Branch:** `v.2`

### 🚀 Arquitetura Multi-Plataforma

#### ✨ Novas Funcionalidades

- **Suporte a Amazon**: Scraper completo para produtos da Amazon

  - Links encurtados: `amzn.to`, `a.co`
  - Links completos: `amazon.com.br`, `amazon.com`
  - Extração de preços, desconto e imagens
  - Validação matemática de preços (±5%)

- **Sistema de Detecção de Plataforma**: Gate automático por URL

  - Detector identifica plataforma automaticamente
  - Roteamento para scraper apropriado
  - Facilita adição de novas plataformas

- **Arquitetura Modular com Interfaces**:
  - `IPlatformScraper`: Interface comum para todas as plataformas
  - `PlatformDetector`: Classe para detecção automática
  - `PlatformManager`: Gerenciador central de scrapers

#### 🏗️ Estrutura de Pastas

```
src/platforms/
├── IPlatformScraper.ts    # Interface base
├── platformManager.ts      # Gerenciador central
├── mercadolivre/
│   └── scraper.ts         # Scraper do Mercado Livre
└── amazon/
    └── scraper.ts         # Scraper da Amazon
```

#### 🔧 Melhorias Técnicas

- **Mercado Livre**: Movido para estrutura modular

  - Implementa `IPlatformScraper`
  - Mantém toda funcionalidade existente
  - Classes CSS: `previous`/`current`
  - Validação matemática preservada

- **Amazon Scraper**: Novo sistema de extração

  - Seletores CSS adaptados para estrutura da Amazon
  - Suporte a múltiplos formatos de preço
  - Extração de desconto percentual
  - Prioridade de imagens: `landingImage` → `imgBlkFront` → `og:image`
  - Debug HTML salvo em `debug_amazon.html`

- **App.ts**: Atualizado para multi-plataforma
  - Importa `platformManager` ao invés de `mercadoLivreService`
  - Mensagens incluem lista de plataformas suportadas
  - Erro específico para plataforma não suportada

#### 📊 Estatísticas

- **6 arquivos alterados**: 862 inserções, 23 deleções
- **4 novos arquivos criados**

#### 🎯 Plataformas Suportadas (v5.0)

- ✅ **Mercado Livre** (todos os recursos)
- ✅ **Amazon** (scraping completo)

#### 💡 Facilita Expansão Futura

A arquitetura modular permite adicionar novas plataformas facilmente:

1. Criar classe que implementa `IPlatformScraper`
2. Implementar métodos `isValidUrl()` e `scrapeProductDetails()`
3. Registrar no `PlatformManager`

---

## v4.0 - 23/11/2025

**Tag:** `v4.0` | **Commit:** `c686b12` | **Branch:** `v.2`

### 📝 Documentação Completa

#### ✨ Nova Funcionalidade

- **CHANGELOG.md**: Documentação completa de todas as versões
  - Histórico detalhado de funcionalidades (v1.0 → v4.0)
  - Estatísticas de desenvolvimento
  - Recursos principais consolidados
  - Tecnologias utilizadas
  - Notas de desenvolvimento e sugestões futuras

#### 📊 Estatísticas

- **2 arquivos alterados**: 362 inserções, 18 deleções
- **1 novo arquivo criado**: CHANGELOG.md

---

## v3.0 - 22/11/2025

**Tag:** `v3.0` | **Commit:** `5109c63` | **Branch:** `v.2`

### ✨ Novas Funcionalidades

- **Cupom com shorthand M/MIN**: Agora aceita tanto "M" quanto "MIN" para especificar valor mínimo
  - Formato: `CUPOM 10 M 79` ou `CUPOM 10 MIN 79`
  - Regex atualizada: `/^[A-Z0-9]+(\s+\d+)?(\s+(MIN|M)\s+\d+)?$/`
- **Bloqueio Silencioso**: Proteção contra spam no canal
  - Usuários não autorizados não recebem mensagem de erro
  - Bot verifica tipo de chat (channel vs private/group)
  - Permite postagem automática no canal @escavando
  - Console log mantém registro de tentativas de acesso negado

### 🔧 Melhorias Técnicas

- Middleware de autorização aprimorado
- Verificação de `chatType === "channel"` para permitir posts do bot
- Parsing de cupom mais flexível e tolerante

### 📁 Arquivos Modificados

- `src/app.ts` (75 linhas alteradas)
- `src/services/mercadoLivre.ts` (46 linhas alteradas)
- `src/utils/formatter.ts` (16 linhas alteradas)
- `src/utils/sessionManager.ts` (6 linhas alteradas)
- `src/types/index.ts` (1 linha alterada)

---

## v2.2 - 18/11/2025

**Commit:** `c7d385b`

### ✨ Novas Funcionalidades

- **Cupom com Valor Mínimo**: Sistema completo de cupons com condições
  - Formato: `CODIGO DESCONTO MIN VALOR`
  - Exemplo: `VALEPROMO 10 MIN 79` (10% de desconto para compras acima de R$ 79)
  - Parsing automático de código, desconto percentual e valor mínimo
- **Formatação de Cupom em Duas Linhas**: Layout melhorado
  - Linha 1: `✔️ CUPOM: CODIGO`
  - Linha 2: Descrição do desconto e valor mínimo

### 🔧 Melhorias

- Interface `ProductData` atualizada com campo `couponMinValue`
- Formatter adaptado para exibir condições do cupom
- Validação de formato de cupom aprimorada

### 📁 Arquivos Modificados

- `src/app.ts` (61 linhas alteradas)
- `src/utils/formatter.ts` (13 linhas alteradas)
- `src/types/index.ts` (1 linha adicionada)

---

## v2.1 - 18/11/2025

**Commit:** `cc862ec`

### ✨ Novas Funcionalidades

- **Extração de Preços com Classes CSS**: Descoberta da estrutura HTML do Mercado Livre

  - Uso de classes `previous` (preço original) e `current` (preço com desconto)
  - Seletores: `$('[class*="previous"]')` e `$('[class*="current"]')`
  - Extração precisa: `.find('span.andes-money-amount__fraction')`

- **Sistema de Cupom com Desconto Adicional**: Primeira versão

  - Detecção automática de cupom em texto MAIÚSCULO
  - Parsing de código e percentual de desconto
  - Formato: `CODIGO DESCONTO` (ex: `VALEPROMO 10`)

- **Autorização de Usuários**: Sistema de controle de acesso

  - Array `AUTHORIZED_USERS` com usernames/IDs permitidos
  - Middleware de verificação em cada mensagem
  - Mensagem de acesso negado para usuários não autorizados

- **Mudança de Canal**: Migração para @escavando

  - TELEGRAM_CHAT_ID: `-1003203666619`
  - Configuração via variável de ambiente

- **Validação Matemática de Preços**: Sistema de fallback

  - Fórmula: `P × (1 - D%/100) = DiscountP`
  - Tolerância de 5% para variações
  - Logs detalhados no console

- **Oferta Relâmpago (Flash Deal)**: Marcador especial
  - Detecção de "off rel" na segunda linha após URL
  - Header especial: `☄️ OFERTA RELÂMPAGO!!!`
  - Campo `isFlashDeal` em ProductData

### 🔧 Melhorias Técnicas

- Debug HTML: Salvamento em `debug_ml.html` para análise
- Console logs coloridos e informativos
- Prioridade de imagens: pswp_img → gallery → product → og:image

### 📁 Arquivos Modificados

- `src/app.ts` (174 linhas alteradas)
- `src/services/mercadoLivre.ts` (259 linhas alteradas)
- `src/types/index.ts` (2 linhas adicionadas)
- `src/utils/formatter.ts` (13 linhas adicionadas)
- `debug_ml.html` (375 linhas criadas)

---

## v2.0 - 17/11/2025

**Commit:** `9fb001c`

### 🔧 Melhorias

- **Otimização de Extração de Preços**: Uso do desconto como referência

  - Priorização da porcentagem de desconto como âncora
  - Busca de preços em relação ao elemento de desconto
  - Redução de falsos positivos

- **Captura de Imagem Otimizada**: Sistema de prioridade
  - Preferência por `img.pswp_img` (PhotoSwipe viewer)
  - Fallback para galeria e imagens do produto
  - Última opção: meta tag og:image

### 📁 Arquivos Modificados

- `src/services/mercadoLivre.ts` (119 linhas alteradas)

---

## v1.1 - 14/11/2025

**Commit:** `798e8ea`

### ✨ Novas Funcionalidades

- **Comando /s**: Atalho para /start
  - Facilita reinício de conversação
  - Mesmo comportamento do /start

### 📁 Arquivos Modificados

- `src/app.ts` (9 linhas alteradas)

---

## v1.0 - 14/11/2025

**Commit:** `44e1bb7` | **Branches:** `main`, `dev`

### ✨ Funcionalidades Iniciais

- **Web Scraping com Cheerio**: Extração de dados do Mercado Livre

  - Parser HTML sem necessidade de browser
  - Axios com User-Agent para requisições

- **Bot Telegram com Telegraf**: Interface de conversação

  - Comandos: /start, /cancelar, /help, /getid
  - Sistema de sessões com timeout de 10 minutos

- **Fluxo de Confirmação**: 3 opções interativas

  - **SIM**: Publica anúncio no canal
  - **NAO**: Cancela operação
  - **AJUSTAR**: Modo de edição manual

- **Modo de Edição Manual**: Personalização de texto

  - Permite alterar qualquer parte do anúncio
  - Preserva formatação e emojis

- **Extração de Dados**:

  - Título (resumido em 6 palavras)
  - Preços (original e com desconto)
  - Porcentagem de desconto
  - Imagem do produto
  - URL do anúncio

- **Formatação de Anúncio**: Template com emojis

  - ⚡️ Título
  - ❌ De: Preço original
  - ✨ Por: Preço com desconto
  - 🔥 OFF: Porcentagem
  - 🔗 Link do produto

- **Sistema de Sessões**: Gerenciamento de estado

  - Interface `UserSession` com steps
  - Armazenamento de `productData` e `productUrl`
  - Limpeza automática após timeout

- **Validação**: Checks de URL e dados
  - Verificação de formato de link
  - Validação de campos obrigatórios

### 🏗️ Estrutura do Projeto

- **Arquitetura modular**: Separação em camadas

  - `services/`: mercadoLivre, telegram, imageAnalysis
  - `controllers/`: adGenerator
  - `utils/`: formatter, validator, sessionManager
  - `config/`: gerenciamento de variáveis de ambiente

- **TypeScript**: Type safety completo

  - Interfaces: ProductData, UserSession, Ad
  - Configuração tsconfig.json

- **Documentação**:
  - `ARCHITECTURE.md`: Arquitetura detalhada (502 linhas)
  - `README.md`: Guia de uso e instalação
  - `.env.example`: Template de configuração

### 📦 Dependências

- `telegraf`: Bot Telegram
- `cheerio`: Web scraping
- `axios`: HTTP client
- `dotenv`: Variáveis de ambiente
- `typescript`: Linguagem
- `@types/*`: Tipos TypeScript
- `nodemon`: Desenvolvimento com hot reload

### 📁 Arquivos Criados (18 arquivos, 9732 linhas)

- Configuração: `.gitignore`, `package.json`, `tsconfig.json`, `nodemon.json`
- Documentação: `ARCHITECTURE.md`, `README.md`, `.env.example`
- Source code: 10 arquivos TypeScript em `src/`

---

## 📊 Estatísticas Gerais

### Linhas de Código por Versão

- **v1.0**: 9.732 linhas (projeto inicial)
- **v1.1**: +6 linhas
- **v2.0**: +69 linhas
- **v2.1**: +723 linhas (maior update)
- **v2.2**: +65 linhas
- **v3.0**: +115 linhas

### Total de Commits: 6

### Branches Ativos

- `main`: Versão estável (v1.0)
- `dev`: Desenvolvimento (v1.0)
- `v.2`: Versão atual (v3.0) ⭐

### Tags

- `v3.0`: Versão atual com todas as funcionalidades

---

## 🎯 Recursos Principais (v3.0)

### 🤖 Bot Telegram

- ✅ Comandos: /start, /s, /cancelar, /help, /getid
- ✅ Sistema de sessões com timeout
- ✅ Autorização de usuários
- ✅ Bloqueio silencioso
- ✅ Publicação em canal (@escavando)

### 🔍 Web Scraping

- ✅ Extração via Cheerio (sem browser)
- ✅ Classes CSS: previous/current
- ✅ Validação matemática (±5%)
- ✅ Debug HTML automático
- ✅ User-Agent spoofing

### 💰 Preços

- ✅ Preço original e com desconto
- ✅ Porcentagem de desconto
- ✅ Validação matemática como fallback
- ✅ Tolerância de 5% para variações

### 🖼️ Imagens

- ✅ Prioridade: pswp_img → gallery → product → og:image
- ✅ Extração de alta qualidade

### 🎟️ Cupons

- ✅ Código + Desconto % + Valor mínimo
- ✅ Formato: CODIGO [NUM] [M|MIN VALOR]
- ✅ Detecção automática (MAIÚSCULAS)
- ✅ Formatação em duas linhas
- ✅ Shorthand M/MIN

### ⚡ Ofertas Relâmpago

- ✅ Marcador "off rel" na linha 2
- ✅ Header especial com emoji ☄️
- ✅ Campo `isFlashDeal` em dados

### ✏️ Edição e Confirmação

- ✅ 3 opções: SIM/NAO/AJUSTAR
- ✅ Modo de edição manual
- ✅ Preview antes de publicar

### 🔐 Segurança

- ✅ Autorização por username/ID
- ✅ Bloqueio silencioso
- ✅ Verificação de tipo de chat
- ✅ Variáveis de ambiente

---

## 🚀 Tecnologias Utilizadas

### Core

- **Node.js**: Runtime JavaScript
- **TypeScript**: Type safety e desenvolvimento
- **Telegraf**: Framework para Telegram Bot API

### Web Scraping

- **Cheerio**: Parser HTML (jQuery-like)
- **Axios**: HTTP client

### Utilidades

- **dotenv**: Gerenciamento de variáveis de ambiente
- **nodemon**: Hot reload durante desenvolvimento

### DevOps

- **Git**: Controle de versão
- **npm**: Gerenciamento de pacotes

---

## 📝 Notas de Desenvolvimento

### Descobertas Importantes

1. **Estrutura HTML do Mercado Livre**: Classes `previous` e `current` são confiáveis
2. **Validação Matemática**: Necessária como fallback (5% de tolerância)
3. **Prioridade de Imagens**: PhotoSwipe (`pswp_img`) tem melhor qualidade
4. **Chat Types**: Verificação essencial para permitir posts do bot em canais

### Melhorias Futuras (Sugestões)

- [ ] Banco de dados para histórico de produtos
- [ ] Analytics de performance de links
- [ ] Agendamento automático de posts
- [ ] Suporte multi-canal
- [ ] Dashboard web de gerenciamento
- [ ] Estatísticas de cliques e conversões

---

## 👥 Usuários Autorizados

- `VovoVania`
- 2 contatos via telefone (IDs pendentes)

## 📢 Canal de Publicação

- **Nome**: @escavando
- **ID**: -1003203666619
- **Tipo**: Canal público

---

_Documento gerado automaticamente em 23/11/2025_
