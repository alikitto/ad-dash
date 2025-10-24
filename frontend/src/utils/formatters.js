// src/utils/formatters.js

export const formatLastUpdated = (lastUpdated) => {
  if (!lastUpdated) return "—";
  const now = new Date();
  const mins = Math.floor((now - lastUpdated) / 60000);
  if (mins < 1) return "now";
  if (mins === 1) return "1 min ago";
  return mins < 60 ? `${mins} mins ago` : `${Math.floor(mins / 60)} hrs ago`;
};
