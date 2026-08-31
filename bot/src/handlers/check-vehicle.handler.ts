import { Telegraf, Context } from "telegraf";
import { randomUUID } from "crypto";
import { checkPipeline, paymentService, resolveVehicle, env } from "@autocheck/domain";
import { CheckJob } from "@autocheck/types";

/**
 * Сценарий "🔍 Проверить авто" (ТЗ п.3, п.18, п.21).
 * Состояние диалога хранится в памяти по chatId — для MVP этого достаточно,
 * в проде — заменить на Redis/сессии Telegraf.
 */
const awaitingIdentifier = new Set<number>();
const pendingJobByChat = new Map<number, { job: CheckJob; paymentId: string }>();

function parseIdentifier(text: string): { vin?: string; plate?: string; listingUrl?: string } {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return { listingUrl: trimmed };
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(trimmed)) return { vin: trimmed.toUpperCase() };
  return { plate: trimmed.toUpperCase() };
}

export function registerCheckVehicleHandlers(bot: Telegraf<Context>) {
  bot.hears("🔍 Проверить авто", async (ctx) => {
    awaitingIdentifier.add(ctx.chat!.id);
    await ctx.reply("Отправьте VIN, госномер или ссылку на объявление.");
  });

  bot.on("text", async (ctx, next) => {
    const chatId = ctx.chat!.id;
    if (!awaitingIdentifier.has(chatId)) return next();
    awaitingIdentifier.delete(chatId);

    const identifier = parseIdentifier(ctx.message.text);
    await ctx.reply("Проверяем автомобиль...");

    const vehicle = resolveVehicle(identifier);
    const userId = String(ctx.from!.id);

    const job = await checkPipeline.createJob(userId, identifier);
    const payment = await paymentService.createCheckPayment(userId, job.id);
    pendingJobByChat.set(chatId, { job, paymentId: payment.id });

    await ctx.reply(
      `Автомобиль найден.\n\n${vehicle.brand} ${vehicle.model}\n${vehicle.year}\n` +
        `${vehicle.mileageKm?.toLocaleString("ru-RU") ?? "—"} км\n\n` +
        `🔍 Полная проверка — ${env.vehicleCheckPrice} ${env.vehicleCheckCurrency}`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: `🔍 Проверить — ${env.vehicleCheckPrice} ₽`, callback_data: `pay:${job.id}` }]],
        },
      }
    );
  });

  bot.action(/^pay:(.+)$/, async (ctx) => {
    const jobId = ctx.match[1];
    const chatId = ctx.chat!.id;
    const pending = pendingJobByChat.get(chatId);
    if (!pending || pending.job.id !== jobId) {
      await ctx.answerCbQuery("Сессия проверки устарела, начните заново.");
      return;
    }
    await ctx.answerCbQuery();
    await ctx.reply("Оплата обрабатывается...");

    try {
      // ВАЖНО: проверка запускается только после подтверждения оплаты (ТЗ п.19),
      // а не по факту нажатия кнопки — verifyPayment внутри runAfterPayment это гарантирует.
      const report = await checkPipeline.runAfterPayment(pending.job.id, pending.paymentId);
      checkPipeline.markDelivered(pending.job.id);

      const s = report.scores;
      const riskLabel = s.hardStop ? "КРИТИЧЕСКИЙ" : s.riskScore <= 3 ? "НИЗКИЙ" : s.riskScore <= 6 ? "СРЕДНИЙ" : "ВЫСОКИЙ";
      const flagsText = s.riskFlags.length
        ? s.riskFlags.map((f) => `🟡 ${f.message}`).join("\n")
        : "🟢 Критических рисков не обнаружено";

      await ctx.reply(
        `🚗 ${report.vehicle.brand} ${report.vehicle.model}\n` +
          `CAR SCORE: ${s.carScore}/10\n` +
          `SELLER SCORE: ${s.sellerScore}/10\n` +
          `DEAL SCORE: ${s.dealScore}/10\n` +
          `RISK: ${riskLabel}\n` +
          `${flagsText}\n\n` +
          `Рекомендация:\n${report.aiRecommendation?.summary ?? "—"}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📄 Скачать отчёт", callback_data: `report:${report.id}` }],
              [{ text: "🔧 Что проверить", callback_data: `inspect:${report.id}` }],
              [{ text: "💬 Вопросы продавцу", callback_data: `questions:${report.id}` }],
              [{ text: "❤️ Сохранить", callback_data: `save:${report.vehicle.id}` }],
            ],
          },
        }
      );
    } catch (err: any) {
      await ctx.reply(`Не удалось завершить проверку: ${err.message}`);
    } finally {
      pendingJobByChat.delete(chatId);
    }
  });
}
