import axios from "axios";
import * as cheerio from "cheerio";
import { ProductData } from "../../types";
import { IPlatformScraper } from "../IPlatformScraper";
import * as fs from "fs";
import * as path from "path";
import puppeteer, { Browser, Page } from "puppeteer";

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
   * - https://www.mercadolivre.com.br/.../p/MLB22504037 -> MLB22504037
   */
  extractProductId(url: string): string | null {
    const patterns = [
      /\/p\/(MLB\d+)/i, // /p/MLB22504037
      /MLB-?\d+/i, // MLB-123456 ou MLB123456
      /MLA-?\d+/i, // MLA-123456
      /\/sec\/([A-Za-z0-9]+)/, // /sec/1AMQzEa
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
   * 🆕 ESTRATÉGIA: Apenas Puppeteer (API não está funcionando)
   * Extrai todos os dados diretamente da página com Puppeteer
   */
  async scrapeProductDetails(url: string): Promise<ProductData> {
    let browser;
    try {
      console.log("🔍 Iniciando scraping da URL:", url);

      // 1️⃣ ABRIR NAVEGADOR E NAVEGAR
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // 2️⃣ VERIFICAR SE É PÁGINA DE PERFIL AFILIADO
      let finalUrl = page.url();
      console.log("🔗 URL inicial:", url);
      console.log("🔗 URL atual:", finalUrl);

      if (finalUrl.includes("/social/") || finalUrl.includes("/sec/")) {
        console.log("⚠️ Página de perfil/afiliado detectada, buscando link do produto...");
        
        await page.waitForSelector('a[href*="/p/MLB"], a[href*="MLB"]', { timeout: 5000 });
        
        const productLink = await page.evaluate(() => {
          const link = 
            // @ts-ignore
            document.querySelector('a[href*="/p/MLB"]') ||
            // @ts-ignore
            document.querySelector('a[href*="MLB"]');
          return link ? link.href : null;
        });

        if (productLink) {
          console.log("✅ Link do produto encontrado:", productLink);
          await page.goto(productLink.split('#')[0].split('?')[0], {
            waitUntil: "networkidle2",
            timeout: 30000,
          });
          finalUrl = page.url();
          console.log("🔗 Navegando para produto:", finalUrl);
        }
      }

      // 3️⃣ AGUARDAR ELEMENTOS CARREGAREM
      await page.waitForSelector(".andes-money-amount__fraction", {
        timeout: 10000,
      });
      await page.waitForTimeout(2000);

      // 4️⃣ EXTRAIR DADOS DA PÁGINA
      const productData = await page.evaluate(() => {
        // Título
        const titleEl = 
          // @ts-ignore
          document.querySelector("h1.ui-pdp-title") ||
          // @ts-ignore
          document.querySelector('[class*="ui-pdp-title"]');
        const title = titleEl ? titleEl.textContent.trim() : "";

        // Preço original (riscado)
        const originalPriceEl = 
          // @ts-ignore
          document.querySelector("s .andes-money-amount__fraction") ||
          // @ts-ignore
          document.querySelector(".andes-money-amount--previous .andes-money-amount__fraction");
        const originalPrice = originalPriceEl 
          ? parseInt(originalPriceEl.textContent.replace(/\D/g, "")) 
          : 0;

        // BUSCAR PREÇOS APENAS NO CONTAINER DO PRODUTO (não recomendações)
        const mainContainer = 
          // @ts-ignore
          document.querySelector(".ui-pdp-container") ||
          // @ts-ignore
          document.querySelector(".ui-pdp-price") ||
          // @ts-ignore
          document.querySelector("main");
        
        const prices: number[] = [];
        
        if (mainContainer) {
          // @ts-ignore
          const priceElements = mainContainer.querySelectorAll("span.andes-money-amount");
          
          priceElements.forEach((el: any) => {
            const ariaLabel = el.getAttribute("aria-label") || "";
            const match = ariaLabel.match(/(\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?/i);
            
            if (match && !el.classList.contains("andes-money-amount--previous")) {
              const reais = parseInt(match[1]);
              const centavos = match[2] ? parseInt(match[2]) : 0;
              const price = reais + centavos / 100;
              if (price >= 10) {
                prices.push(price);
              }
            }
          });
        }

        // Preço PIX = menor preço do container principal
        const pixPrice = prices.length > 0 ? Math.min(...prices) : 0;

        // Desconto
        // @ts-ignore
        const discountEl = document.querySelector(".andes-money-amount__discount");
        const discountText = discountEl ? discountEl.textContent : "";
        const discountMatch = discountText.match(/(\d+)%/);
        const discount = discountMatch ? parseInt(discountMatch[1]) : 0;

        // Imagem
        const imgEl = 
          // @ts-ignore
          document.querySelector("img.ui-pdp-image") ||
          // @ts-ignore
          document.querySelector(".ui-pdp-gallery img") ||
          // @ts-ignore
          document.querySelector("img[src*='mlstatic']");
        const imageUrl = imgEl ? imgEl.src : "";

        return {
          title,
          originalPrice,
          pixPrice,
          discount,
          imageUrl,
          allPrices: prices,
        };
      });

      console.log("📊 Dados extraídos:", productData);

      // 5️⃣ VALIDAR E FORMATAR
      if (!productData.title || productData.pixPrice === 0) {
        throw new Error("Não foi possível extrair dados mínimos do produto");
      }

      // Recalcular desconto se necessário
      let discountPercentage = productData.discount;
      if (productData.originalPrice > 0 && productData.pixPrice > 0) {
        discountPercentage = Math.round(
          ((productData.originalPrice - productData.pixPrice) / productData.originalPrice) * 100
        );
      }

      console.log("💰 Preço original:", productData.originalPrice);
      console.log("💳 Preço PIX:", productData.pixPrice);
      console.log("🔥 Desconto:", discountPercentage + "%");

      const result: ProductData = {
        title: this.summarizeTitle(productData.title),
        originalPrice:
          productData.originalPrice > 0
            ? `R$ ${productData.originalPrice.toFixed(2)}`
            : undefined,
        discountPrice: `R$ ${productData.pixPrice.toFixed(2)}`,
        discountPercentage:
          discountPercentage > 0 ? `${discountPercentage}%` : undefined,
        imageUrl: productData.imageUrl || undefined,
        url: finalUrl,
      };

      console.log("✅ Scraping concluído:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Erro ao fazer scraping:", error.message);
      throw new Error(`Erro ao fazer scraping: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 🌐 Busca dados do produto na API oficial do Mercado Livre
   */
  private async fetchProductFromAPI(productId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/items/${productId}`);
      console.log("✅ Dados obtidos da API");
      return response.data;
    } catch (error: any) {
      console.error("❌ Erro na API:", error.message);
      throw new Error(`API falhou: ${error.message}`);
    }
  }

  /**
   * 💳 Busca APENAS o preço PIX usando Puppeteer (mais rápido)
   */
  private async fetchPixPriceWithPuppeteer(
    productUrl: string
  ): Promise<number | null> {
    let browser;
    try {
      console.log("🔍 Buscando preço PIX com Puppeteer...");

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );

      await page.goto(productUrl, {
        waitUntil: "networkidle2",
        timeout: 15000,
      });

      // Aguardar preços carregarem
      await page.waitForSelector(".andes-money-amount__fraction", {
        timeout: 5000,
      });

      // EXTRAIR TODOS OS PREÇOS (com centavos)
      const prices: number[] = await page.evaluate(() => {
        const priceElements = Array.from(
          // @ts-ignore
          document.querySelectorAll("span.andes-money-amount")
        );

        const validPrices: number[] = [];
        priceElements.forEach((el: any) => {
          const ariaLabel = el.getAttribute("aria-label") || "";
          const match = ariaLabel.match(
            /(\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?/i
          );

          if (match) {
            const reais = parseInt(match[1]);
            const centavos = match[2] ? parseInt(match[2]) : 0;
            const price = reais + centavos / 100;
            if (price > 10) {
              validPrices.push(price);
            }
          }
        });

        return validPrices;
      });

      console.log("💰 Preços encontrados:", prices);

      if (prices.length === 0) {
        console.log("⚠️ Nenhum preço encontrado com Puppeteer");
        return null;
      }

      // MENOR PREÇO = PIX
      const pixPrice = Math.min(...prices);
      console.log("💳 Preço PIX selecionado:", pixPrice);

      return pixPrice;
    } catch (error: any) {
      console.error("⚠️ Erro ao buscar preço PIX:", error.message);
      return null; // Fallback: usar preço da API
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 🔗 Extrai ID do produto seguindo redirects com Puppeteer
   */
  private async extractProductIdFromRedirect(
    url: string
  ): Promise<string | null> {
    let browser;
    try {
      console.log("🌐 Abrindo navegador para seguir redirect...");
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );

      // Navegar e aguardar carregamento completo
      await page.goto(url, { 
        waitUntil: "networkidle2", 
        timeout: 30000 
      });
      
      // Aguardar mais tempo para JavaScript executar redirect
      await page.waitForTimeout(3000);

      const finalUrl = page.url();
      console.log("🔗 URL após navegação:", finalUrl);
      
      // Se continua sendo /sec/, tentar extrair link do produto da página
      if (finalUrl.includes("/sec/") || finalUrl.includes("/social/")) {
        console.log("⚠️ Ainda em página intermediária, buscando link do produto...");
        
        // Tentar encontrar link do produto
        const productLink = await page.evaluate(() => {
          const link = 
            // @ts-ignore
            document.querySelector('a[href*="/p/MLB"]') ||
            // @ts-ignore
            document.querySelector('a[href*="MLB"]');
          return link ? link.href : null;
        });
        
        if (productLink) {
          console.log("✅ Link do produto encontrado:", productLink);
          return this.extractProductId(productLink);
        }
      }

      return this.extractProductId(finalUrl);
    } catch (error: any) {
      console.error("❌ Erro ao seguir redirect:", error.message);
      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
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
