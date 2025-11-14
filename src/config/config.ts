import { config } from "dotenv";
import { BotConfig } from "../types";
import * as path from "path";

// Carrega o arquivo .env da raiz do projeto
const envPath = path.resolve(__dirname, "../../.env");
console.log("📁 Carregando .env de:", envPath);
config({ path: envPath });

console.log("🔑 Variáveis carregadas:");
console.log(
  "- TELEGRAM_BOT_TOKEN:",
  process.env.TELEGRAM_BOT_TOKEN ? "✓ Presente" : "✗ Ausente"
);
console.log(
  "- GITHUB_TOKEN:",
  process.env.GITHUB_TOKEN ? "✓ Presente" : "✗ Ausente"
);
console.log(
  "- TELEGRAM_CHAT_ID:",
  process.env.TELEGRAM_CHAT_ID ? "✓ Presente" : "✗ Ausente"
);

export const APP_CONFIG: BotConfig = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  openAIKey: process.env.GITHUB_TOKEN || "", // Usando GitHub Token
  chatId: process.env.TELEGRAM_CHAT_ID || "",
  nodeEnv: process.env.NODE_ENV || "development",
};

// Validação de variáveis obrigatórias
export function validateConfig(): void {
  const required = ["telegramToken", "openAIKey", "chatId"];
  const missing = required.filter((key) => !APP_CONFIG[key as keyof BotConfig]);

  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}`);
  }
}
