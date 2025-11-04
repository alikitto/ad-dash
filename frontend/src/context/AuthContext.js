// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { API_BASE } from "../config/api";
import { getAuthToken, clearAuthToken, saveAuthToken } from "../utils/authStorage";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = async () => {
    const token = getAuthToken(); // Используем функцию с проверкой срока действия
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/users/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        // Если токен невалиден на сервере, очищаем локальное хранилище
        clearAuthToken();
        setIsAuthenticated(false);
      }
    } catch (error) {
      // При ошибке сети или сервера очищаем токен
      clearAuthToken();
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  const login = (token, rememberMe = false) => {
    // Сохраняем токен с учетом rememberMe
    saveAuthToken(token, rememberMe);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
  };

  const value = { isAuthenticated, isLoading, login, logout, verifyToken };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
