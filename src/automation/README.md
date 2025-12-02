# Módulo de Automação de Navegador

Este módulo fornece capacidades de automação de navegador para o Telegram Affiliate Bot, permitindo geração automática de links e outras tarefas que requerem interação programática com sites.

## 📁 Estrutura de Arquivos

```
src/
├── services/
│   ├── browserAutomation.ts    # Serviço principal de automação
│   └── index.ts                 # Exportações centralizadas
├── controllers/
│   └── automationController.ts  # Controller HTTP para automação
├── config/
│   └── automation.config.ts     # Configurações de automação
└── server.ts                    # Servidor Express com rotas API

docs/
└── automation.md                # Documentação completa
```

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis

Copie `.env.example` para `.env` e configure:

```env
ENABLE_API_SERVER=true
API_PORT=3000

AUTOMATION_USERNAME=seu_usuario
AUTOMATION_PASSWORD=sua_senha
AUTOMATION_URL=https://site.com
AUTOMATION_BUTTON_SELECTOR=#btn-generate
AUTOMATION_RESULT_SELECTOR=.result-link
```

### 3. Iniciar o Servidor

```bash
npm run dev
```

O bot Telegram e a API HTTP iniciarão juntos.

## 🔌 Uso da API

### Gerar Link

```bash
curl -X POST http://localhost:3000/automation/generate-link \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl": "https://exemplo.com/produto"}'
```

Resposta:

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

### Verificar Status

```bash
curl http://localhost:3000/automation/status
```

## 📚 Documentação Completa

Consulte [docs/automation.md](../docs/automation.md) para:

- Guia detalhado de configuração
- Fluxo completo de automação
- Troubleshooting
- Exemplos avançados

## 🛠️ Desenvolvimento

### Estrutura do Serviço

```typescript
class BrowserAutomationService {
  async initializeBrowser(): Promise<void>;
  async login(username: string, password: string): Promise<void>;
  async navigateTo(url: string): Promise<void>;
  async clickButton(selector: string): Promise<void>;
  async waitFor(seconds: number): Promise<void>;
  async extractGeneratedLink(selector: string): Promise<string>;
  async closeBrowser(): Promise<void>;
}
```

### Adicionar Novos Métodos

1. Implemente o método em `browserAutomation.ts`
2. Adicione configurações em `automation.config.ts`
3. Atualize o controller se necessário
4. Documente em `docs/automation.md`

## ⚙️ Configurações

### Configuração do Navegador

Edite `automation.config.ts`:

```typescript
browser: {
  headless: true,           // Sem interface gráfica
  timeout: 30000,           // 30 segundos
  viewport: {
    width: 1366,
    height: 768
  }
}
```

### Seletores Personalizados

```typescript
selectors: {
  button: "#meu-botao",
  generatedLink: ".meu-link",
  loginForm: {
    username: "#user",
    password: "#pass",
    submitButton: "button[type='submit']"
  }
}
```

## 🔒 Segurança

- ✅ Credenciais armazenadas em variáveis de ambiente
- ✅ Não commitar `.env` no repositório
- ✅ Usar HTTPS quando possível
- ✅ Implementar rate limiting em produção

## 🧪 Testes

```bash
# Executar testes
npm test

# Testar automação manualmente
node -e "require('./dist/services/browserAutomation').default.initializeBrowser()"
```

## 📦 Build para Produção

```bash
# Compilar TypeScript
npm run build

# Executar versão compilada
npm start
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](../LICENSE) para detalhes.

---

Desenvolvido com ❤️ para Telegram Affiliate Bot v6.0
