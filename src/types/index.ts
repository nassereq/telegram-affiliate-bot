// Dados extraídos da análise de imagem
export interface ProductData {
  title: string;
  originalPrice?: string;
  discountPrice: string;
  discountPercentage?: string;
  url: string;
  imageUrl?: string;
  coupon?: string;
  couponDiscount?: string;
  couponMinValue?: string;
  isFlashDeal?: boolean;
}

// Anúncio formatado para o Telegram
export interface Ad {
  text: string;
  imageUrl?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

// Resposta da análise de imagem OpenAI
export interface ImageAnalysisResult {
  success: boolean;
  data?: ProductData;
  error?: string;
}

// Configuração do bot
export interface BotConfig {
  telegramToken: string;
  openAIKey: string;
  chatId: string;
  nodeEnv: string;
}

// Contexto de mensagem do Telegram
export interface TelegramContext {
  message?: {
    photo?: Array<{ file_id: string }>;
    text?: string;
    chat: { id: number };
  };
  reply: (text: string) => Promise<void>;
}

// Anúncio na fila de postagem
export interface QueuedAd {
  id: string;
  ad: Ad;
  userId: number;
  username?: string;
  createdAt: Date;
  scheduledAt: Date;
  status: "pending" | "posted" | "error";
  error?: string;
}

// Configuração da fila de postagem
export interface QueueConfig {
  intervalMinutes: number;
  isPaused: boolean;
  maxQueueSize: number;
}
