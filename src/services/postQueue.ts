import { QueuedAd, Ad, QueueConfig } from "../types";
import telegramService from "./telegram";
import * as fs from "fs";
import * as path from "path";

class PostQueueService {
  private queue: QueuedAd[] = [];
  private config: QueueConfig = {
    intervalMinutes: 5, // Padrão: 5 minutos
    isPaused: false,
    maxQueueSize: 50,
  };
  private timer: NodeJS.Timeout | null = null;
  private queueFilePath = path.join(__dirname, "../../queue.json");

  constructor() {
    this.loadQueue();
    this.startScheduler();
  }

  /**
   * Adiciona anúncio à fila
   */
  addToQueue(ad: Ad, userId: number, username?: string): QueuedAd {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(
        `Fila cheia! Máximo: ${this.config.maxQueueSize} anúncios`
      );
    }

    const pendingAds = this.getPendingAds();
    const lastAd = pendingAds[pendingAds.length - 1];
    const now = new Date();

    // Calcula horário agendado baseado no último anúncio pendente
    // Primeiro anúncio: 3 minutos a partir de agora
    // Demais: intervalo configurado após o último
    const scheduledAt = lastAd
      ? new Date(
          lastAd.scheduledAt.getTime() +
            this.config.intervalMinutes * 60 * 1000
        )
      : new Date(now.getTime() + 3 * 60 * 1000); // 3 minutos

