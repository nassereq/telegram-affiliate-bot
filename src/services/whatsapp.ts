import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import * as qrcode from "qrcode-terminal";
import { whatsappConfig } from "../config/whatsapp.config";
import { Ad } from "../types";
import * as fs from "fs";
import * as path from "path";

export class WhatsAppService {
  private client: Client | null = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;
  private qrCode: string = "";

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o cliente WhatsApp
   */
  private async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log("⏳ WhatsApp já está sendo inicializado...");
      return;
    }

    this.isInitializing = true;

    try {
      console.log("🔗 Conectando ao WhatsApp...");

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: whatsappConfig.sessionPath,
        }),
        puppeteer: whatsappConfig.puppeteerOptions,
      });

      // Evento: QR Code gerado
      this.client.on("qr", (qr) => {
        this.qrCode = qr;
        console.log("\n📱 QR CODE GERADO! Escaneie com seu WhatsApp:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        qrcode.generate(qr, { small: true });
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          "\n💡 Ou use o comando /whatsapp_status no bot para ver o QR Code novamente\n"
        );
      });

      // Evento: Autenticação em progresso
      this.client.on("authenticated", () => {
        console.log("✅ WhatsApp autenticado com sucesso!");
      });

      // Evento: Autenticação falhou
      this.client.on("auth_failure", (msg) => {
        console.error("❌ Falha na autenticação do WhatsApp:", msg);
        this.isReady = false;
      });

      // Evento: Cliente pronto
      this.client.on("ready", async () => {
        console.log("✅ WhatsApp conectado e pronto!");
        this.isReady = true;
        this.qrCode = "";

        // Mostra informações do usuário
        const info = this.client?.info;
        if (info) {
          console.log(`📱 Conta conectada: ${info.pushname} (${info.wid.user})`);
        }
      });

      // Evento: Cliente desconectado
      this.client.on("disconnected", (reason) => {
        console.log("⚠️ WhatsApp desconectado:", reason);
        this.isReady = false;
      });

      // Inicializa o cliente
      await this.client.initialize();
    } catch (error: any) {
      console.error("❌ Erro ao inicializar WhatsApp:", error.message);
      this.isReady = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Envia um anúncio para o grupo WhatsApp
   */
  async sendAd(ad: Ad, groupId?: string): Promise<boolean> {
    if (!this.isReady || !this.client) {
      console.error("❌ WhatsApp não está pronto. Use /whatsapp_status para verificar.");
      return false;
    }

    try {
      const targetGroupId = groupId || whatsappConfig.groupId;

      if (!targetGroupId) {
        console.error("❌ WHATSAPP_GROUP_ID não configurado no .env");
        return false;
      }

      // Formata o ID do grupo corretamente
      const chatId = targetGroupId.includes("@g.us")
        ? targetGroupId
        : `${targetGroupId}@g.us`;

      // Se tem imagem, envia como mídia com legenda
      if (ad.imageUrl) {
        try {
          // Baixa a imagem e cria MessageMedia
          const media = await MessageMedia.fromUrl(ad.imageUrl);

          await this.client.sendMessage(chatId, media, {
            caption: ad.text,
          });

          console.log("✅ Anúncio com imagem enviado ao WhatsApp");
          return true;
        } catch (imageError: any) {
          console.error("⚠️ Erro ao enviar imagem, enviando apenas texto:", imageError.message);
          // Fallback: envia apenas texto
          await this.client.sendMessage(chatId, ad.text);
          console.log("✅ Anúncio (apenas texto) enviado ao WhatsApp");
          return true;
        }
      } else {
        // Envia apenas texto
        await this.client.sendMessage(chatId, ad.text);
        console.log("✅ Anúncio enviado ao WhatsApp");
        return true;
      }
    } catch (error: any) {
      console.error("❌ Erro ao enviar anúncio ao WhatsApp:", error.message);
      return false;
    }
  }

  /**
   * Obtém status da conexão WhatsApp
   */
  async getStatus(): Promise<{
    isReady: boolean;
    isInitializing: boolean;
    hasQRCode: boolean;
    userInfo?: any;
    groups?: Array<{ id: string; name: string }>;
  }> {
    const status = {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      hasQRCode: !!this.qrCode,
      userInfo: undefined as any,
      groups: [] as Array<{ id: string; name: string }>,
    };

    if (this.isReady && this.client) {
      try {
        // Informações do usuário
        status.userInfo = this.client.info;

        // Lista grupos
        const chats = await this.client.getChats();
        status.groups = chats
          .filter((chat) => chat.isGroup)
          .map((chat) => ({
            id: chat.id._serialized,
            name: chat.name,
          }));
      } catch (error: any) {
        console.error("Erro ao obter status:", error.message);
      }
    }

    return status;
  }

  /**
   * Obtém o QR Code atual (se houver)
   */
  getQRCode(): string {
    return this.qrCode;
  }

  /**
   * Força reconexão do WhatsApp
   */
  async reconnect(): Promise<void> {
    console.log("🔄 Reconectando WhatsApp...");

    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.error("Erro ao destruir cliente:", error);
      }
    }

    this.isReady = false;
    this.isInitializing = false;
    this.qrCode = "";
    this.client = null;

    // Reinicializa
    await this.initialize();
  }

  /**
   * Desconecta o WhatsApp gracefully
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      console.log("⏹️ Desconectando WhatsApp...");
      await this.client.destroy();
      this.isReady = false;
      this.client = null;
    }
  }
}

const whatsappService = new WhatsAppService();
export default whatsappService;
