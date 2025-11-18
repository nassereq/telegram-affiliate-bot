import { ProductData, Ad } from "../types";

/**
 * Formata os dados do produto em um anúncio para o Telegram
 */
export function formatProductAd(product: ProductData): Ad {
  const emoji = {
    title: "🛍️",
    originalPrice: "❌",
    discountPrice: "✨",
    discount: "🔥",
    coupon: "✔️",
    link: "🔗",
  };

  let text = `${emoji.title} ${product.title}\n\n`;

  // Adiciona preço original se existir
  if (product.originalPrice) {
    text += `De ${emoji.originalPrice} ${product.originalPrice}\n`;
  }

  // Preço com desconto
  text += `Por ${emoji.discountPrice} ${product.discountPrice}\n`;

  // Adiciona porcentagem de desconto se existir
  if (product.discountPercentage) {
    text += `\n${emoji.discount} ${product.discountPercentage} OFF\n`;
  }

  // Adiciona cupom se existir
  if (product.coupon) {
    text += `\n${emoji.coupon} CUPOM: ${product.coupon}`;
    
    // Adiciona desconto adicional do cupom se existir
    if (product.couponDiscount) {
      text += ` (+${product.couponDiscount}% de desconto)`;
    }
    
    text += `\n`;
  }

  // Link do produto
  text += `\n${emoji.link} ${product.url}`;

  return {
    text,
    imageUrl: product.imageUrl,
    parseMode: undefined, // Usa texto simples
  };
}

/**
 * Formata preço brasileiro
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

/**
 * Limpa e normaliza texto
 */
export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
