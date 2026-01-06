import OpenAI from "openai";
import { APP_CONFIG } from "../config/config";

export class TitleOptimizerService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: APP_CONFIG.openAIKey,
      baseURL: "https://models.inference.ai.azure.com",
    });
  }

  /**
   * Gera um título criativo e chamativo para o produto
   */
  async optimizeTitle(
    originalTitle: string,
    productData: {
      discountPrice?: string;
      originalPrice?: string;
      discountPercentage?: string;
      platform: "mercadolivre" | "amazon";
    }
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(originalTitle, productData);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em copywriting para e-commerce e marketing digital brasileiro.
Sua tarefa é criar títulos criativos, chamativos e persuasivos para anúncios de produtos de afiliados.

REGRAS IMPORTANTES:
- Mantenha a marca e modelo do produto
- Adicione 1-2 linhas persuasivas (máximo 3 linhas no total)
- Use NO MÁXIMO 1 emoji relevante
- Destaque benefícios únicos do produto
- Crie senso de urgência quando apropriado
- Seja autêntico, evite exageros
- NUNCA use CAPS LOCK em excesso
- Foque em benefícios, não características
- Linguagem brasileira informal mas profissional`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const optimizedTitle = completion.choices[0]?.message?.content?.trim();

      if (!optimizedTitle) {
        console.log("⚠️ IA não retornou título otimizado, usando original");
        return originalTitle;
      }

      console.log("✅ Título otimizado gerado com sucesso");
      return optimizedTitle;
    } catch (error: any) {
      console.error("❌ Erro ao otimizar título:", error.message);
      return originalTitle; // Fallback para título original
    }
  }

  /**
   * Constrói o prompt para a IA
   */
  private buildPrompt(
    originalTitle: string,
    productData: {
      discountPrice?: string;
      originalPrice?: string;
      discountPercentage?: string;
      platform: "mercadolivre" | "amazon";
    }
  ): string {
    let prompt = `Crie um título criativo e chamativo para este produto:\n\n`;
    prompt += `Título Original: ${originalTitle}\n`;

    if (productData.originalPrice && productData.discountPrice) {
      prompt += `Preço Original: ${productData.originalPrice}\n`;
      prompt += `Preço com Desconto: ${productData.discountPrice}\n`;
    } else if (productData.discountPrice) {
      prompt += `Preço: ${productData.discountPrice}\n`;
    }

    if (productData.discountPercentage) {
      prompt += `Desconto: ${productData.discountPercentage}\n`;
    }

    prompt += `Plataforma: ${
      productData.platform === "mercadolivre" ? "Mercado Livre" : "Amazon"
    }\n\n`;

    prompt += `FORMATO DO TÍTULO:\n`;
    prompt += `Linha 1: Marca + Modelo + emoji (se relevante)\n`;
    prompt += `Linha 2: Gatilho mental ou benefício principal\n`;
    prompt += `Linha 3 (opcional): Reforço ou urgência\n\n`;

    prompt += `EXEMPLOS:\n`;
    prompt += `Exemplo 1:\n`;
    prompt += `Tênis Nike Air Max 2024 ⚡\n`;
    prompt += `Tecnologia Air que você ama\n`;
    prompt += `Lançamento com desconto limitado\n\n`;

    prompt += `Exemplo 2:\n`;
    prompt += `Fone JBL Tune 520BT 🎧\n`;
    prompt += `57h de bateria + som premium\n`;
    prompt += `O wireless que cabe no seu bolso\n\n`;

    prompt += `Agora crie para o produto acima. Retorne APENAS o título otimizado, sem explicações.`;

    return prompt;
  }

  /**
   * Gera múltiplas opções de título para o usuário escolher
   */
  async generateTitleOptions(
    originalTitle: string,
    productData: {
      discountPrice?: string;
      originalPrice?: string;
      discountPercentage?: string;
      platform: "mercadolivre" | "amazon";
    },
    numberOfOptions: number = 3
  ): Promise<string[]> {
    const options: string[] = [];

    try {
      for (let i = 0; i < numberOfOptions; i++) {
        const title = await this.optimizeTitle(originalTitle, productData);
        // Evita duplicatas
        if (!options.includes(title)) {
          options.push(title);
        }
      }

      return options.length > 0 ? options : [originalTitle];
    } catch (error: any) {
      console.error("❌ Erro ao gerar opções de título:", error.message);
      return [originalTitle]; // Fallback
    }
  }
}

export default new TitleOptimizerService();
