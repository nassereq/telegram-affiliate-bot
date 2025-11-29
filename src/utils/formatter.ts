import { ProductData, Ad } from "../types";

/**
 * Detecta a categoria do produto com base no título e retorna o emoji apropriado
 */
export function getCategoryEmoji(
  title: string,
  alternativeMode: boolean = false
): string {
  const titleLower = title.toLowerCase();

  // Mapeamento de palavras-chave para emojis (com alternativas)
  const categories: {
    [key: string]: { keywords: string[]; emoji: string; alt: string };
  } = {
    tenis: {
      keywords: [
        "tenis",
        "tênis",
        "sapato",
        "chinelo",
        "sandalia",
        "sandália",
        "bota",
        "calçado",
      ],
      emoji: "👟",
      alt: "👠",
    },
    cafe: {
      keywords: ["café", "cafe", "nescafe", "nescafé"],
      emoji: "☕️",
      alt: "🍵",
    },
    eletronicos: {
      keywords: [
        "celular",
        "smartphone",
        "fone",
        "headphone",
        "tablet",
        "notebook",
        "computador",
        "mouse",
        "teclado",
        "monitor",
      ],
      emoji: "📱",
      alt: "💻",
    },
    cozinha: {
      keywords: [
        "panela",
        "frigideira",
        "jogo de panelas",
        "utensílio",
        "cozinha",
      ],
      emoji: "🍳",
      alt: "🍽️",
    },
    livros: { keywords: ["livro", "revista", "gibi"], emoji: "📚", alt: "📖" },
    roupas: {
      keywords: [
        "camisa",
        "camiseta",
        "blusa",
        "calça",
        "short",
        "vestido",
        "saia",
        "jaqueta",
      ],
      emoji: "👕",
      alt: "👔",
    },
    perfume: {
      keywords: [
        "perfume",
        "colônia",
        "fragrância",
        "cosmético",
        "cosméticos",
        "shampoo",
        "condicionador",
        "creme",
        "maquiagem",
        "hidratante",
        "sabonete",
      ],
      emoji: "🧴",
      alt: "✨",
    },
    casa: {
      keywords: [
        "toalha",
        "lençol",
        "edredom",
        "travesseiro",
        "cortina",
        "tapete",
        "almofada",
      ],
      emoji: "🏠",
      alt: "🛋️",
    },
    esporte: {
      keywords: ["bola", "academia", "fitness", "treino", "musculação", "yoga"],
      emoji: "⚽️",
      alt: "🏋️",
    },
    brinquedos: {
      keywords: ["brinquedo", "boneca", "carrinho", "jogo", "lego"],
      emoji: "🎮",
      alt: "🧸",
    },
    alimentos: {
      keywords: ["chocolate", "biscoito", "doce", "snack", "cereal"],
      emoji: "🍫",
      alt: "🍪",
    },
    ferramentas: {
      keywords: [
        "parafusadeira",
        "furadeira",
        "chave",
        "martelo",
        "ferramenta",
        "kit ferramentas",
      ],
      emoji: "🔧",
      alt: "🛠️",
    },
    cama: {
      keywords: ["cabeceira", "cama", "colchão", "box"],
      emoji: "🛏️",
      alt: "🛌",
    },
    relogio: {
      keywords: ["relógio", "relogio", "smartwatch"],
      emoji: "⌚️",
      alt: "⏰",
    },
    bolsa: {
      keywords: ["bolsa", "mochila", "carteira"],
      emoji: "👜",
      alt: "🎒",
    },
    oculos: {
      keywords: ["óculos", "oculos", "óculos de sol"],
      emoji: "🕶️",
      alt: "👓",
    },
  };

  // Verifica cada categoria
  for (const [, category] of Object.entries(categories)) {
    for (const keyword of category.keywords) {
      if (titleLower.includes(keyword)) {
        return alternativeMode ? category.alt : category.emoji;
      }
    }
  }

  // Emoji padrão se não encontrar categoria
  return alternativeMode ? "🎁" : "🛍️";
}

/**
 * Formata os dados do produto em um anúncio para o Telegram
 */
export function formatProductAd(
  product: ProductData,
  customEmoji?: string
): Ad {
  const emoji = {
    title: customEmoji || getCategoryEmoji(product.title),
    originalPrice: "❌",
    discountPrice: "✨",
    discount: "🔥",
    coupon: "✔️",
    link: "🔗",
    flash: "☄️",
  };

  let text = "";

  // Adiciona cabeçalho de oferta relâmpago se aplicável
  if (product.isFlashDeal) {
    text += `${emoji.flash} OFERTA RELÂMPAGO!!!\n\n`;
  }

  text += `${emoji.title} ${product.title}\n\n`;

  // Adiciona preço original se existir
  if (product.originalPrice) {
    text += `De ${emoji.originalPrice} ${product.originalPrice}\n`;
  }

  // Preço com desconto e OFF na mesma linha
  text += `Por ${emoji.discountPrice} ${product.discountPrice}`;

  if (product.discountPercentage) {
    text += ` (${product.discountPercentage} OFF)`;
  }

  text += `\n`;

  // Adiciona cupom e preço final se existir
  if (product.coupon) {
    // Se tem desconto adicional, mostra o preço final
    if (product.couponDiscount) {
      // Calcular preço final com cupom
      const currentPrice = parseFloat(
        product.discountPrice.replace(/[^\d,]/g, "").replace(",", ".")
      );
      const discountPercent = parseFloat(product.couponDiscount);
      const finalPrice = currentPrice * (1 - discountPercent / 100);
      const finalPriceFormatted = `R$ ${Math.floor(finalPrice)}`;

      text += `+ Cupom ${emoji.discount} ${finalPriceFormatted}\n`;
    }

    text += `\n${emoji.coupon} CUPOM: ${product.coupon}\n`;

    // Adiciona valor mínimo em linha separada se existir
    if (product.couponMinValue) {
      text += ` Para compras acima de R$${product.couponMinValue}\n`;
    }
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
