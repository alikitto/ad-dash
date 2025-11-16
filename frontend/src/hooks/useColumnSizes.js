// src/hooks/useColumnSizes.js

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "adsetTableColumnSizes";
const DEFAULT_SIZES = {
  account: 250,
  status: 80,
  actions: 120,
  objective: 120,
  spend: 100,
  impressions: 120,
  frequency: 100,
  leads: 80,
  cpl: 100,
  cpm: 100,
  ctr_all: 100,
  ctr_link: 120,
  link_clicks: 100,
};

export function useColumnSizes() {
  const [sizes, setSizes] = useState(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return { ...DEFAULT_SIZES };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Валидация: проверяем, что parsed является объектом
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // Фильтруем только валидные ключи и значения
          const validSizes = {};
          for (const key in DEFAULT_SIZES) {
            if (parsed.hasOwnProperty(key) && typeof parsed[key] === "number" && parsed[key] >= 80 && parsed[key] <= 500) {
              validSizes[key] = parsed[key];
            }
          }
          return { ...DEFAULT_SIZES, ...validSizes };
        } else {
          // Если данные некорректны, очищаем их
          console.warn("Invalid column sizes data in localStorage, clearing...");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn("Failed to load column sizes from localStorage", e);
      // При ошибке парсинга очищаем поврежденные данные
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        console.warn("Failed to clear corrupted localStorage data", clearError);
      }
    }
    return { ...DEFAULT_SIZES };
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
    } catch (e) {
      console.warn("Failed to save column sizes to localStorage", e);
    }
  }, [sizes]);

  const updateSize = useCallback((columnKey, newSize) => {
    setSizes((prev) => ({
      ...prev,
      [columnKey]: Math.max(80, Math.min(500, newSize)), // Min 80px, Max 500px
    }));
  }, []);

  const resetSizes = useCallback(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log("✅ LocalStorage cleared for column sizes");
    } catch (e) {
      console.warn("❌ Failed to reset column sizes", e);
    }
    // Принудительно устанавливаем значения по умолчанию
    setSizes(() => {
      const defaultSizes = {
        account: 250,
        status: 80,
        actions: 120,
        objective: 120,
        spend: 100,
        impressions: 120,
        frequency: 100,
        leads: 80,
        cpl: 100,
        cpm: 100,
        ctr_all: 100,
        ctr_link: 120,
        link_clicks: 100,
      };
      console.log("✅ Column sizes reset to defaults:", defaultSizes);
      return defaultSizes;
    });
  }, []);

  return { sizes, updateSize, resetSizes };
}

