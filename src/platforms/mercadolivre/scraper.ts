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

      // 🆕 NOVA EXTRAÇÃO: Usar estrutura correta do Mercado Livre
      let originalPrice = 0;
      let discountPrice = 0;

      // 1. Preço anterior (original) - "previous price"
      const previousPriceEl = $(
        '[class*="previous"], [class*="andes-money-amount--previous"]'
      )
        .find("span.andes-money-amount__fraction")
        .first();

      if (previousPriceEl.length > 0) {
        const priceText = previousPriceEl.text().trim().replace(/\./g, "");
        originalPrice = parseInt(priceText) || 0;
        console.log("💰 Preço anterior (previous):", originalPrice);
      }

      // 2. Preço atual (com desconto) - "current price"
      const currentPriceEl = $(
        '[class*="current"], [class*="andes-money-amount--current"]'
      )
        .find("span.andes-money-amount__fraction")
        .first();

      if (currentPriceEl.length > 0) {
        const priceText = currentPriceEl.text().trim().replace(/\./g, "");
        discountPrice = parseInt(priceText) || 0;
        console.log("💵 Preço atual (current):", discountPrice);
      }

      // 3. Fallback: buscar pelo contexto do desconto
      if (originalPrice === 0 || discountPrice === 0) {
        console.log("⚠️ Tentando extração alternativa por contexto...");

        const discountParent = discountElement.parent().parent();
        const pricesNearDiscount = discountParent.find(
          "span.andes-money-amount__fraction"
        );

        if (pricesNearDiscount.length >= 2) {
          const p1 =
            parseInt(
              $(pricesNearDiscount[0]).text().trim().replace(/\./g, "")
            ) || 0;
          const p2 =
            parseInt(
              $(pricesNearDiscount[1]).text().trim().replace(/\./g, "")
            ) || 0;

          originalPrice = Math.max(p1, p2);
          discountPrice = Math.min(p1, p2);

          console.log(
            "💰 Extraído por contexto - Original:",
            originalPrice,
            "Desconto:",
            discountPrice
          );
        }
      }

      // 4. Validação matemática
      if (originalPrice > 0 && discountPrice > 0 && discountPercent > 0) {
        const isValid = this.validatePrices(
          originalPrice,
          discountPrice,
          discountPercent
        );
        console.log(
          isValid
            ? "✅ Preços validados!"
            : "⚠️ Preços não batem matematicamente"
        );
      }

      console.log(
        "💰 Preços finais - De: R$",
        originalPrice,
        "Por: R$",
        discountPrice
      );

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
