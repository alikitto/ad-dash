import React from "react";
import ReactDOM from "react-dom";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import { AuthProvider } from "context/AuthContext";

import AuthLayout from "layouts/Auth.js";
import AdminLayout from "layouts/Admin.js";
import RTLLayout from "layouts/RTL.js";

// Простой ErrorBoundary без зависимостей
class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#1a202c",
          color: "white",
          padding: "20px",
          textAlign: "center"
        }}>
          <h1 style={{ color: "#e53e3e", marginBottom: "20px" }}>Ошибка загрузки приложения</h1>
          <p style={{ marginBottom: "20px" }}>{this.state.error?.message || "Неизвестная ошибка"}</p>
          <button 
            onClick={() => {
              try {
                localStorage.removeItem("adsetTableColumnSizes");
                localStorage.removeItem("datePreset");
                localStorage.removeItem("selectedAccount");
                localStorage.removeItem("statusFilter");
                localStorage.removeItem("objectiveFilter");
                localStorage.removeItem("sortConfig");
              } catch (e) {
                console.error("Failed to clear storage:", e);
              }
              window.location.reload();
            }}
            style={{
              padding: "10px 20px",
              background: "#4299e1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
              marginBottom: "10px"
            }}
          >
            Очистить localStorage и перезагрузить
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "white",
              border: "1px solid white",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Просто перезагрузить
          </button>
          <p style={{ marginTop: "20px", fontSize: "12px", color: "#a0aec0" }}>
            Откройте консоль браузера (F12) для подробностей
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Отложенная инициализация, чтобы избежать проблем при SSR/компиляции
if (typeof document !== "undefined") {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    try {
      console.log("🚀 Initializing React application...");
      console.log("Root element found:", rootElement);
      
      // Проверяем, что все импорты загружены
      console.log("AuthProvider:", typeof AuthProvider);
      console.log("AuthLayout:", typeof AuthLayout);
      console.log("AdminLayout:", typeof AdminLayout);
      console.log("RTLLayout:", typeof RTLLayout);
      
      ReactDOM.render(
        <SimpleErrorBoundary>
          <AuthProvider>
            <HashRouter>
              <Switch>
                <Route path={`/auth`} component={AuthLayout} />
                <Route path={`/admin`} component={AdminLayout} />
                <Route path={`/rtl`} component={RTLLayout} />
                <Redirect from={`/`} to='/admin/dashboard' />
              </Switch>
            </HashRouter>
          </AuthProvider>
        </SimpleErrorBoundary>,
        rootElement,
        () => {
          console.log("✅ React application rendered successfully");
        }
      );
    } catch (error) {
      console.error("❌ Failed to initialize React application:", error);
      console.error("Error stack:", error.stack);
      rootElement.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #1a202c;
          color: white;
          padding: 20px;
          text-align: center;
        ">
          <h1 style="color: #e53e3e; margin-bottom: 20px;">Критическая ошибка</h1>
          <p style="margin-bottom: 20px;">${error.message || "Не удалось инициализировать приложение"}</p>
          <button 
            onclick="window.location.reload()" 
            style="
              padding: 10px 20px;
              background: #4299e1;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            "
          >
            Перезагрузить страницу
          </button>
        </div>
      `;
    }
  } else {
    console.error("Root element not found!");
  }
}
