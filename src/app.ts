import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import telegramService from "./services/telegram";
import ImageAnalyzer from "./services/imageAnalysis";
import platformManager from "./platforms/platformManager";
import sessionManager from "./utils/sessionManager";
import { formatProductAd } from "./utils/formatter";
import { isValidProductData, isValidUrl } from "./utils/validator";
import { APP_CONFIG, validateConfig } from "./config/config";

// Valida configuração antes de iniciar
try {
  validateConfig();
} catch (error: any) {
  console.error("❌ Erro de configuração:", error.message);
  console.error("📝 Verifique o arquivo .env");
  process.exit(1);
}

const bot = telegramService.getBot();
const imageAnalyzer = new ImageAnalyzer();

// 🔒 Lista de usuários autorizados (User IDs do Telegram)
const AUTHORIZED_USERS = [
  "VovoVania", // @VovoVania
  // Adicione os User IDs numéricos aqui após obter com /getid
];

// Middleware de autorização
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const chatType = ctx.chat?.type;

  // Permitir mensagens em canais sem verificação (o bot precisa poder postar)
  if (chatType === "channel") {
    return next();
  }

  // Verificar se o usuário está autorizado (apenas em conversas privadas/grupos)
  const isAuthorized =
    (username && AUTHORIZED_USERS.includes(username)) ||
    (userId && AUTHORIZED_USERS.includes(userId.toString()));

  if (!isAuthorized) {
    console.log(
      `🚫 Acesso negado - User: ${username || userId} (Chat: ${chatType})`
    );
    // NÃO envia mensagem de bloqueio para não poluir o canal
    return; // Não prossegue para os próximos handlers
  }

  // Usuário autorizado, continuar
  return next();
});

// Comando /getid - Para descobrir o User ID
bot.command("getid", (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;

  ctx.reply(
    `👤 *Suas informações:*\n\n` +
      `🆔 User ID: \`${userId}\`\n` +
      `👤 Username: ${username ? `@${username}` : "Não definido"}\n` +
      `📛 Nome: ${firstName || "Não definido"}\n\n` +
      `💬 *Informações do Chat:*\n` +
      `🆔 Chat ID: \`${chatId}\`\n` +
      `📂 Tipo: ${chatType}`,
    { parse_mode: "Markdown" }
  );
});

// Comando /start e /s (atalho)
const startHandler = (ctx: Context) => {
  const userId = ctx.from?.id;
  if (userId) {
    sessionManager.startSession(userId);
  }

  const platforms = platformManager.getSupportedPlatforms().join(", ");

  ctx.reply(
    "👋 *Bem-vindo ao Bot de Anúncios Multi-Plataforma!*\n\n" +
      "📝 *Como usar:*\n\n" +
      "1️⃣ Envie o *link de afiliado* do produto\n" +
      "2️⃣ O bot fará scraping e postará automaticamente!\n\n" +
      `🏪 *Plataformas suportadas:* ${platforms}\n\n` +
      "💡 Use /cancelar para cancelar a operação atual",
    { parse_mode: "Markdown" }
  );
};

bot.start(startHandler);
bot.command("s", startHandler);

// Comando /cancelar
bot.command("cancelar", (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    sessionManager.clearSession(userId);
    ctx.reply("❌ Operação cancelada. Use /start para começar novamente.");
  }
});

// Comando /help
bot.help((ctx) => {
  ctx.reply(
    "❓ *Ajuda*\n\n" +
      "*Fluxo de criação de anúncio:*\n\n" +
      "1. Envie o link de afiliado do produto (Mercado Livre)\n" +
      "2. O bot fará scraping dos dados\n" +
      "3. O bot postará automaticamente no canal\n\n" +
      "*Comandos disponíveis:*\n" +
      "/start - Iniciar\n" +
      "/cancelar - Cancelar operação atual\n" +
      "/help - Ver ajuda",
    { parse_mode: "Markdown" }
  );
});

