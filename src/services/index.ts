/**
 * Índice central de serviços
 * Facilita importações em outros módulos
 */

export { BrowserAutomationService } from "./browserAutomation";
export { default as browserAutomationService } from "./browserAutomation";

export { TelegramService } from "./telegram";
export { default as telegramService } from "./telegram";

export { default as imageAnalyzer } from "./imageAnalysis";

// Export do mercadoLivreService se ainda existir
// export { default as mercadoLivreService } from "./mercadoLivre";
