import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const STATE_FILE = path.join(process.cwd(), "whatsapp-state.json");

// Função para carregar estado persistido
function loadWhatsAppState(): boolean {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      const state = JSON.parse(data);
      console.log(`📁 Estado do WhatsApp carregado: ${state.enabled ? "ATIVADO" : "DESATIVADO"}`);
      return state.enabled;
    }
  } catch (error) {
    console.log("⚠️ Erro ao carregar estado do WhatsApp, usando padrão");
  }
  // Padrão: verificar variável de ambiente
  return process.env.WHATSAPP_ENABLED !== "false";
}

// Função para salvar estado
export function saveWhatsAppState(enabled: boolean): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ enabled }, null, 2));
    console.log(`💾 Estado do WhatsApp salvo: ${enabled ? "ATIVADO" : "DESATIVADO"}`);
  } catch (error: any) {
    console.error("❌ Erro ao salvar estado do WhatsApp:", error.message);
  }
}

export const whatsappConfig = {
  enabled: loadWhatsAppState(), // Carrega estado persistido
  groupId: process.env.WHATSAPP_GROUP_ID || "",
  sessionPath: "./whatsapp-session",
  puppeteerOptions: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    timeout: 0, // Remove timeout do Puppeteer
  },
  connectionTimeout: 60000,
  maxRetries: 3,
  retryDelay: 5000,
};