// Handler para mensagens de texto
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.message.text;
  const session = sessionManager.getSession(userId);

  if (!session) {
    await ctx.reply("Use /start para começar.");
    return;
  }

  // Se está aguardando link do produto (COM afiliado)
  if (session.step === "waiting_product_link") {
    // Verificar se é URL válida
    const lines = text.split("\n");
    const urlLine = lines[0].trim();
    const isFlashDeal =
      lines.length > 1 && lines[1].trim().toLowerCase() === "off rel";

    if (isValidUrl(urlLine) && platformManager.isValidUrl(urlLine)) {
      await ctx.reply("🔍 Analisando produto... aguarde.");

      try {
        // FAZER SCRAPING DA PLATAFORMA DETECTADA
        const scrapedData = await platformManager.scrapeProduct(urlLine);

        if (scrapedData && scrapedData.title && scrapedData.discountPrice) {
          // Criar ProductData com link de afiliado
          const productData = {
            title: scrapedData.title,
            originalPrice: scrapedData.originalPrice,
            discountPrice: scrapedData.discountPrice,
            discountPercentage: scrapedData.discountPercentage,
            imageUrl: scrapedData.imageUrl,
            url: urlLine, // Link de afiliado enviado pelo usuário
            isFlashDeal: isFlashDeal,
          };

          // Formatar anúncio
          const ad = formatProductAd(productData);

          // Salvar na sessão e aguardar confirmação
          sessionManager.updateSession(userId, {
            step: "waiting_confirmation",
            productData: productData,
            productUrl: text,
          });

          // Mostrar preview e pedir confirmação
          await ctx.reply(
            `✅ *Produto analisado!* (${scrapedData.platform})\n\n${ad.text}\n\n👉 Escolha uma opção:\n• *SIM* - Publicar assim\n• *NAO* - Cancelar\n• *AJUSTAR* - Editar antes de publicar\n\n💡 _Ou digite um cupom em MAIÚSCULAS (ex: VALEPROMO)_`,
            { parse_mode: "Markdown" }
          );
        } else {
          // Scraping falhou, pedir screenshot
          await ctx.reply(
            "⚠️ Não consegui obter os dados automaticamente.\n\n📸 Por favor, envie um *screenshot* do produto para eu analisar com IA.",
            { parse_mode: "Markdown" }
          );
        }
      } catch (error) {
        console.error("❌ Erro ao processar link:", error);
        await ctx.reply(
          `❌ Erro ao processar o link.\n\n🏪 Plataformas suportadas: ${platformManager
            .getSupportedPlatforms()
            .join(", ")}`,
          { parse_mode: "Markdown" }
        );
      }
    } else {
      await ctx.reply(
        `❌ URL inválida ou plataforma não suportada.\n\n🏪 Plataformas disponíveis:\n${platformManager
          .getSupportedPlatforms()
          .map((p) => `• ${p}`)
          .join("\n")}`
      );
    }
  }

  // Se está aguardando confirmação
  else if (session.step === "waiting_confirmation") {
    const response = text.trim().toLowerCase();
    const originalText = text.trim();

    if (response === "sim" || response === "s" || response === "yes") {
      if (session.productData) {
        await ctx.reply("🚀 Publicando anúncio...");

        // Formatar anúncio
        const ad = formatProductAd(session.productData);

        // Enviar anúncio para o canal
        const success = await telegramService.sendAd(ad, APP_CONFIG.chatId);

        if (success) {
          await ctx.reply(
            "🎉 *Anúncio publicado com sucesso no canal!*\n\nEnvie outro link de afiliado para criar novo anúncio.",
            { parse_mode: "Markdown" }
          );
        } else {
          await ctx.reply(
            "❌ Erro ao publicar o anúncio.\n\nTente novamente ou use /cancelar."
          );
        }

        // Limpar sessão para novo anúncio
        sessionManager.clearSession(userId);
        sessionManager.startSession(userId);
      }
    } else if (
      response === "ajustar" ||
      response === "editar" ||
      response === "edit"
    ) {
      // Modo de edição manual
      const currentAd = session.productData
        ? formatProductAd(session.productData)
        : null;

      if (currentAd) {
        sessionManager.updateSession(userId, {
          step: "waiting_manual_edit",
        });

        await ctx.reply(
          `✏️ *Modo de edição ativado!*\n\n📝 Copie, edite e cole o anúncio abaixo:\n\n${currentAd.text}\n\n👉 Envie o texto editado para publicar.`,
          { parse_mode: "Markdown" }
        );
      }
    } else if (
      response === "nao" ||
      response === "não" ||
      response === "n" ||
      response === "no"
    ) {
      await ctx.reply(
        "❌ Anúncio cancelado.\n\nEnvie outro link para criar novo anúncio."
      );
      sessionManager.clearSession(userId);
      sessionManager.startSession(userId);
    }
    // 🆕 Se digitar texto em MAIÚSCULAS (que não seja SIM/NAO/AJUSTAR), é um cupom
    else if (
      originalText === originalText.toUpperCase() &&
      originalText.length >= 3 &&
      /^[A-Z0-9]+(\s+\d+)?(\s+(MIN|M)\s+\d+)?$/.test(originalText)
    ) {
      // Adicionar cupom diretamente
      if (session.productData) {
        // Separar código do cupom, porcentagem e valor mínimo
        const couponMatch = originalText.match(
          /^([A-Z0-9]+)(\s+(\d+))?(\s+(MIN|M)\s+(\d+))?$/
        );

        if (couponMatch) {
          const couponCode = couponMatch[1];
          const couponDiscount = couponMatch[3] || null;
          const couponMinValue = couponMatch[6] || null;

          session.productData.coupon = couponCode;
          session.productData.couponDiscount = couponDiscount || undefined;
          session.productData.couponMinValue = couponMinValue || undefined;

          // Formatar anúncio com cupom
          const ad = formatProductAd(session.productData);

          let confirmationText = `✅ *Cupom adicionado: ${couponCode}`;
          if (couponDiscount) {
            confirmationText += ` (+${couponDiscount}% de desconto`;
            if (couponMinValue) {
              confirmationText += ` para compras acima de R$${couponMinValue}`;
            }
            confirmationText += `)`;
          }
          confirmationText += `*`;

          await ctx.replyWithPhoto(
            { url: session.productData.imageUrl || "" },
            {
              caption: `${confirmationText}\n\n${ad.text}\n\n👉 Escolha uma opção:\n• *SIM* - Publicar assim\n• *NAO* - Cancelar\n• *AJUSTAR* - Editar antes de publicar`,
              parse_mode: "Markdown",
            }
          );

          // Continuar em waiting_confirmation
          sessionManager.updateSession(userId, {
            step: "waiting_confirmation",
          });
        }
      }
    } else {
      await ctx.reply(
        "❓ Responda com *SIM*, *NAO*, *AJUSTAR* ou digite um cupom em MAIÚSCULAS.",
        {
          parse_mode: "Markdown",
        }
      );
    }
  }

  // Se está aguardando cupom
  else if (session.step === "waiting_coupon") {
    const couponCode = text.trim().toUpperCase();

    if (couponCode.length > 0 && session.productData) {
      // Adicionar cupom aos dados do produto
      session.productData.coupon = couponCode;

      // Formatar anúncio com cupom
      const ad = formatProductAd(session.productData);

      await ctx.replyWithPhoto(
        { url: session.productData.imageUrl || "" },
        {
          caption: `✅ *Cupom adicionado!*\n\n${ad.text}\n\n👉 Escolha uma opção:\n• *SIM* - Publicar assim\n• *NAO* - Cancelar\n• *AJUSTAR* - Editar antes de publicar`,
          parse_mode: "Markdown",
        }
      );

      // Voltar para waiting_confirmation
      sessionManager.updateSession(userId, {
        step: "waiting_confirmation",
      });
    } else {
      await ctx.reply(
        "❌ Cupom inválido. Digite um código válido ou use /cancelar."
      );
    }
  }

  // Se está aguardando edição manual
  else if (session.step === "waiting_manual_edit") {
    if (session.productData && text.length > 10) {
      await ctx.reply("🚀 Publicando anúncio editado...");

      // Usar o texto editado pelo usuário
      const ad = {
        text: text,
        imageUrl: session.productData.imageUrl,
        parseMode: undefined,
      };

      // Enviar anúncio para o canal
      const success = await telegramService.sendAd(ad, APP_CONFIG.chatId);

      if (success) {
        await ctx.reply(
          "🎉 *Anúncio editado publicado com sucesso!*\n\nEnvie outro link de afiliado para criar novo anúncio.",
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply(
          "❌ Erro ao publicar o anúncio.\n\nTente novamente ou use /cancelar."
        );
      }

      // Limpar sessão para novo anúncio
      sessionManager.clearSession(userId);
      sessionManager.startSession(userId);
    } else {
      await ctx.reply(
        "⚠️ Texto muito curto. Envie o anúncio completo editado."
      );
    }
  }
});

