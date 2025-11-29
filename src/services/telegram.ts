import { Telegraf } from "telegraf";
import { Ad } from "../types";
import { APP_CONFIG } from "../config/config";

export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(APP_CONFIG.telegramToken);
  }

  /**
   * Envia um anúncio formatado para o grupo/chat especificado
   */
  async sendAd(ad: Ad, chatId?: string): Promise<boolean> {
    try {
      const targetChatId = chatId || APP_CONFIG.chatId;

      if (ad.imageUrl) {
        // Envia foto com legenda
        await this.bot.telegram.sendPhoto(targetChatId, ad.imageUrl, {
          caption: ad.text,
          parse_mode: ad.parseMode,
        });
      } else {
        // Envia apenas texto
        await this.bot.telegram.sendMessage(targetChatId, ad.text, {
          parse_mode: ad.parseMode,
        });
      }

      return true;
    } catch (error: any) {
      console.error("Erro ao enviar anúncio:", error.message);
      return false;
    }
  }

  /**
   * Envia mensagem simples
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, text);
  }

  /**
   * Obtém o bot instance para uso externo
   */
  getBot(): Telegraf {
    return this.bot;
  }

  /**
   * Obtém a URL do arquivo enviado
   */
  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const file = await this.bot.telegram.getFile(fileId);
      return `https://api.telegram.org/file/bot${APP_CONFIG.telegramToken}/${file.file_path}`;
    } catch (error: any) {
      console.error("Erro ao obter URL do arquivo:", error.message);
      return null;
    }
  }

  /**
   * Inicia o bot
   */
  async launch(): Promise<void> {
    try {
      console.log("🔗 Conectando ao Telegram...");
      await this.bot.launch();
      console.log("✅ Bot do Telegram iniciado!");
    } catch (error: any) {
      console.error("❌ Erro ao conectar ao Telegram:", error.message);
      if (error.response) {
        console.error("Resposta da API:", error.response);
      }
      throw error;
    }
  }

  /**
   * Para o bot gracefully
   */
  stop(signal?: string): void {
    this.bot.stop(signal);
  }
}

export default new TelegramService();
