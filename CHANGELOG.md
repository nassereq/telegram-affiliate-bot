# Histórico de Versões - Telegram Affiliate Bot

## 📋 Índice de Versões
- [v3.0](#v30---22112025) - Atual
- [v2.2](#v22---18112025)
- [v2.1](#v21---18112025)
- [v2.0](#v20---17112025)
- [v1.1](#v11---14112025)
- [v1.0](#v10---14112025)

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
  - 🛍️ Título
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

*Documento gerado automaticamente em 23/11/2025*
