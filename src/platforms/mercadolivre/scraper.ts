import axios from "axios";
import * as cheerio from "cheerio";
import { ProductData } from "../../types";
import { IPlatformScraper } from "../IPlatformScraper";
import * as fs from "fs";
import * as path from "path";

export interface ProductDetails {
  title: string;
  originalPrice?: string;
  discountPrice: string;
  discountPercentage?: string;
  imageUrl?: string;
  url?: string;
}

export class MercadoLivreScraper implements IPlatformScraper {
  readonly platformName = "Mercado Livre";
  private apiUrl: string = "https://api.mercadolibre.com";

  /**
   * Extrai o ID do produto de uma URL do Mercado Livre
   * Exemplos:
   * - https://mercadolivre.com/sec/16HiNp3 -> extrai o código
   * - https://produto.mercadolivre.com.br/MLB-123456 -> MLB-123456
   */
  extractProductId(url: string): string | null {
    // Padrão: MLB-XXXXXXX ou código curto após /sec/
    const patterns = [
      /MLB-\d+/,
      /MLA-\d+/,
      /\/sec\/([A-Za-z0-9]+)/,
      /\/p\/([A-Z0-9-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  /**
   * Busca detalhes do produto na API do Mercado Livre (opcional)
   * Nota: A API pública não requer autenticação para consultas básicas
   */
  async fetchProductDetails(productId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/items/${productId}`);
      return response.data;
    } catch (error: any) {
      console.error("❌ Erro ao fazer scraping:", error.message);
      throw new Error(
        `Não foi possível extrair dados do produto: ${error.message}`
      );
    }
  }

  /**
   * Valida se uma URL é do Mercado Livre
   */
  isValidUrl(url: string): boolean {
    const domains = [
      "mercadolivre.com",
      "mercadolibre.com",
      "mercadolivr.com",
      "produto.mercadolivre.com.br",
    ];

    return domains.some((domain) => url.includes(domain));
  }

  /**
   * Valida se os preços estão corretos usando a fórmula:
   * PrecoOriginal × (1 - Desconto%) = PrecoComDesconto
   * Com margem de erro de 5%
   */
  private validatePrices(
    originalPrice: number,
    discountPrice: number,
    discountPercentage: number
  ): boolean {
    const expectedPrice = originalPrice * (1 - discountPercentage / 100);
    const difference = Math.abs(expectedPrice - discountPrice);
    const tolerance = discountPrice * 0.05; // 5% de margem de erro

    const isValid = difference <= tolerance;

    console.log("🧮 Validação matemática:");
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

  /**
   * Encontra a melhor combinação de preços que satisfaz a equação do desconto
   */
  private findValidPriceCombination(
    prices: number[],
    discountPercentage: number
  ): { original: number; discount: number } | null {
    // Ordenar preços (menor para maior)
    const sortedPrices = [...prices].sort((a, b) => a - b);

    // Testar todas as combinações possíveis
    for (let i = 0; i < sortedPrices.length; i++) {
      const discountPrice = sortedPrices[i];

      for (let j = i + 1; j < sortedPrices.length; j++) {
        const originalPrice = sortedPrices[j];

        if (
          this.validatePrices(originalPrice, discountPrice, discountPercentage)
        ) {
          console.log(
            `✅ Combinação válida encontrada: R$ ${originalPrice} → R$ ${discountPrice}`
          );
          return { original: originalPrice, discount: discountPrice };
        }
      }
    }

    console.log("❌ Nenhuma combinação válida encontrada");
    return null;
  }

  /**
   * Faz scraping da página do produto para extrair informações
   */
  async scrapeProductDetails(url: string): Promise<ProductData> {
    try {
      console.log("🔍 Iniciando scraping da URL:", url);

      // Fazer requisição HTTP para obter o HTML
      const response = await axios.get<string>(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        timeout: 10000,
      });

      const html = response.data as string;

      // 🆕 DEBUG: Salvar HTML em arquivo
      const fs = require("fs");
      const debugPath =
        "C:\\Users\\capis\\0_anuncios\\telegram-affiliate-bot\\debug_ml.html";
      fs.writeFileSync(debugPath, html, "utf8");
      console.log(`\n📄 HTML salvo em: ${debugPath}\n`);

      const $ = cheerio.load(html); // Extrair título
      let title =
        $("h1.ui-pdp-title").text().trim() ||
        $('[class*="ui-pdp-title"]').text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        "";

      // Extrair porcentagem de desconto PRIMEIRO (sempre correto)
      let discountPercentage = "";
      const discountElement = $(
        "span.andes-money-amount__discount, [class*='discount']"
      ).first();
      const discountText = discountElement.text().trim();

      const percentMatch = discountText.match(/(\d+)%/);
      const discountPercent = percentMatch ? parseInt(percentMatch[1]) : 0;
      discountPercentage = percentMatch ? `${percentMatch[1]}%` : "";

      console.log("🔥 Desconto encontrado:", discountPercentage);

      // 🆕 NOVA EXTRAÇÃO: Priorizar preço PIX (maior desconto)
      let originalPrice = 0;
      let discountPrice = 0;
      const allPrices: number[] = [];

      // 1. Extrair TODOS os preços da página
      $("span.andes-money-amount__fraction").each((i, el) => {
        const priceText = $(el).text().trim().replace(/\./g, "");
        const price = parseInt(priceText) || 0;
        if (price > 0 && price < 10000) {
          allPrices.push(price);
          console.log(`   💵 Preço encontrado: R$ ${price}`);
        }
      });

      console.log("💰 Todos os preços encontrados:", allPrices);

      // 2. Identificar preço original (com class "previous" ou riscado)
      const previousPriceEl = $(
        "span.andes-money-amount--previous .andes-money-amount__fraction, " +
          "s .andes-money-amount__fraction"
      ).first();

      if (previousPriceEl.length > 0) {
        const priceText = previousPriceEl.text().trim().replace(/\./g, "");
        originalPrice = parseInt(priceText) || 0;
        console.log("💰 Preço original (riscado):", originalPrice);
      } else {
        originalPrice = Math.max(...allPrices);
        console.log("💰 Preço original (maior):", originalPrice);
      }

      // 3. 🆕 BUSCAR PREÇO PIX - Múltiplas estratégias
      let pixPrice = 0;

      // Estratégia 1: Buscar por atributo aria-label com "Pix"
      $('span[aria-label*="Pix"], div[aria-label*="Pix"]').each((i, el) => {
        const ariaLabel = $(el).attr("aria-label") || "";
        const match = ariaLabel.match(/(\d+)\s*reais/);
        if (match) {
          const price = parseInt(match[1]);
          if (price > 0 && price < originalPrice) {
            pixPrice = price;
            console.log("💳 Preço PIX (aria-label):", pixPrice);
          }
        }
      });

      // Estratégia 2: Buscar estrutura ui-pdp-price__second-line
      if (pixPrice === 0) {
        $(".ui-pdp-price__second-line .andes-money-amount__fraction").each(
          (i, el) => {
            const priceText = $(el).text().trim().replace(/\./g, "");
            const price = parseInt(priceText) || 0;
            if (price > 0 && price < originalPrice) {
              pixPrice = price;
              console.log("💳 Preço PIX (second-line):", pixPrice);
            }
          }
        );
      }

      // Estratégia 3: Buscar todos os preços menores que o original e pegar o menor
      if (pixPrice === 0) {
        const lowerPrices = allPrices
          .filter((p) => p < originalPrice && p > 0)
          .sort((a, b) => a - b);

        if (lowerPrices.length > 0) {
          pixPrice = lowerPrices[0]; // Menor preço = geralmente é o PIX
          console.log("💳 Preço PIX (menor preço):", pixPrice);
        }
      }

      // 4. Definir preço final
      if (pixPrice > 0) {
        discountPrice = pixPrice;
        console.log("✅ Usando preço PIX:", discountPrice);
      } else {
        const validPrices = allPrices.filter((p) => p < originalPrice && p > 0);
        discountPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
        console.log("⚠️ Usando menor preço disponível:", discountPrice);
      }

      // 5. Recalcular desconto real
      if (originalPrice > 0 && discountPrice > 0) {
        const realDiscount = Math.round(
          ((originalPrice - discountPrice) / originalPrice) * 100
        );
        discountPercentage = `${realDiscount}%`;
        console.log("🔥 Desconto recalculado:", discountPercentage);
      }

      console.log(
        "💰 RESULTADO FINAL - De: R$",
        originalPrice,
        "Por: R$",
        discountPrice,
        `(${discountPercentage})`
      );

      // Montar objeto de retorno
      // Extrair imagem principal (a maior imagem do produto)
      let imageUrl = "";

      // Prioridade 1: Imagem PhotoSwipe (pswp_img) - melhor qualidade
      const pswpImg = $("img.pswp_img").first();
      const pswpSrc = pswpImg.attr("src") || pswpImg.attr("data-src");

      // Prioridade 2: Imagem da galeria principal
      const galleryImg =
        $("figure.ui-pdp-gallery__figure img, .ui-pdp-gallery img")
          .first()
          .attr("data-src") ||
        $("figure.ui-pdp-gallery__figure img, .ui-pdp-gallery img")
          .first()
          .attr("src");

      // Prioridade 3: Imagem do produto direto
      const productImg = $("img.ui-pdp-image").first().attr("src");

      // Prioridade 4: Meta tag Open Graph
      const ogImage = $('meta[property="og:image"]').attr("content");

      imageUrl = pswpSrc || galleryImg || productImg || ogImage || "";

      // Remover imagens placeholder/loading (data:image)
      if (imageUrl && imageUrl.startsWith("data:image")) {
        const allImages = $("img[src*='mlstatic.com']").toArray();
        for (const img of allImages) {
          const src = $(img).attr("src");
          if (
            src &&
            !src.startsWith("data:image") &&
            src.includes("mlstatic.com")
          ) {
            imageUrl = src;
            break;
          }
        }
      }

      console.log("🖼️ Imagem capturada:", imageUrl);

      // Limpar e formatar valores
      title = title.replace(/\n/g, " ").trim();
      title = this.summarizeTitle(title);
      title = title.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");

      // Formatar preços
      const discountPriceStr = `R$ ${discountPrice}`;
      const originalPriceStr =
        originalPrice > 0 ? `R$ ${originalPrice}` : undefined;

      // Validar se extraiu dados mínimos
      if (!title || discountPrice === 0) {
        console.error("❌ Dados insuficientes extraídos do HTML");
        throw new Error("Não foi possível extrair dados mínimos do produto");
      }

      const productData: ProductData = {
        title,
        discountPrice: discountPriceStr,
        originalPrice: originalPriceStr,
        discountPercentage: discountPercentage || undefined,
        imageUrl: imageUrl || undefined,
        url,
      };

      console.log("✅ Scraping concluído:", productData);
      return productData;
    } catch (error: any) {
      if (error.response) {
        console.error("❌ Erro HTTP ao fazer scraping:", error.response.status);
      } else {
        console.error("❌ Erro ao fazer scraping:", error.message || error);
      }
      throw new Error(`Erro ao fazer scraping: ${error.message || error}`);
    }
  }

  /**
   * Normaliza o link de afiliado
   */
  normalizeAffiliateLink(url: string): string {
    return url.trim();
  }

  /**
   * Resume o título do produto mantendo apenas as informações principais
   * Exemplo: "Smartphone Motorola Moto G05 - 128GB 12GB (4GB RAM + 8GB Ram Boost)..."
   * -> "Smartphone Motorola Moto G05 128GB"
   */
  private summarizeTitle(title: string): string {
    // Remover traços e parênteses com detalhes extras
    let summarized = title
      .replace(/\s*-\s*/g, " ") // Removes hyphens
      .replace(/\([^)]*\)/g, "") // Removes content within parentheses
      .replace(/\s+/g, " ") // Removes multiple spaces
      .trim();

    // Extrair apenas: marca, modelo e capacidade principal
    // Padrão comum: "Tipo Marca Modelo Capacidade ..."
    const words = summarized.split(" ");
    const keywords: string[] = [];

    // Manter até 6 palavras principais
    for (let i = 0; i < words.length && keywords.length < 6; i++) {
      const word = words[i];

      // Ignorar palavras muito longas ou conectores
      if (
        word.length > 20 ||
        ["e", "com", "de", "da", "do"].includes(word.toLowerCase())
      ) {
        continue;
      }

      keywords.push(word);

      // Se encontrou capacidade (GB, TB), parar após próxima palavra
      if (/\d+(GB|TB|MB)/i.test(word)) {
        break;
      }
    }

    return keywords.join(" ");
  }
}

// Exportar instância singleton
const mercadoLivreScraper = new MercadoLivreScraper();
export default mercadoLivreScraper;