    const queuedAd: QueuedAd = {
      id: `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ad,
      userId,
      username,
      createdAt: now,
      scheduledAt,
      status: "pending",
    };

    this.queue.push(queuedAd);
    this.saveQueue();

    const minutesUntilPost = Math.round((scheduledAt.getTime() - now.getTime()) / 60000);
    console.log(`✅ Anúncio adicionado à fila: ${queuedAd.id}`);
    console.log(`📅 Agendado para: ${scheduledAt.toLocaleString("pt-BR")} (em ${minutesUntilPost} minutos)`);

    return queuedAd;
  }

  /**
   * Remove anúncio da fila
   */
  removeFromQueue(adId: string): boolean {
    const index = this.queue.findIndex((ad) => ad.id === adId);
    if (index === -1) return false;

    const ad = this.queue[index];
    if (ad.status === "pending") {
      // Recalcula horários dos anúncios seguintes
      this.queue.splice(index, 1);
      this.recalculateSchedule();
      this.saveQueue();
      return true;
    }

    this.queue.splice(index, 1);
    this.saveQueue();
    return true;
  }

  /**
   * Obtém todos os anúncios da fila
   */
  getQueue(): QueuedAd[] {
    return [...this.queue];
  }

  /**
   * Obtém anúncios pendentes
   */
  getPendingAds(): QueuedAd[] {
    return this.queue.filter((ad) => ad.status === "pending");
  }

  /**
   * Obtém próximo anúncio a ser postado
   */
  getNextAd(): QueuedAd | null {
    const pending = this.getPendingAds();
    if (pending.length === 0) return null;

    // Ordena por scheduledAt
    pending.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
    );
    return pending[0];
  }

  /**
   * Limpa toda a fila
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    console.log("🗑️ Fila limpa");
  }

  /**
   * Configura intervalo entre postagens
   */
  setInterval(minutes: number): void {
    if (minutes < 1 || minutes > 1440) {
      throw new Error(
        "Intervalo deve estar entre 1 e 1440 minutos (24h)"
      );
    }

    this.config.intervalMinutes = minutes;
    this.recalculateSchedule();
    this.saveQueue();
    this.restartScheduler();
    console.log(`⏱️ Intervalo configurado para ${minutes} minutos`);
  }

  /**
   * Pausa/retoma fila
   */
  togglePause(): boolean {
    this.config.isPaused = !this.config.isPaused;
    this.saveQueue();

    if (this.config.isPaused) {
      console.log("⏸️ Fila pausada");
    } else {
      console.log("▶️ Fila retomada");
      this.restartScheduler();
    }

    return this.config.isPaused;
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * Recalcula horários de todos os anúncios pendentes
   */
  private recalculateSchedule(): void {
    const pendingAds = this.getPendingAds();
    const now = new Date();

    pendingAds.forEach((ad, index) => {
      if (index === 0) {
        // Primeiro anúncio: agenda para agora se não tiver horário futuro
        ad.scheduledAt =
          ad.scheduledAt > now ? ad.scheduledAt : now;
      } else {
        // Demais anúncios: baseado no anterior
        const prevAd = pendingAds[index - 1];
        ad.scheduledAt = new Date(
          prevAd.scheduledAt.getTime() +
            this.config.intervalMinutes * 60 * 1000
        );
      }
    });
  }

  /**
   * Inicia agendador
   */
  private startScheduler(): void {
    // Verifica a cada 30 segundos se há anúncios para postar
    this.timer = setInterval(() => {
      this.processQueue();
    }, 30000); // 30 segundos

    console.log("🚀 Agendador de fila iniciado");
  }

  /**
   * Reinicia agendador
   */
  private restartScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.startScheduler();
  }

  /**
   * Processa fila e posta anúncios agendados
   */
  private async processQueue(): Promise<void> {
    if (this.config.isPaused) return;

    const now = new Date();
    const pendingAds = this.queue.filter(
      (ad) => ad.status === "pending" && ad.scheduledAt <= now
    );

    if (pendingAds.length > 0) {
      console.log(`⏰ Verificando fila: ${pendingAds.length} anúncio(s) pronto(s) para postar`);
    }

    for (const queuedAd of pendingAds) {
      try {
        const scheduledTime = queuedAd.scheduledAt.toLocaleTimeString("pt-BR");
        const currentTime = now.toLocaleTimeString("pt-BR");
        console.log(`📤 Postando anúncio: ${queuedAd.id}`);
        console.log(`   Agendado: ${scheduledTime} | Atual: ${currentTime}`);

        const success = await telegramService.sendAd(queuedAd.ad);

        if (success) {
          queuedAd.status = "posted";
          console.log(`✅ Anúncio postado com sucesso: ${queuedAd.id}`);
        } else {
          queuedAd.status = "error";
          queuedAd.error = "Erro ao enviar para o Telegram";
          console.error(`❌ Erro ao postar: ${queuedAd.id}`);
        }
      } catch (error: any) {
        queuedAd.status = "error";
        queuedAd.error = error.message;
        console.error(
          `❌ Erro ao postar ${queuedAd.id}:`,
          error.message
        );
      }

      this.saveQueue();
    }

    // Remove anúncios postados há mais de 24h
    this.cleanOldAds();
  }

  /**
   * Remove anúncios antigos
   */
  private cleanOldAds(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialLength = this.queue.length;

    this.queue = this.queue.filter((ad) => {
      if (ad.status === "posted" && ad.scheduledAt < oneDayAgo) {
        return false; // Remove
      }
      return true; // Mantém
    });

    if (this.queue.length < initialLength) {
      this.saveQueue();
      console.log(
        `🗑️ ${initialLength - this.queue.length} anúncios antigos removidos`
      );
    }
  }

  /**
   * Salva fila em arquivo
   */
  private saveQueue(): void {
    try {
      const data = {
        queue: this.queue,
        config: this.config,
      };
      fs.writeFileSync(
        this.queueFilePath,
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error("❌ Erro ao salvar fila:", error);
    }
  }

  /**
   * Carrega fila do arquivo
   */
  private loadQueue(): void {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const data = JSON.parse(
          fs.readFileSync(this.queueFilePath, "utf8")
        );

        // Converter strings de data para objetos Date
        this.queue = data.queue.map((ad: any) => ({
          ...ad,
          createdAt: new Date(ad.createdAt),
          scheduledAt: new Date(ad.scheduledAt),
        }));

        this.config = data.config || this.config;
        console.log(`✅ Fila carregada: ${this.queue.length} anúncios`);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar fila:", error);
    }
  }
}

const postQueueService = new PostQueueService();
export default postQueueService;
