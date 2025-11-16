// src/hooks/useColumnVisibility.js

import { useStickyState } from "./useStickyState";

const DEFAULT_VISIBILITY = {
  frequency: true,
  ctr_all: true,
};

export function useColumnVisibility() {
  const [visibility, setVisibility] = useStickyState(
    DEFAULT_VISIBILITY,
    "adsetTableColumnVisibility"
  );

  const toggleColumn = (columnKey) => {
    setVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const resetVisibility = () => {
    setVisibility(DEFAULT_VISIBILITY);
  };

  return {
    visibility,
    toggleColumn,
    resetVisibility,
  };
}

