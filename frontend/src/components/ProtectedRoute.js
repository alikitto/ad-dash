// src/components/ProtectedRoute.js
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from 'context/AuthContext'; // Импортируем наш хук

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useAuth(); // Получаем статус аутентификации из контекста

  console.log("ProtectedRoute: isAuthenticated:", isAuthenticated, "isLoading:", isLoading);

  // Показываем загрузку, пока проверяем аутентификацию
  if (isLoading) {
    return (
      <Route
        {...rest}
        render={() => (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
            color: "white"
          }}>
            Загрузка...
          </div>
        )}
      />
    );
  }

  return (
    <Route
      {...rest}
      render={(props) => {
        console.log("ProtectedRoute: Rendering, isAuthenticated:", isAuthenticated);
        if (isAuthenticated) {
          return <Component {...props} />;
        } else {
          console.log("ProtectedRoute: Redirecting to /auth/signin");
          return <Redirect to="/auth/signin" />;
        }
      }}
    />
  );
};

export default ProtectedRoute;
