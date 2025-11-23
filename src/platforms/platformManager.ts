import { PlatformDetector } from "./IPlatformScraper";
import mercadoLivreScraper from "./mercadolivre/scraper";
import amazonScraper from "./amazon/scraper";
import { ProductData } from "../types";

/**
 * Gerenciador central de plataformas de e-commerce
 */
class PlatformManager {
  private detector: PlatformDetector;

  constructor() {
    this.detector = new PlatformDetector();
    this.registerPlatforms();
  }

  /**
   * Registra todas as plataformas suportadas
   */
  private registerPlatforms(): void {
    this.detector.registerScraper(mercadoLivreScraper);
    this.detector.registerScraper(amazonScraper);

    console.log(
      `🌐 Plataformas registradas: ${this.getSupportedPlatforms().join(", ")}`
    );
  }

  /**
   * Detecta a plataforma e faz scraping do produto
   */
  async scrapeProduct(
    url: string
  ): Promise<ProductData & { platform: string }> {
    const scraper = this.detector.detectPlatform(url);

    if (!scraper) {
      const supported = this.getSupportedPlatforms().join(", ");
      throw new Error(
        `❌ Plataforma não suportada!\n\n` +
          `Plataformas disponíveis: ${supported}\n` +
          `URL fornecida: ${url}`
      );
    }

    console.log(`🏪 Plataforma detectada: ${scraper.platformName}`);

    const productData = await scraper.scrapeProductDetails(url);

    return {
      ...productData,
      platform: scraper.platformName,
    };
  }

  /**
   * Lista plataformas suportadas
   */
  getSupportedPlatforms(): string[] {
    return this.detector.getSupportedPlatforms();
  }

  /**
   * Verifica se URL é válida para alguma plataforma
   */
  isValidUrl(url: string): boolean {
    return this.detector.detectPlatform(url) !== null;
  }
}

// Exportar instância singleton
const platformManager = new PlatformManager();
export default platformManager;
