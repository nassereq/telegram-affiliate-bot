// Dados extraídos da análise de imagem
export interface ProductData {
  title: string;
  originalPrice?: string;
  discountPrice: string;
  discountPercentage?: string;
  url: string;
  imageUrl?: string;
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
