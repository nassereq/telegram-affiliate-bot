import axios from "axios";
import * as cheerio from "cheerio";
import { ProductData } from "../../types";
import { IPlatformScraper } from "../IPlatformScraper";
import * as fs from "fs";
import * as path from "path";

export class AmazonScraper implements IPlatformScraper {
  readonly platformName = "Amazon";

  /**
   * Verifica se a URL é da Amazon
   */
  isValidUrl(url: string): boolean {
    const domains = [
      "amazon.com.br",
      "amazon.com",
      "amzn.to", // Links encurtados da Amazon
      "a.co", // Outro formato de link curto
    ];

    return domains.some((domain) => url.includes(domain));
  }

  /**
   * Extrai detalhes do produto da Amazon via scraping
   */
  async scrapeProductDetails(url: string): Promise<ProductData> {
    try {
      console.log(`🔍 Iniciando scraping da Amazon: ${url}`);

      // Fazer requisição HTTP com headers para simular navegador
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        timeout: 15000,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Salvar HTML para debug
      const debugPath = path.join(process.cwd(), "debug_amazon.html");
      fs.writeFileSync(debugPath, html, "utf-8");
      console.log(`📄 HTML da Amazon salvo em: ${debugPath}`);

      // Extrair título
      let title = "";
      const titleSelectors = [
        "#productTitle",
        "#title",
        "h1.a-size-large.product-title-word-break",
        "span#productTitle",
      ];

      for (const selector of titleSelectors) {
        const titleElement = $(selector).first();
        if (titleElement.length > 0) {
          title = titleElement.text().trim();
          if (title) break;
        }
      }

      console.log(`📦 Título encontrado: ${title}`);

      // Extrair preços - Amazon tem estrutura complexa
      let originalPrice = "";
      let discountPrice = "";
      let discountPercentage = "";

      // Tentar extrair desconto primeiro (mais confiável)
      const discountSelectors = [
        ".savingsPercentage", // -35%
        "span.a-color-price.savingPriceOverride",
        ".a-badge-label-inner .a-letter-space",
        "span[data-a-color='price'] .a-badge-label",
      ];

      for (const selector of discountSelectors) {
        const discountElement = $(selector).first();
        if (discountElement.length > 0) {
          const discountText = discountElement.text().trim();
          const match = discountText.match(/(\d+)%/);
          if (match) {
            discountPercentage = match[1] + "%";
            console.log(`🔥 Desconto encontrado: ${discountPercentage}`);
            break;
          }
        }
      }

      // Extrair preço com desconto (atual)
      const currentPriceSelectors = [
        ".a-price.aok-align-center.reinventPricePriceToPayMargin span.a-offscreen",
        ".a-price[data-a-color='price'] span.a-offscreen",
        "span.a-price-whole",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price .a-offscreen",
      ];

      for (const selector of currentPriceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length > 0) {
          let priceText = priceElement.text().trim();

          // Limpar e formatar preço
          priceText = priceText.replace(/[^\d,]/g, "");
          if (priceText && priceText.includes(",")) {
            const parts = priceText.split(",");
            discountPrice = `R$ ${parts[0]}`;
            console.log(`💵 Preço atual encontrado: ${discountPrice}`);
            break;
          }
        }
      }

      // Extrair preço original (De:)
      const originalPriceSelectors = [
        "span.a-price.a-text-price span.a-offscreen",
        ".a-text-strike span.a-offscreen",
        "span[data-a-strike='true'] span.a-offscreen",
        "#priceblock_ourprice_row td.a-span12 .a-text-strike",
      ];

      for (const selector of originalPriceSelectors) {
        const elements = $(selector);
        for (let i = 0; i < elements.length; i++) {
          const priceElement = $(elements[i]);
          let priceText = priceElement.text().trim();

          // Limpar e formatar preço
          priceText = priceText.replace(/[^\d,]/g, "");
          if (priceText && priceText.includes(",")) {
            const parts = priceText.split(",");
            const price = `R$ ${parts[0]}`;

            // Verificar se é diferente do preço atual (é o original)
            if (price !== discountPrice) {
              originalPrice = price;
              console.log(`💰 Preço original encontrado: ${originalPrice}`);
              break;
            }
          }
        }
        if (originalPrice) break;
      }

      // Validar preços matematicamente
      if (originalPrice && discountPrice && discountPercentage) {
        const origValue = parseFloat(originalPrice.replace(/[^\d]/g, ""));
        const discValue = parseFloat(discountPrice.replace(/[^\d]/g, ""));
        const discPerc = parseFloat(discountPercentage.replace("%", ""));

        const isValid = this.validatePrices(origValue, discValue, discPerc);
        if (!isValid) {
          console.log("⚠️ Preços não batem matematicamente na Amazon");
        } else {
          console.log("✅ Preços validados na Amazon!");
        }
      }

      // Extrair imagem
      let imageUrl = "";
      const imageSelectors = [
        "#landingImage",
        "#imgBlkFront",
        "#imageBlock img",
        "img.a-dynamic-image",
        "div#imageBlock_feature_div img",
      ];

      for (const selector of imageSelectors) {
        const imgElement = $(selector).first();
        if (imgElement.length > 0) {
          imageUrl =
            imgElement.attr("data-old-hires") ||
            imgElement.attr("src") ||
            imgElement.attr("data-a-dynamic-image") ||
            "";

          if (imageUrl) {
            // Se data-a-dynamic-image, pegar primeira URL do JSON
            if (imageUrl.startsWith("{")) {
              try {
                const urls = JSON.parse(imageUrl);
                imageUrl = Object.keys(urls)[0];
              } catch (e) {
                // Ignorar erro de parsing
              }
            }
            console.log(`🖼️ Imagem capturada: ${imageUrl}`);
            break;
          }
        }
      }

      // Se não encontrou imagem, tentar og:image
      if (!imageUrl) {
        imageUrl = $('meta[property="og:image"]').attr("content") || "";
        if (imageUrl) {
          console.log(`🖼️ Imagem (og:image): ${imageUrl}`);
        }
      }

      // Resumir título (máximo 6 palavras)
      const words = title.split(/\s+/);
      const shortTitle = words.slice(0, 6).join(" ");

      console.log(`✅ Scraping da Amazon concluído`);

      return {
        title: shortTitle,
        originalPrice,
        discountPrice,
        discountPercentage,
        imageUrl,
        url, // URL fornecida
      };
    } catch (error: any) {
      console.error("❌ Erro ao fazer scraping da Amazon:", error.message);
      throw new Error(
        `Não foi possível extrair dados da Amazon: ${error.message}`
      );
    }
  }

  /**
   * Valida preços usando matemática
   */
  private validatePrices(
    originalPrice: number,
    discountPrice: number,
    discountPercentage: number
  ): boolean {
    const expectedPrice = originalPrice * (1 - discountPercentage / 100);
    const difference = Math.abs(expectedPrice - discountPrice);
    const tolerance = discountPrice * 0.05; // 5% de tolerância

    const isValid = difference <= tolerance;

    console.log("🧮 Validação matemática Amazon:");
    console.log(`  Original: R$ ${originalPrice}`);
    console.log(`  Desconto: ${discountPercentage}%`);
    console.log(`  Esperado: R$ ${expectedPrice.toFixed(2)}`);
    console.log(`  Encontrado: R$ ${discountPrice}`);
    console.log(
      `  Diferença: R$ ${difference.toFixed(
        2
      )} (tolerância: R$ ${tolerance.toFixed(2)})`
    );
    console.log(`  ✓ Válido: ${isValid ? "SIM" : "NÃO"}`);

    return isValid;
  }
}

// Exportar instância singleton
const amazonScraper = new AmazonScraper();
export default amazonScraper;
