import express, { Express } from "express";
import automationController from "./controllers/automationController";
import { validateAutomationConfig } from "./config/automation.config";

/**
 * Servidor HTTP Express para rotas de automação
 * Separado do bot Telegram para manter a separação de responsabilidades
 */

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ========================================
// ROTAS DE AUTOMAÇÃO
// ========================================

/**
 * POST /automation/generate-link
 * Gera link através de automação de navegador
 *
 * Body: { "sourceUrl": "https://..." }
 * Response: { "success": true, "data": { "generatedLink": "..." } }
 */
app.post(
  "/automation/generate-link",
  automationController.generateExternalLink.bind(automationController)
);

/**
 * GET /automation/status
 * Verifica status do serviço de automação
 */
app.get(
  "/automation/status",
  automationController.getStatus.bind(automationController)
);

/**
 * GET /health
 * Health check da API
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /
 * Rota raiz com informações da API
 */
app.get("/", (req, res) => {
  res.json({
    name: "Telegram Affiliate Bot - API",
    version: "6.0",
    endpoints: {
      automation: {
        generateLink: "POST /automation/generate-link",
        status: "GET /automation/status",
      },
      health: "GET /health",
    },
  });
});

// Tratamento de rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.path,
  });
});

// Tratamento de erros
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("❌ Erro na API:", err);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: err.message,
    });
  }
);

// Iniciar servidor
export function startApiServer(): void {
  // Validar configuração de automação
  const validation = validateAutomationConfig();
  if (!validation.valid) {
    console.warn(
      "⚠️  Configuração de automação incompleta. Variáveis ausentes:",
      validation.missing
    );
    console.warn(
      "📝 A API funcionará, mas a automação pode falhar sem essas variáveis"
    );
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 API iniciada em http://localhost:${PORT}`);
    console.log(`📚 Documentação: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(
      `🤖 Automação: POST http://localhost:${PORT}/automation/generate-link\n`
    );
  });
}

export default app;
