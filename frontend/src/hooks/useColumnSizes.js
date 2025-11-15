// src/hooks/useColumnSizes.js

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "adsetTableColumnSizes";
const DEFAULT_SIZES = {
  account: 250,
  status: 80,
  actions: 180,
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SIZES, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load column sizes from localStorage", e);
    }
    return { ...DEFAULT_SIZES };
  });

  useEffect(() => {
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
        actions: 180,
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

