import { ProductData } from "../types";

/**
 * Interface para scrapers de plataformas de e-commerce
 */
export interface IPlatformScraper {
  /**
   * Nome da plataforma
   */
  readonly platformName: string;

  /**
   * Verifica se a URL pertence a esta plataforma
   */
  isValidUrl(url: string): boolean;

  /**
   * Extrai dados do produto da URL
   */
  scrapeProductDetails(url: string): Promise<ProductData>;
}

/**
 * Detector de plataforma - identifica qual scraper usar
 */
export class PlatformDetector {
  private scrapers: IPlatformScraper[] = [];

  registerScraper(scraper: IPlatformScraper): void {
    this.scrapers.push(scraper);
  }

  detectPlatform(url: string): IPlatformScraper | null {
    for (const scraper of this.scrapers) {
      if (scraper.isValidUrl(url)) {
        return scraper;
      }
    }
    return null;
  }

  getSupportedPlatforms(): string[] {
    return this.scrapers.map((s) => s.platformName);
  }
}
