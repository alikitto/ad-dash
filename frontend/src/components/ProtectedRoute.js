// src/components/ProtectedRoute.js
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from 'context/AuthContext'; // Импортируем наш хук

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuth(); // Получаем статус аутентификации из контекста

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? <Component {...props} /> : <Redirect to="/auth/signin" />
      }
    />
  );
};

export default ProtectedRoute;
