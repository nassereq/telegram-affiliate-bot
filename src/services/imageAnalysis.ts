import axios from "axios";
import { ImageAnalysisResult, ProductData } from "../types";
import { APP_CONFIG } from "../config/config";

class ImageAnalyzer {
  private apiUrl: string =
    "https://models.inference.ai.azure.com/chat/completions";

  async analyzeProductImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente especializado em extrair informações de screenshots de produtos do Mercado Livre. Retorne APENAS JSON válido, sem markdown ou texto adicional.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analise esta imagem de um anúncio do Mercado Livre e extraia:

{
  "title": "nome completo do produto",
  "originalPrice": "preço original riscado (ex: R$ 999)",
  "discountPrice": "preço com desconto em destaque (ex: R$ 575)",
  "discountPercentage": "porcentagem de desconto (ex: 42%)",
  "url": ""
}

IMPORTANTE:
- Se não houver preço original riscado, deixe originalPrice como null
- O discountPrice é o preço PRINCIPAL em destaque
- Extraia APENAS os números e valores visíveis na imagem
- Retorne SOMENTE o JSON, sem texto adicional`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          model: "gpt-4o",
          temperature: 0.1,
          max_tokens: 800,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${APP_CONFIG.openAIKey}`,
          },
        }
      );

      const content = (response.data as any).choices[0]?.message?.content;
      if (!content) {
        throw new Error("Nenhuma resposta da API GitHub Models");
      }

      console.log("📝 Resposta da IA:", content);

      // Extrair JSON da resposta (remove markdown se houver)
      let jsonText = content.trim();

      // Remove blocos de código markdown
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

      // Procura por JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Formato de resposta inválido - JSON não encontrado");
      }

      const productData: ProductData = JSON.parse(jsonMatch[0]);

      // Valida se pelo menos tem título e preço
      if (!productData.title || !productData.discountPrice) {
        throw new Error("Dados incompletos extraídos da imagem");
      }

      return {
        success: true,
        data: productData,
      };
    } catch (error: any) {
      console.error("❌ Erro ao analisar imagem:", error);
      console.error("Detalhes:", error.response?.data || error.message);

      // Mensagem de erro mais específica
      if (error.response?.status === 401) {
        return {
          success: false,
          error:
            "Token do GitHub inválido ou expirado. Verifique GITHUB_TOKEN no .env",
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: "Limite de requisições atingido. Aguarde alguns minutos.",
        };
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error:
            "Erro ao processar imagem. Verifique se a URL da imagem está acessível.",
        };
      }

      return {
        success: false,
        error: error.message || "Erro desconhecido ao analisar imagem",
      };
    }
  }
}

export default ImageAnalyzer;
