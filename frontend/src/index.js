import React from "react";
import ReactDOM from "react-dom";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import { AuthProvider } from "context/AuthContext";

import AuthLayout from "layouts/Auth.js";
import AdminLayout from "layouts/Admin.js";
import RTLLayout from "layouts/RTL.js";

ReactDOM.render(
  <AuthProvider>
    <HashRouter>
      <Switch>
        <Route path={`/auth`} component={AuthLayout} />
        <Route path={`/admin`} component={AdminLayout} />
        <Route path={`/rtl`} component={RTLLayout} />
        <Redirect from={`/`} to='/admin/stats' />
      </Switch>
    </HashRouter>
  </AuthProvider>,
  document.getElementById("root")
);
