# Documentação - Automação de Navegador

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Configuração](#configuração)
- [Como Usar](#como-usar)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Fluxo de Automação](#fluxo-de-automação)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O módulo de automação permite gerar links externos automaticamente através de navegação programática em sites. Ele simula interações humanas como login, cliques e extração de dados.

### Casos de Uso

- Geração automática de links de afiliado
- Conversão de URLs curtas
- Processamento de links em plataformas externas
- Automação de tarefas repetitivas no navegador

---

## ⚙️ Configuração

### 1. Instalar Dependências

Primeiro, instale as dependências necessárias:

```bash
npm install puppeteer
# ou
npm install playwright
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

### 3. Configurar o arquivo automation.config.ts

O arquivo `src/config/automation.config.ts` contém as configurações centralizadas:

```typescript
export const AUTOMATION_CONFIG = {
  url: "https://site-destino.com",
  selectors: {
    button: "#generate-button",
    generatedLink: ".result-link",
  },
  waitTime: 3,
  credentials: {
    username: process.env.AUTOMATION_USERNAME,
    password: process.env.AUTOMATION_PASSWORD,
  },
};
```

**Personalize conforme necessário:**

- `url`: URL do site onde a automação será executada
- `selectors.button`: Seletor CSS do botão a ser clicado
- `selectors.generatedLink`: Seletor CSS do elemento contendo o link gerado
- `waitTime`: Tempo de espera em segundos após ações

---

## 🚀 Como Usar

### 1. Chamar a API

Faça uma requisição POST para a rota de automação:

```bash
POST http://localhost:3000/automation/generate-link
Content-Type: application/json

{
  "sourceUrl": "https://exemplo.com/produto"
}
```

### 2. Resposta Esperada

```json
{
  "success": true,
  "data": {
    "sourceUrl": "https://exemplo.com/produto",
    "generatedLink": "https://link-gerado.com/abc123",
    "timestamp": "2025-12-01T10:30:00.000Z"
  }
}
```

### 3. Verificar Status

```bash
GET http://localhost:3000/automation/status
```

---

## 🔐 Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

| Variável                     | Descrição                           | Exemplo             | Obrigatório |
| ---------------------------- | ----------------------------------- | ------------------- | ----------- |
| `AUTOMATION_USERNAME`        | Nome de usuário para login          | `usuario@email.com` | ✅          |
| `AUTOMATION_PASSWORD`        | Senha para login                    | `senha123`          | ✅          |
| `AUTOMATION_URL`             | URL do site de automação            | `https://site.com`  | ✅          |
| `AUTOMATION_BUTTON_SELECTOR` | Seletor CSS do botão                | `#generate-btn`     | ✅          |
| `AUTOMATION_RESULT_SELECTOR` | Seletor CSS do resultado            | `.generated-link`   | ✅          |
| `AUTOMATION_WAIT_SECONDS`    | Tempo de espera (segundos)          | `3`                 | ❌          |
| `AUTOMATION_SESSION_COOKIE`  | Nome do cookie de sessão (opcional) | `session_id`        | ❌          |

### Exemplo de .env

```env
AUTOMATION_USERNAME=meu.usuario@email.com
AUTOMATION_PASSWORD=minhasenha123
AUTOMATION_URL=https://plataforma-afiliados.com/generate
AUTOMATION_BUTTON_SELECTOR=#btn-generate
AUTOMATION_RESULT_SELECTOR=.affiliate-link
AUTOMATION_WAIT_SECONDS=5
```

---

## 🔄 Fluxo de Automação

O fluxo completo de automação segue estas etapas:

```
1. 🌐 Inicializar Navegador
   └─> Abre uma nova instância do navegador (Chrome/Firefox)

2. 🔐 Realizar Login
   └─> Preenche campos de usuário e senha
   └─> Submete formulário de login
   └─> Aguarda página carregar

3. 🔗 Navegar para URL
   └─> Acessa a URL configurada
   └─> Espera página estar pronta

4. 👆 Clicar no Botão
   └─> Localiza o botão usando seletor CSS
   └─> Executa clique

5. ⏳ Aguardar Processamento
   └─> Espera tempo configurado
   └─> Garante que o link seja gerado

6. 📎 Extrair Link Gerado
   └─> Localiza elemento com o link
   └─> Extrai o texto/atributo href

7. 🔚 Fechar Navegador
   └─> Limpa recursos
   └─> Encerra sessão
```

### Diagrama de Sequência

```
Cliente  →  API  →  Controller  →  Service  →  Navegador
   |         |          |             |            |
   |--POST-->|          |             |            |
   |         |--call--->|             |            |
   |         |          |--init----->|            |
   |         |          |             |--open---->|
   |         |          |             |<-ready----|
   |         |          |             |--login--->|
   |         |          |             |--click--->|
   |         |          |             |--wait---->|
   |         |          |             |--extract->|
   |         |          |             |<--link----|
   |         |          |             |--close--->|
   |         |          |<--result---|            |
   |         |<--JSON---|             |            |
   |<-200----|          |             |            |
```

---

## 🔧 Troubleshooting

### Problema: Navegador não inicia

**Solução:**

```bash
# Instale as dependências do sistema (Linux)
sudo apt-get install -y chromium-browser

# Ou reinstale o Puppeteer
npm install puppeteer --force
```

### Problema: Seletor não encontrado

**Solução:**

1. Abra o site no navegador
2. Inspecione o elemento desejado (F12)
3. Copie o seletor CSS correto
4. Atualize `AUTOMATION_BUTTON_SELECTOR` ou `AUTOMATION_RESULT_SELECTOR`

### Problema: Timeout

**Solução:**

- Aumente `AUTOMATION_WAIT_SECONDS`
- Verifique a velocidade da internet
- Confirme que o site está acessível

### Problema: Login falha

**Solução:**

- Verifique credenciais no `.env`
- Teste login manual no site
- Verifique se há CAPTCHA ou autenticação 2FA
- Ajuste os seletores de login em `automation.config.ts`

### Logs de Debug

Para ver logs detalhados, adicione ao código:

```typescript
console.log("🐛 Debug:", { selector, element, value });
```

---

## 📚 Recursos Adicionais

- [Documentação do Puppeteer](https://pptr.dev/)
- [Documentação do Playwright](https://playwright.dev/)
- [Seletores CSS](https://developer.mozilla.org/pt-BR/docs/Web/CSS/CSS_Selectors)

---

## 🤝 Contribuindo

Para adicionar novos recursos de automação:

1. Implemente o método em `BrowserAutomationService`
2. Adicione configurações em `automation.config.ts`
3. Atualize o controller se necessário
4. Documente neste arquivo

---

_Documentação atualizada em 01/12/2025_
