import { Ad } from "../types";
import telegramService from "./telegram";
import whatsappService from "./whatsapp";

export interface BroadcastResult {
  telegram: boolean;
  whatsapp: boolean;
  success: boolean;
}

export class BroadcasterService {
  /**
   * Envia anúncio para Telegram E WhatsApp simultaneamente
   */
  async broadcastAd(ad: Ad, telegramChatId?: string, whatsappGroupId?: string): Promise<BroadcastResult> {
    console.log("📡 Enviando anúncio para múltiplas plataformas...");

    // Envia para ambas plataformas em paralelo
    const [telegramResult, whatsappResult] = await Promise.all([
      this.sendToTelegram(ad, telegramChatId),
      this.sendToWhatsApp(ad, whatsappGroupId),
    ]);

    const result: BroadcastResult = {
      telegram: telegramResult,
      whatsapp: whatsappResult,
      success: telegramResult || whatsappResult, // Sucesso se pelo menos uma funcionou
    };

    // Log do resultado
    if (result.telegram && result.whatsapp) {
      console.log("✅ Anúncio enviado para Telegram e WhatsApp com sucesso!");
    } else if (result.telegram) {
      console.log("⚠️ Anúncio enviado apenas para Telegram (WhatsApp falhou)");
    } else if (result.whatsapp) {
      console.log("⚠️ Anúncio enviado apenas para WhatsApp (Telegram falhou)");
    } else {
      console.log("❌ Falha ao enviar para ambas plataformas");
    }

    return result;
  }

  /**
   * Envia anúncio apenas para o Telegram
   */
  private async sendToTelegram(ad: Ad, chatId?: string): Promise<boolean> {
    try {
      return await telegramService.sendAd(ad, chatId);
    } catch (error: any) {
      console.error("❌ Erro ao enviar para Telegram:", error.message);
      return false;
    }
  }

  /**
   * Envia anúncio apenas para o WhatsApp
   */
  private async sendToWhatsApp(ad: Ad, groupId?: string): Promise<boolean> {
    try {
      return await whatsappService.sendAd(ad, groupId);
    } catch (error: any) {
      console.error("❌ Erro ao enviar para WhatsApp:", error.message);
      return false;
    }
  }

  /**
   * Verifica status de ambas as plataformas
   */
  async getStatus(): Promise<{
    telegram: boolean;
    whatsapp: boolean;
  }> {
    try {
      const whatsappStatus = await whatsappService.getStatus();
      
      return {
        telegram: true, // Telegram está sempre pronto (assumindo que iniciou)
        whatsapp: whatsappStatus.isReady,
      };
    } catch (error) {
      return {
        telegram: true,
        whatsapp: false,
      };
    }
  }
}

const broadcasterService = new BroadcasterService();
export default broadcasterService;
