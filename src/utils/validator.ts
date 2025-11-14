import { ProductData } from "../types";

/**
 * Valida se a URL é válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se os dados do produto estão completos
 */
export function isValidProductData(data: ProductData): boolean {
  if (!data.title || data.title.trim().length < 3) {
    return false;
  }

  if (!data.discountPrice || data.discountPrice.trim().length === 0) {
    return false;
  }

  if (!data.url || !isValidUrl(data.url)) {
    return false;
  }

  return true;
}

/**
 * Valida formato de preço brasileiro (R$ X,XX)
 */
export function isValidBrazilianPrice(price: string): boolean {
  const priceRegex = /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/;
  return priceRegex.test(price);
}

/**
 * Valida se o texto não está vazio
 */
export function isNotEmpty(text: string): boolean {
  return !!(text && text.trim().length > 0);
}
