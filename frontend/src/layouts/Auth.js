/*!

=========================================================
* Vision UI Free Chakra - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/vision-ui-free-chakra
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)
* Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-chakra/blob/master LICENSE.md)

* Design and Coded by Simmmple & Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import routes from "routes.js";
import { Box, ChakraProvider } from "@chakra-ui/react";
import theme from "theme/themeAuth.js";


export default function AuthLayout(props) {
  const wrapper = React.createRef();

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "unset";
    }
    // Specify how to clean up after this effect:
    return function cleanup() {};
  }, []);
  
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
    <ChakraProvider theme={theme} resetCss={false} w='100%'>
      <Box w='100%'>
        <Box ref={wrapper} w='100%'>
          <Switch>
            {getRoutes(routes)}
            <Redirect from='/auth' to='/auth/signin' />
          </Switch>
        </Box>
      </Box>
    </ChakraProvider>
  );
}
