// src/hooks/useStickyState.js

import { useState, useEffect } from "react";

export function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return defaultValue;
    }
    try {
      const stickyValue = window.localStorage.getItem(key);
      if (stickyValue !== null) {
        const parsed = JSON.parse(stickyValue);
        // Валидация: если defaultValue - объект, проверяем структуру
        if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            return parsed;
          } else {
            // Некорректные данные - очищаем и возвращаем значение по умолчанию
            console.warn(`Invalid data format for key "${key}" in localStorage, clearing...`);
            window.localStorage.removeItem(key);
            return defaultValue;
          }
        }
        // Для примитивных типов и массивов просто возвращаем распарсенное значение
        return parsed;
      }
      return defaultValue;
    } catch (e) {
      // При ошибке парсинга очищаем поврежденные данные
      console.warn(`Failed to parse localStorage key "${key}":`, e);
      try {
        window.localStorage.removeItem(key);
      } catch (clearError) {
        console.warn("Failed to clear corrupted localStorage data:", clearError);
      }
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Failed to save to localStorage", e);
    }
  }, [key, value]);

  return [value, setValue];
}
