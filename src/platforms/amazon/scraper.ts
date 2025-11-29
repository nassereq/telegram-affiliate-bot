import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { IPlatformScraper } from "../IPlatformScraper";
import { ProductData } from "../../types";

export class AmazonScraper implements IPlatformScraper {
  readonly platformName = "Amazon";

  isValidUrl(url: string): boolean {
    const patterns = [/amazon\.com\.br/, /amazon\.com/, /amzn\.to/, /a\.co/];
    return patterns.some((pattern) => pattern.test(url));
  }

  async scrapeProductDetails(url: string): Promise<ProductData> {
    try {
      console.log(
        `\n🔍 [${this.platformName}] Iniciando scraping da URL:`,
        url
      );

      // Fazer requisição HTTP
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
      console.log("📄 HTML salvo em:", debugPath);

      // Extrair título
      let title =
        $("#productTitle").text().trim() ||
        $('[id="title"]').text().trim() ||
        $("h1").first().text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        "";

      title = title.replace(/\n/g, " ").trim();
      console.log("📝 Título encontrado:", title);

      // 💰 EXTRAIR PREÇO ORIGINAL (De:) - buscar novo seletor
      let originalPrice = "";

      console.log("\n🔍 Procurando preço original (De:)...");
      const dePriceElement = $("span.a-size-small.aok-offscreen").first();
      if (dePriceElement.length > 0) {
        const priceText = dePriceElement.text().trim();
        const match = priceText.match(/R\$\s*([\d.,]+)/);
        if (match) {
          originalPrice = `R$ ${match[1].replace(/\./g, "").split(",")[0]}`;
          console.log(`💰 Preço original encontrado (De:): ${originalPrice}`);
        } else {
          console.log(
            "⚠️ Texto encontrado para 'De:', mas não contém um preço válido:",
            priceText
          );
        }
      } else {
        console.log(
          "⚠️ Nenhum elemento encontrado para o preço 'De:' usando o novo seletor."
        );
      }

      // 💵 EXTRAIR PREÇO COM DESCONTO (Por:) - buscar displayPrice
      let discountPrice = "";
      console.log("\n🔍 Procurando preço com desconto (Por:)...");
      const displayPriceMatch = html.match(/"displayPrice":"R\$\s*([\d.,]+)/);
      if (displayPriceMatch) {
        discountPrice = `R$ ${
          displayPriceMatch[1].replace(/\./g, "").split(",")[0]
        }`;
        console.log(
          `💵 Preço com desconto encontrado (displayPrice): ${discountPrice}`
        );
      } else {
        console.log(
          "⚠️ Nenhuma correspondência encontrada para 'displayPrice' no HTML."
        );
      }

      // 🔥 EXTRAIR DESCONTO (OFF) - savingsPercentage
      let discountPercentage = "";
      const savingsElement = $(".savingsPercentage").first();
      if (savingsElement.length > 0) {
        const savingsText = savingsElement.text().trim();
        const match = savingsText.match(/(\d+)%/);
        if (match) {
          discountPercentage = `${match[1]}%`;
          console.log("🔥 Desconto encontrado:", discountPercentage);
        }
      }

      // 🧮 CALCULAR DESCONTO se não foi encontrado mas temos os preços
      if (!discountPercentage && originalPrice && discountPrice) {
        console.log(
          "\n🧮 Desconto não encontrado. Calculando a partir dos preços..."
        );
        const origValue = parseFloat(originalPrice.replace(/[^\d]/g, ""));
        const discValue = parseFloat(discountPrice.replace(/[^\d]/g, ""));

        if (origValue > 0 && discValue > 0 && origValue > discValue) {
          const calculatedDiscount = Math.round(
            ((origValue - discValue) / origValue) * 100
          );
          discountPercentage = `${calculatedDiscount}%`;
          console.log(
            `🔥 Desconto calculado: ${discountPercentage} (De: R$ ${origValue} → Por: R$ ${discValue})`
          );
        } else {
          console.log(
            "⚠️ Não foi possível calcular o desconto. Valores inválidos ou preço 'Por' maior que 'De'."
          );
        }
      }

      // Validar preços matematicamente
      if (originalPrice && discountPrice && discountPercentage) {
        const origValue = parseFloat(originalPrice.replace(/[^\d]/g, ""));
        const discValue = parseFloat(discountPrice.replace(/[^\d]/g, ""));
        const discPerc = parseFloat(discountPercentage.replace("%", ""));

        const expectedPrice = origValue * (1 - discPerc / 100);
        const difference = Math.abs(expectedPrice - discValue);
        const tolerance = discValue * 0.05;

        console.log("\n🧮 Validação matemática:");
        console.log(`  Original: R$ ${origValue}`);
        console.log(`  Desconto: ${discPerc}%`);
        console.log(`  Esperado: R$ ${expectedPrice.toFixed(2)}`);
        console.log(`  Encontrado: R$ ${discValue}`);
        console.log(
          `  Diferença: R$ ${difference.toFixed(
            2
          )} (tolerância: R$ ${tolerance.toFixed(2)})`
        );
        console.log(`  ✓ Válido: ${difference <= tolerance ? "SIM" : "NÃO"}`);
      }

      // Extrair imagem
      let imageUrl =
        $("#landingImage").attr("src") ||
        $("#imgBlkFront").attr("src") ||
        $('meta[property="og:image"]').attr("content") ||
        "";

      console.log("🖼️ Imagem encontrada:", imageUrl);

      // Resumir título (máximo 6 palavras)
      const words = title.split(/\s+/);
      const shortTitle = words.slice(0, 6).join(" ");

      const productData: ProductData = {
        title: shortTitle,
        discountPrice,
        originalPrice,
        discountPercentage,
        imageUrl: imageUrl || undefined,
        url,
      };

      console.log("\n✅ Scraping da Amazon concluído:", productData);
      return productData;
    } catch (error: any) {
      console.error(
        `\n❌ [${this.platformName}] Erro ao fazer scraping:`,
        error.message
      );
      throw new Error(`Erro ao fazer scraping da Amazon: ${error.message}`);
    }
  }
}

export default new AmazonScraper();
