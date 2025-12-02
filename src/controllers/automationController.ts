import { Request, Response } from "express";
import { BrowserAutomationService } from "../services/browserAutomation";
import { AUTOMATION_CONFIG } from "../config/automation.config";

/**
 * Controller para operações de automação
 */
export class AutomationController {
  private automationService: BrowserAutomationService;

  constructor() {
    this.automationService = new BrowserAutomationService();
  }

  /**
   * Gera link externo através de automação
   * POST /automation/generate-link
   *
   * Body esperado:
   * {
   *   "sourceUrl": "https://exemplo.com/produto"
   * }
   */
  async generateExternalLink(req: Request, res: Response): Promise<void> {
    try {
      const { sourceUrl } = req.body;

      if (!sourceUrl) {
        res.status(400).json({
          success: false,
          error: "sourceUrl é obrigatório",
        });
        return;
      }

      console.log("🚀 Iniciando automação para gerar link...");

      // 1. Inicializar navegador
      await this.automationService.initializeBrowser();

      // 2. Fazer login
      await this.automationService.login(
        AUTOMATION_CONFIG.credentials.username,
        AUTOMATION_CONFIG.credentials.password
      );

      // 3. Navegar para a URL configurada
      await this.automationService.navigateTo(AUTOMATION_CONFIG.url);

      // 4. Clicar no botão
      await this.automationService.clickButton(
        AUTOMATION_CONFIG.selectors.button
      );

      // 5. Aguardar processamento
      await this.automationService.waitFor(AUTOMATION_CONFIG.waitTime);

      // 6. Extrair link gerado
      const generatedLink = await this.automationService.extractGeneratedLink(
        AUTOMATION_CONFIG.selectors.generatedLink
      );

      // 7. Fechar navegador
      await this.automationService.closeBrowser();

      console.log("✅ Link gerado com sucesso:", generatedLink);

      // Retornar resultado
      res.status(200).json({
        success: true,
        data: {
          sourceUrl,
          generatedLink,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("❌ Erro na automação:", error);

      // Garantir que o navegador seja fechado em caso de erro
      try {
        await this.automationService.closeBrowser();
      } catch (closeError) {
        console.error("Erro ao fechar navegador:", closeError);
      }

      res.status(500).json({
        success: false,
        error: error.message || "Erro na automação",
      });
    }
  }

  /**
   * Verifica status da automação
   * GET /automation/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        status: "operational",
        config: {
          url: AUTOMATION_CONFIG.url,
          waitTime: AUTOMATION_CONFIG.waitTime,
          headless: AUTOMATION_CONFIG.browser.headless,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new AutomationController();
