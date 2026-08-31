import { Telegraf } from "telegraf";
import { mainMenuKeyboard } from "./keyboards/main-menu";
import { registerCheckVehicleHandlers } from "./handlers/check-vehicle.handler";
import { registerReportActionHandlers } from "./handlers/report-actions.handler";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  // eslint-disable-next-line no-console
  console.error("TELEGRAM_BOT_TOKEN не задан в .env — бот не может запуститься.");
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply("Добро пожаловать в AutoCheck! Выберите действие:", mainMenuKeyboard));

bot.hears("🚗 Найти авто", (ctx) =>
  ctx.reply("Поиск автомобилей — раздел в разработке. Скоро здесь появятся фильтры по марке, цене и региону.")
);
bot.hears("❤️ Мои авто", (ctx) => ctx.reply("У вас пока нет сохранённых автомобилей."));
bot.hears("🔥 Лучшие сделки", (ctx) => ctx.reply("Модуль Deal Discovery в разработке."));
bot.hears("➕ Продать авто", (ctx) => ctx.reply("Отправьте VIN, цену, пробег, фото и описание автомобиля."));
bot.hears("👤 Профиль", (ctx) => ctx.reply(`Ваш Telegram ID: ${ctx.from?.id}`));

registerCheckVehicleHandlers(bot);
registerReportActionHandlers(bot);

bot.launch().then(() => {
  // eslint-disable-next-line no-console
  console.log("AutoCheck bot запущен.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
