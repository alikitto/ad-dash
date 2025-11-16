// Chakra Icons
import { BellIcon } from "@chakra-ui/icons";
// Chakra Imports
import {
  Button,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Avatar,
  AvatarBadge,
  useToast,
} from "@chakra-ui/react";
// Assets
import avatar1 from "assets/img/avatars/avatar1.png";
import avatar2 from "assets/img/avatars/avatar2.png";
import avatar3 from "assets/img/avatars/avatar3.png";
// Custom Icons
import { ProfileIcon } from "components/Icons/Icons";
// Custom Components
import { ItemContent } from "components/Menu/ItemContent";
import { SidebarResponsive } from "components/Sidebar/Sidebar";
import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import { NavLink, useHistory } from "react-router-dom";
import routes from "routes.js";
import { useAuth } from "context/AuthContext";
import { API_BASE } from "config/api";

export default function HeaderLinks(props) {
  const { variant, children, fixed, secondary, onOpen, ...rest } = props;
  const { isAuthenticated, logout } = useAuth();
  const history = useHistory();
  const toast = useToast();
  const [userInfo, setUserInfo] = useState(null);

  // Chakra Color Mode
  let navbarIcon = "white";

  if (secondary) {
    navbarIcon = "white";
  }

  // Загружаем информацию о пользователе
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUserInfo = async () => {
        try {
          // Динамический импорт для избежания циклических зависимостей
          const authStorage = await import("../../utils/authStorage");
          const token = authStorage.getAuthToken(); // getAuthToken не асинхронная
          if (!token) return;
          
          const response = await fetch(`${API_BASE}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
          }
        } catch (error) {
          console.error("Error fetching user info:", error);
        }
      };
      fetchUserInfo();
    }
  }, [isAuthenticated]);

  const handleSignOut = () => {
    logout();
    toast({
      title: "Вы вышли из системы",
      status: "info",
      duration: 2000,
      position: "top",
    });
    history.push("/auth/signin");
  };
  return (
    <Flex
      pe={{ sm: "0px", md: "16px" }}
      w={{ sm: "100%", md: "auto" }}
      alignItems='center'
      flexDirection='row'>
      {/* User Avatar Menu */}
      {isAuthenticated ? (
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="User menu"
            icon={
              <Avatar
                size="sm"
                name={userInfo?.name || userInfo?.email || "User"}
                src={avatar1}
              />
            }
            variant="ghost"
            borderRadius="full"
            me={{ sm: "2px", md: "16px" }}
          />
          <MenuList
            border='transparent'
            backdropFilter='blur(63px)'
            bg='linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.69) 76.65%)'
            borderRadius='20px'
            minW="200px">
            <MenuItem
              as={NavLink}
              to="/admin/profile"
              borderRadius='8px'
              mb='5px'
              _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
              _active={{ bg: "rgba(255, 255, 255, 0.1)" }}
              _focus={{ bg: "rgba(255, 255, 255, 0.1)" }}>
              <Flex align="center" gap={2}>
                <ProfileIcon color={navbarIcon} w='18px' h='18px' />
                <Text color={navbarIcon}>Profile</Text>
              </Flex>
            </MenuItem>
            <MenuItem
              onClick={handleSignOut}
              borderRadius='8px'
              _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
              _active={{ bg: "rgba(255, 255, 255, 0.1)" }}
              _focus={{ bg: "rgba(255, 255, 255, 0.1)" }}>
              <Flex align="center" gap={2}>
                <Text color={navbarIcon}>Sign Out</Text>
              </Flex>
            </MenuItem>
          </MenuList>
        </Menu>
      ) : (
        <NavLink to='/auth/signin'>
          <Button
            ms='0px'
            px='0px'
            me={{ sm: "2px", md: "16px" }}
            color={navbarIcon}
            variant='transparent-with-icon'
            rightIcon={
              document.documentElement.dir ? (
                ""
              ) : (
                <ProfileIcon color={navbarIcon} w='22px' h='22px' me='0px' />
              )
            }
            leftIcon={
              document.documentElement.dir ? (
                <ProfileIcon color={navbarIcon} w='22px' h='22px' me='0px' />
              ) : (
                ""
              )
            }>
            <Text display={{ sm: "none", md: "flex" }}>Sign In</Text>
          </Button>
        </NavLink>
      )}
      <SidebarResponsive
        iconColor='gray.500'
        logoText={props.logoText}
        secondary={props.secondary}
        routes={routes}
        // logo={logo}
        {...rest}
      />
      <Menu>
        <MenuButton align='center'>
          <BellIcon color={navbarIcon} mt='-4px' w='18px' h='18px' />
        </MenuButton>

        <MenuList
          border='transparent'
          backdropFilter='blur(63px)'
          bg='linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.69) 76.65%)'
          borderRadius='20px'>
          <Flex flexDirection='column'>
            <MenuItem
              borderRadius='8px'
              _hover={{
                bg: "transparent",
              }}
              _active={{
                bg: "transparent",
              }}
              _focus={{
                bg: "transparent",
              }}
              mb='10px'>
              <ItemContent
                time='13 minutes ago'
                info='from Alicia'
                boldInfo='New Message'
                aName='Alicia'
                aSrc={avatar1}
              />
            </MenuItem>
            <MenuItem
              borderRadius='8px'
              _hover={{
                bg: "transparent",
              }}
              _active={{
                bg: "transparent",
              }}
              _focus={{
                bg: "transparent",
              }}
              _hover={{ bg: "transparent" }}
              mb='10px'>
              <ItemContent
                time='2 days ago'
                info='by Josh Henry'
                boldInfo='New Album'
                aName='Josh Henry'
                aSrc={avatar2}
              />
            </MenuItem>
            <MenuItem
              borderRadius='8px'
              _hover={{
                bg: "transparent",
              }}
              _active={{
                bg: "transparent",
              }}
              _focus={{
                bg: "transparent",
              }}>
              <ItemContent
                time='3 days ago'
                info='Payment succesfully completed!'
                boldInfo=''
                aName='Kara'
                aSrc={avatar3}
              />
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func,
};
