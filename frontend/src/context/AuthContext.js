// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { API_BASE } from "../config/api";
import { getAuthToken, clearAuthToken, saveAuthToken } from "../utils/authStorage";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = async () => {
    try {
      let token = null;
      try {
        token = getAuthToken();
      } catch (e) {
        console.warn("Error getting auth token:", e);
        token = null;
      }

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 секунды таймаут

        const response = await fetch(`${API_BASE}/users/me`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Если токен невалиден на сервере, очищаем локальное хранилище
          try {
            clearAuthToken();
          } catch (e) {
            console.warn("Error clearing auth token:", e);
          }
          setIsAuthenticated(false);
        }
      } catch (error) {
        // При ошибке сети или сервера очищаем токен
        if (error.name !== 'AbortError') {
          console.warn("Token verification failed:", error);
        }
        try {
          clearAuthToken();
        } catch (e) {
          console.warn("Error clearing auth token:", e);
        }
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in verifyToken:", error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    // Устанавливаем таймаут на случай, если процесс зависнет
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("Token verification timeout, proceeding without authentication");
        setIsLoading(false);
      }
    }, 2000); // 2 секунды таймаут (быстрее, чтобы не ждать долго)

    verifyToken().catch((error) => {
      console.error("Unhandled error in verifyToken:", error);
      if (isMounted) {
        setIsLoading(false);
        setIsAuthenticated(false);
      }
    }).finally(() => {
      if (isMounted && timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // verifyToken определен внутри компонента и не должен быть в зависимостях

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

  // Показываем индикатор загрузки вместо пустого экрана
  if (isLoading) {
    console.log("AuthContext: Showing loading indicator");
    return (
      <AuthContext.Provider value={value}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#1a202c",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid rgba(66, 153, 225, 0.3)",
              borderTop: "4px solid #4299e1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "white", fontSize: "16px" }}>Загрузка...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </AuthContext.Provider>
    );
  }

  console.log("AuthContext: Loading complete, isAuthenticated:", isAuthenticated);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
