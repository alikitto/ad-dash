// src/utils/formatters.js

export const formatLastUpdated = (lastUpdated) => {
  if (!lastUpdated) return "—";
  const now = new Date();
  const mins = Math.floor((now - lastUpdated) / 60000);
  if (mins < 1) return "now";
  if (mins === 1) return "1 min ago";
  return mins < 60 ? `${mins} mins ago` : `${Math.floor(mins / 60)} hrs ago`;
};

// Получить настройку формата чисел из localStorage
const getNumberFormatPreference = () => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "spaces";
  }
  try {
    const saved = localStorage.getItem("numberFormatPreference");
    return saved || "spaces"; // "spaces" или "compact" (K/M)
  } catch {
    return "spaces";
  }
};

// Установить формат чисел (для использования из консоли или настроек)
export const setNumberFormatPreference = (format) => {
  if (format !== "spaces" && format !== "compact") {
    console.error("Invalid format. Use 'spaces' or 'compact'");
    return;
  }
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem("numberFormatPreference", format);
    console.log(`Number format set to: ${format}. Refresh page to see changes.`);
    // Можно добавить событие для обновления без перезагрузки
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("numberFormatChanged"));
    }
  } catch (e) {
    console.error("Failed to save number format preference", e);
  }
  
  // Инициализируем window функции при первом вызове
  if (typeof window !== "undefined" && !window.setNumberFormat) {
    try {
      window.setNumberFormat = setNumberFormatPreference;
      window.getNumberFormat = () => getNumberFormatPreference();
    } catch (e) {
      // Игнорируем ошибки
    }
  }
};


// Форматирование денег: всегда 2 знака после запятой
export const fmtMoney = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return "$0.00";
  return `$${v.toFixed(2)}`;
};

// Настройки локали (дата/валюта)
const getLocalePreference = () => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return "ru-RU";
  try {
    return localStorage.getItem("localePreference") || "ru-RU";
  } catch {
    return "ru-RU";
  }
};

export const setLocalePreference = (locale) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("localePreference", locale);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("localeChanged"));
  } catch {}
};

export const fmtMoneyIntl = (v, currency = "USD") => {
  if (typeof v !== "number" || !isFinite(v)) return "$0.00";
  try {
    const locale = getLocalePreference();
    return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  } catch {
    return fmtMoney(v);
  }
};

export const fmtDateDMYIntl = (date) => {
  try {
    const locale = getLocalePreference();
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  } catch {
    if (!(date instanceof Date)) return "";
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
};

// Форматирование процентов: всегда 2 знака после запятой
export const fmtPct = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return "0.00%";
  return `${v.toFixed(2)}%`;
};

// Форматирование больших чисел: пробелы или K/M
export const fmtNum = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return "0";
  const format = getNumberFormatPreference();
  
  if (format === "compact") {
    // Компактный формат: 2.1K, 1.5M
    if (v >= 1000000) {
      return `${(v / 1000000).toFixed(1)}M`;
    }
    if (v >= 1000) {
      return `${(v / 1000).toFixed(1)}K`;
    }
    return v.toString();
  } else {
    // Формат с пробелами: 2 103
    return v.toLocaleString("en-US").replace(/,/g, " ");
  }
};

// Форматирование частоты: всегда 2 знака после запятой
export const fmtFrequency = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return "0.00";
  return v.toFixed(2);
};
