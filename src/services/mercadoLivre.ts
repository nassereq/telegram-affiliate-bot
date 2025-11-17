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

      // Extrair porcentagem de desconto PRIMEIRO (sempre correto)
      let discountPercentage = "";
      const discountElement = $("span.andes-money-amount__discount, [class*='discount']").first();
      const discountText = discountElement.text().trim();
      
      const percentMatch = discountText.match(/(\d+)%/);
      discountPercentage = percentMatch ? `${percentMatch[1]}%` : "";
      
      console.log("🔥 Desconto encontrado:", discountPercentage);

      // Extrair preços
      let discountPrice = "";
      let originalPrice = "";
      
      // Buscar todos os preços válidos na página
      const allPriceElements = $("span.andes-money-amount__fraction");
      const validPrices: string[] = [];
      
      allPriceElements.each((i, el) => {
        const price = $(el).text().trim();
        const numPrice = parseInt(price.replace(/\D/g, ""));
        // Aceitar qualquer preço válido (sem restrição de valor mínimo)
        if (price && price.length <= 6 && numPrice > 0) {
          validPrices.push(price);
        }
      });
      
      console.log("💵 Todos os preços válidos:", validPrices);
      
      if (discountPercentage && validPrices.length >= 2) {
        // Se tem desconto, primeiro preço é promocional, segundo ou maior é original
        discountPrice = validPrices[0];
        
        // Buscar preço riscado primeiro
        const strikedPrice = $("s span.andes-money-amount__fraction, s.andes-money-amount--previous .andes-money-amount__fraction").first().text().trim();
        if (strikedPrice && validPrices.includes(strikedPrice)) {
          originalPrice = strikedPrice;
        } else {
          // Pegar o maior preço que não seja o promocional
          const prices = validPrices.map(p => parseInt(p.replace(/\D/g, "")));
          const maxPrice = Math.max(...prices);
          originalPrice = validPrices.find(p => parseInt(p.replace(/\D/g, "")) === maxPrice && p !== discountPrice) || validPrices[1];
        }
      } else if (validPrices.length > 0) {
        // Sem desconto, pegar o primeiro preço válido
        discountPrice = validPrices[0];
      }
      
      console.log("💰 Preços finais - De:", originalPrice, "Por:", discountPrice);

      // Extrair imagem principal (a maior imagem do produto)
      let imageUrl = "";
      
      // Prioridade 1: Imagem da galeria principal (maior qualidade)
      const galleryImg = $("figure.ui-pdp-gallery__figure img, .ui-pdp-gallery img").first().attr("data-src") || 
                         $("figure.ui-pdp-gallery__figure img, .ui-pdp-gallery img").first().attr("src");
      
      // Prioridade 2: Imagem do produto direto
      const productImg = $("img.ui-pdp-image").first().attr("src");
      
      // Prioridade 3: Meta tag Open Graph
      const ogImage = $('meta[property="og:image"]').attr("content");
      
      imageUrl = galleryImg || productImg || ogImage || "";
      
      // Remover imagens placeholder/loading (data:image)
      if (imageUrl && imageUrl.startsWith("data:image")) {
        // Tentar pegar outra imagem válida
        const allImages = $("img[src*='mlstatic.com']").toArray();
        for (const img of allImages) {
          const src = $(img).attr("src");
          if (src && !src.startsWith("data:image") && src.includes("mlstatic.com")) {
            imageUrl = src;
            break;
          }
        }
      }
      
      console.log("🖼️ Imagem capturada:", imageUrl);

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
