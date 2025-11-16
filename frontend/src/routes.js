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

// import
import Dashboard from "views/Dashboard/Dashboard.js";
import Tables from "views/Dashboard/index.js"; // Наша страница со статистикой
import Profile from "views/Dashboard/Profile.js";
import { SettingsIcon } from "@chakra-ui/icons";
import Settings from "views/Dashboard/Settings.js";
import MetaAdsStatus from "views/Dashboard/MetaAdsStatus.js";
import ClientsList from "views/Dashboard/ClientsList.js";
import SignIn from "views/Pages/SignIn.js";
import SignUp from "views/Pages/SignUp.js";

import {
  HomeIcon,
  StatsIcon,
  PersonIcon,
  GraphIcon,
} from "components/Icons/Icons";

var dashRoutes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    rtlName: "لوحة القيادة",
    icon: <HomeIcon color='inherit' />,
    component: Dashboard,
    layout: "/admin",
  },
  {
    path: "/stats",
    name: "Statistics",
    rtlName: "لوحة القيادة",
    icon: <StatsIcon color='inherit' />,
    component: Tables,
    layout: "/admin",
  },
  {
    path: "/meta-ads-status",
    name: "Meta ads Status",
    rtlName: "حالة إعلانات Meta",
    icon: <GraphIcon color='inherit' />,
    component: MetaAdsStatus,
    layout: "/admin",
  },
  {
    path: "/settings",
    name: "Settings",
    icon: <SettingsIcon color="inherit" />,
    component: Settings,
    layout: "/admin",
  },
  {
    path: "/clients-list",
    name: "Clients List",
    rtlName: "قائمة العملاء",
    icon: <PersonIcon color='inherit' />,
    component: ClientsList,
    layout: "/admin",
  },
  {
    path: "/profile",
    name: "Profile",
    rtlName: "ملف تعريفي",
    icon: <PersonIcon color='inherit' />,
    secondaryNavbar: true,
    component: Profile,
    layout: "/admin",
  },
  {
    path: "/signin",
    name: "Sign In",
    component: SignIn,
    layout: "/auth",
  },
  {
    path: "/signup",
    name: "Sign Up",
    component: SignUp,
    layout: "/auth",
  },
];
export default dashRoutes;
