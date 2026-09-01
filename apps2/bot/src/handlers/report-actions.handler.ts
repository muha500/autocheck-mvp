import { Telegraf, Context } from "telegraf";
import { checkPipeline } from "@autocheck/domain";

/** Кнопки под результатом проверки (ТЗ п.21) */
export function registerReportActionHandlers(bot: Telegraf<Context>) {
  bot.action(/^report:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const report = checkPipeline.getReport(ctx.match[1]);
    if (!report) return ctx.reply("Отчёт не найден.");
    // TODO(prod): сформировать PDF/файл отчёта, если это разрешено условиями поставщика API,
    // и отправить его через ctx.replyWithDocument(...).
    await ctx.reply(
      `Полнота проверки: ${report.dataCompleteness.percent}%.\n` +
        `${report.dataCompleteness.note}\n\n` +
        "Полный PDF-отчёт будет доступен после подключения реального провайдера истории."
    );
  });

  bot.action(/^inspect:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const report = checkPipeline.getReport(ctx.match[1]);
    if (!report?.aiRecommendation) return ctx.reply("Данные недоступны.");
    await ctx.reply(
      "Что проверить при осмотре:\n" +
        report.aiRecommendation.whatToCheckOnInspection.map((i) => `• ${i}`).join("\n")
    );
  });

  bot.action(/^questions:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const report = checkPipeline.getReport(ctx.match[1]);
    if (!report?.aiRecommendation) return ctx.reply("Данные недоступны.");
    await ctx.reply(
      "Вопросы продавцу:\n" + report.aiRecommendation.questionsForSeller.map((q) => `• ${q}`).join("\n")
    );
  });

  bot.action(/^save:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Сохранено ❤️");
    // TODO(prod): записать в SavedVehicle через репозиторий/Prisma.
  });
}
