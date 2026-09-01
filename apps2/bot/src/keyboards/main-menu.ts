import { Markup } from "telegraf";

/** Главное меню (ТЗ п.17) */
export const mainMenuKeyboard = Markup.keyboard([
  ["🚗 Найти авто", "🔍 Проверить авто"],
  ["❤️ Мои авто", "🔥 Лучшие сделки"],
  ["➕ Продать авто", "👤 Профиль"],
]).resize();
