// src/layouts/Auth.js

import React from "react";
import { Route, Switch, Redirect } from "react-router-dom";
import routes from "routes.js";

export default function Pages(props) {
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.collapse) {
        return getRoutes(prop.views);
      }
      if (prop.category === "account") {
        return getRoutes(prop.views);
      }
      if (prop.layout === "/auth") {
        return (
          <Route
            path={prop.layout + prop.path}
            component={prop.component}
            key={key}
          />
        );
      } else {
        return null;
      }
    });
  };

  return (
    <div> {/* Простая обёртка, без Sidebar и Navbar */}
      <Switch>
        {getRoutes(routes)}
        <Redirect from='/auth' to='/auth/signin' />
      </Switch>
    </div>
  );
}
