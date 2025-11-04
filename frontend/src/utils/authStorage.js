// Utility functions for handling authentication storage with expiration

const AUTH_TOKEN_KEY = "authToken";
const AUTH_TOKEN_EXPIRY_KEY = "authTokenExpiry";
const AUTH_REMEMBER_ME_KEY = "authRememberMe";

/**
 * Save authentication token with expiration
 * @param {string} token - The authentication token
 * @param {boolean} rememberMe - Whether to remember for 30 days or session only
 */
export function saveAuthToken(token, rememberMe = false) {
  if (rememberMe) {
    // Save for 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
    localStorage.setItem(AUTH_REMEMBER_ME_KEY, "true");
  } else {
    // Save for session only (will be cleared on browser close)
    // But we'll still use localStorage with shorter expiry (1 day) for convenience
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1); // 1 day for non-remember me
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
    localStorage.setItem(AUTH_REMEMBER_ME_KEY, "false");
  }
}

/**
 * Get authentication token if it exists and is not expired
 * @returns {string|null} - The token or null if expired/missing
 */
export function getAuthToken() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const expiryStr = localStorage.getItem(AUTH_TOKEN_EXPIRY_KEY);

  if (!token || !expiryStr) {
    return null;
  }

  // Check if token is expired
  const expiryDate = new Date(expiryStr);
  const now = new Date();

  if (now > expiryDate) {
    // Token expired, clear it
    clearAuthToken();
    return null;
  }

  return token;
}

/**
 * Check if token exists and is valid (not expired)
 * @returns {boolean}
 */
export function isAuthTokenValid() {
  const token = getAuthToken();
  return token !== null;
}

/**
 * Clear authentication token and related data
 */
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(AUTH_REMEMBER_ME_KEY);
}

/**
 * Get remaining days until token expires
 * @returns {number|null} - Days remaining or null if no token
 */
export function getTokenExpiryDays() {
  const expiryStr = localStorage.getItem(AUTH_TOKEN_EXPIRY_KEY);
  if (!expiryStr) return null;

  const expiryDate = new Date(expiryStr);
  const now = new Date();
  const diffTime = expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

