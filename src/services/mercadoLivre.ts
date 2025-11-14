import axios from "axios";
import * as cheerio from "cheerio";
import { ProductData } from "../types";

export interface ProductDetails {
  title: string;
  originalPrice?: string;
  discountPrice: string;
  discountPercentage?: string;
  imageUrl?: string;
  url?: string;
}

export class MercadoLivreService {
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
      console.error("Erro ao buscar produto:", error.message);
      return null;
    }
  }

  /**
   * Valida se uma URL é do Mercado Livre
   */
  isValidMercadoLivreUrl(url: string): boolean {
    const domains = [
      "mercadolivre.com",
      "mercadolibre.com",
      "mercadolivr.com",
      "produto.mercadolivre.com.br",
    ];

    return domains.some((domain) => url.includes(domain));
  }

  /**
   * Faz scraping da página do produto para extrair informações
   */
  async scrapeProductDetails(url: string): Promise<ProductDetails | null> {
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
      const $ = cheerio.load(html);

      // Extrair título
      let title =
        $("h1.ui-pdp-title").text().trim() ||
        $('[class*="ui-pdp-title"]').text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        "";

      // Extrair todos os preços da página
      const allPrices = $("span.andes-money-amount__fraction")
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(price => price && price.length <= 6 && parseInt(price.replace(/\D/g, "")) >= 100); // Preços >= R$ 100

      console.log("📊 Preços encontrados:", allPrices);

      // Extrair preço com desconto (preço atual)
      let discountPrice = "";
      
      // Buscar especificamente o preço principal (maior destaque na página)
      const mainPrice = $(".ui-pdp-price__main-container span.andes-money-amount__fraction").first().text().trim();
      
      if (mainPrice && parseInt(mainPrice.replace(/\D/g, "")) >= 100) {
        discountPrice = mainPrice;
      } else if (allPrices.length > 0) {
        // Fallback: pegar o menor preço válido (>= 100)
        const prices = allPrices.map(p => parseInt(p.replace(/\D/g, "")));
        const minPrice = Math.min(...prices);
        discountPrice = allPrices.find(p => parseInt(p.replace(/\D/g, "")) === minPrice) || allPrices[0];
      }

      // Extrair preço original (se houver)
      let originalPrice = "";
      
      // Tentar buscar preço riscado primeiro
      const strikedPrice = $("s span.andes-money-amount__fraction, s.andes-money-amount--previous .andes-money-amount__fraction").first().text().trim();
      
      if (strikedPrice && strikedPrice.length <= 6 && parseInt(strikedPrice.replace(/\D/g, "")) >= 100) {
        // Preço válido (até 6 dígitos e >= R$ 100)
        originalPrice = strikedPrice;
      } else if (allPrices.length >= 2) {
        // Se múltiplos preços, o maior é o original
        const prices = allPrices.map(p => parseInt(p.replace(/\D/g, "")));
        const maxPrice = Math.max(...prices);
        originalPrice = allPrices.find(p => parseInt(p.replace(/\D/g, "")) === maxPrice) || "";
      }

      // Extrair porcentagem de desconto
      let discountPercentage =
        $("span.andes-money-amount__discount").text().trim() ||
        $('[class*="discount"]').first().text().trim() ||
        "";
      
      // Extrair apenas o primeiro número seguido de % (ex: "42% OFF no Pix..." -> "42%")
      const percentMatch = discountPercentage.match(/(\d+)%/);
      discountPercentage = percentMatch ? `${percentMatch[1]}%` : "";
      
      // Remover se não encontrou porcentagem válida
      if (!discountPercentage || discountPercentage === "0%") {
        discountPercentage = "";
      }

      // Extrair imagem principal
      let imageUrl =
        $("figure.ui-pdp-gallery__figure img").first().attr("src") ||
        $("img.ui-pdp-image").first().attr("src") ||
        $('meta[property="og:image"]').attr("content") ||
        "";

      // Limpar e formatar valores
      title = title.replace(/\n/g, " ").trim();
      
      // Resumir título: extrair principais características
      // Exemplo: "Smartphone Motorola Moto G05 - 128GB 12GB (...)" -> "Smartphone Motorola Moto G05 128GB"
      title = this.summarizeTitle(title);
      
      // Escapar caracteres especiais do Markdown
      title = title.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
      discountPrice = discountPrice.replace(/\./g, "");
      originalPrice = originalPrice.replace(/\./g, "");

      // Adicionar "R$" se não tiver
      if (discountPrice && !discountPrice.includes("R$")) {
        discountPrice = `R$ ${discountPrice}`;
      }
      if (originalPrice && !originalPrice.includes("R$")) {
        originalPrice = `R$ ${originalPrice}`;
      }

      // Validar se extraiu dados mínimos
      if (!title || !discountPrice) {
        console.error("❌ Dados insuficientes extraídos do HTML");
        return null;
      }

      const productDetails: ProductDetails = {
        title,
        discountPrice,
        originalPrice: originalPrice || undefined,
        discountPercentage: discountPercentage || undefined,
        imageUrl: imageUrl || undefined,
        url,
      };

      console.log("✅ Scraping concluído:", productDetails);
      return productDetails;
    } catch (error: any) {
      if (error.response) {
        console.error("❌ Erro HTTP ao fazer scraping:", error.response.status);
      } else {
        console.error("❌ Erro ao fazer scraping:", error.message || error);
      }
      return null;
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
      .replace(/\s*-\s*/g, " ") // Remove traços
      .replace(/\([^)]*\)/g, "") // Remove conteúdo entre parênteses
      .replace(/\s+/g, " ") // Remove espaços múltiplos
      .trim();

    // Extrair apenas: marca, modelo e capacidade principal
    // Padrão comum: "Tipo Marca Modelo Capacidade ..."
    const words = summarized.split(" ");
    const keywords: string[] = [];

    // Manter até 6 palavras principais
    for (let i = 0; i < words.length && keywords.length < 6; i++) {
      const word = words[i];
      
      // Ignorar palavras muito longas ou conectores
      if (word.length > 20 || ["e", "com", "de", "da", "do"].includes(word.toLowerCase())) {
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

export default new MercadoLivreService();
