import ImageAnalyzer from "../services/imageAnalysis";
import mercadoLivreService from "../services/mercadoLivre";
import telegramService from "../services/telegram";
import { formatProductAd } from "../utils/formatter";
import { isValidProductData } from "../utils/validator";
import { ProductData, Ad } from "../types";

export class AdGeneratorController {
  private imageAnalyzer: ImageAnalyzer;

  constructor() {
    this.imageAnalyzer = new ImageAnalyzer();
  }

  /**
   * Processa uma imagem e gera um anúncio completo
   */
  async generateAdFromImage(
    imageUrl: string
  ): Promise<{ success: boolean; ad?: Ad; error?: string }> {
    try {
      // 1. Analisa a imagem com OpenAI
      const analysisResult = await this.imageAnalyzer.analyzeProductImage(
        imageUrl
      );

      if (!analysisResult.success || !analysisResult.data) {
        return {
          success: false,
          error: analysisResult.error || "Erro ao analisar imagem",
        };
      }

      const productData = analysisResult.data;

      // 2. Valida os dados extraídos
      if (!isValidProductData(productData)) {
        return {
          success: false,
          error: "Dados do produto incompletos ou inválidos",
        };
      }

      // 3. Valida se é URL do Mercado Livre
      if (!mercadoLivreService.isValidMercadoLivreUrl(productData.url)) {
        return {
          success: false,
          error: "URL inválida do Mercado Livre",
        };
      }

      // 4. Formata o anúncio
      const ad = formatProductAd(productData);

      return {
        success: true,
        ad,
      };
    } catch (error: any) {
      console.error("Erro ao gerar anúncio:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido ao gerar anúncio",
      };
    }
  }

  /**
   * Gera e envia um anúncio diretamente para o Telegram
   */
  async generateAndSendAd(imageUrl: string, chatId?: string): Promise<boolean> {
    const result = await this.generateAdFromImage(imageUrl);

    if (!result.success || !result.ad) {
      console.error("Falha ao gerar anúncio:", result.error);
      return false;
    }

    return await telegramService.sendAd(result.ad, chatId);
  }
}

export default new AdGeneratorController();