// Handler para fotos (caso o usuário envie screenshot)
bot.on(message("photo"), async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = sessionManager.getSession(userId);

  // Só aceita foto se estiver aguardando link do produto
  if (!session || session.step !== "waiting_product_link") {
    await ctx.reply("📎 Primeiro envie o link do produto do Mercado Livre.");
    return;
  }

  try {
    await ctx.reply("🔍 Analisando imagem... aguarde alguns segundos.");

    // Pega a foto de maior qualidade
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    // Obtém a URL da foto
    const fileUrl = await telegramService.getFileUrl(fileId);

    if (!fileUrl) {
      await ctx.reply("❌ Erro ao obter a imagem. Tente novamente.");
      return;
    }

    // Analisa a imagem com IA
    const result = await imageAnalyzer.analyzeProductImage(fileUrl);

    if (!result.success || !result.data) {
      // Oferece modo manual se falhar
      await ctx.reply(
        `⚠️ Não consegui extrair os dados automaticamente.\n\n` +
          `Erro: ${result.error}\n\n` +
          `📝 *Modo Manual:* Envie os dados no formato:\n` +
          `Título: Nome do produto\n` +
          `Preço: R$ 575\n` +
          `Link: https://...`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const productData = result.data;

    // Valida dados
    if (!isValidProductData(productData)) {
      await ctx.reply(
        "⚠️ Dados incompletos extraídos.\n\n" +
          "📝 *Modo Manual:* Envie os dados no formato:\n" +
          "Título: Nome do produto\n" +
          "Preço: R$ 575\n" +
          "Link: https://...",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Salva na sessão
    sessionManager.setProductData(userId, productData.url, productData);

    // Mostra preview
    const ad = formatProductAd(productData);
    await ctx.reply(
      "✅ *Análise concluída!*\n\n" +
        "*Preview do anúncio:*\n\n" +
        ad.text +
        "\n\n" +
        "━━━━━━━━━━━━━━━\n\n" +
        "📎 Agora envie seu *link de afiliado* (gerado no Mercado Livre)",
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    console.error("Erro ao processar imagem:", error);
    await ctx.reply("❌ Erro ao processar a imagem. Tente novamente.");
  }
});

// Tratamento de erros
bot.catch((err: any, ctx: Context) => {
  console.error(`❌ Erro para ${ctx.updateType}:`, err);
  ctx.reply("❌ Ocorreu um erro. Tente novamente mais tarde.");
});

// Inicia o bot
console.log("🚀 Iniciando bot do Telegram...");

telegramService.launch().then(() => {
  console.log(`✅ Bot iniciado com sucesso!`);
  console.log(`📱 Ambiente: ${APP_CONFIG.nodeEnv}`);
  console.log(`💬 Chat ID configurado: ${APP_CONFIG.chatId}`);
});

// Tratamento de sinais para shutdown gracioso
process.once("SIGINT", () => {
  console.log("\n⏹️  Parando bot...");
  telegramService.stop("SIGINT");
});

process.once("SIGTERM", () => {
  console.log("\n⏹️  Parando bot...");
  telegramService.stop("SIGTERM");
});
