// единственный источник правды про адрес бэка
// Можешь временно оставить чтение из env, но оно не обязательно.
export const API_BASE =
  process.env.REACT_APP_API_URL || 'https://ad-dash-backend-production-023f.up.railway.app';

// безопасная склейка URL (исключает двойные слэши)
export const apiUrl = (path) => new URL(path, API_BASE).toString();
