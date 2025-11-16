/*eslint-disable*/
import { HamburgerIcon } from "@chakra-ui/icons";
// chakra imports
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Link,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import IconBox from "components/Icons/IconBox";
import { SimmmpleLogoWhite } from "components/Icons/Icons";
import { Separator } from "components/Separator/Separator";
import PropTypes from "prop-types";
import React from "react";
import { NavLink, useLocation } from "react-router-dom";

// FUNCTIONS

function Sidebar(props) {
  // to check for active links and opened collapses
  let location = useLocation();
  // this is for the rest of the collapses
  const [state, setState] = React.useState({});
  const mainPanel = React.useRef();
  let variantChange = "0.2s linear";
  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return location.pathname === routeName ? "active" : "";
  };
  // this function creates the links and collapses that appear in the sidebar (left menu)
  const createLinks = (routes) => {
    const { sidebarVariant } = props;
    // Chakra Color Mode
    let activeBg = "#1A1F37";
    let inactiveBg = "#1A1F37";
    let activeColor = "white";
    let inactiveColor = "white";
    let sidebarActiveShadow = "none";

    return routes.map((prop, key) => {
      if (prop.redirect) {
        return null;
      }
      if (prop.category) {
        var st = {};
        st[prop["state"]] = !state[prop.state];
        return (
          <>
            <Text
              color={activeColor}
              fontWeight='bold'
              mb={{
                xl: "12px",
              }}
              mx='auto'
          ps={{
            sm: "10px",
            xl: "10px",
          }}
          justifyContent='flex-start'
              py='12px'
              whiteSpace='nowrap'>
              {document.documentElement.dir === "rtl"
                ? prop.rtlName
                : prop.name}
            </Text>
            {createLinks(prop.views)}
          </>
        );
      }
      return (
        <NavLink to={prop.layout + prop.path}>
          {activeRoute(prop.layout + prop.path) === "active" ? (
            <Button
              boxSize='initial'
              alignItems='center'
              boxShadow={sidebarActiveShadow}
              bg={activeBg}
              transition={variantChange}
              backdropFilter='blur(42px)'
              mb={{
                xl: "12px",
              }}
              mx={{
                xl: "0",
              }}
          ps={{
            sm: "10px",
            xl: "10px",
          }}
          justifyContent='flex-start'
              py='12px'
              borderRadius='15px'
              _hover='none'
              w='100%'
              _active={{
                bg: "inherit",
                transform: "none",
                borderColor: "transparent",
              }}
              _focus={{
                boxShadow: "0px 7px 11px rgba(0, 0, 0, 0.04)",
              }}>
              <Flex className='sidebar-button'>
                {typeof prop.icon === "string" ? (
                  <Icon className='sidebar-icon'>{prop.icon}</Icon>
                ) : (
                  <IconBox
                    className='sidebar-icon'
                    bg='brand.200'
                    color='white'
                    h='30px'
                    w='30px'
                    me='12px'
                    transition={variantChange}>
                    {prop.icon}
                  </IconBox>
                )}
                <Text className='sidebar-text' color={activeColor} my='auto' fontSize='sm' whiteSpace='nowrap' flexShrink={0}>
                  {document.documentElement.dir === "rtl"
                    ? prop.rtlName
                    : prop.name}
                </Text>
              </Flex>
            </Button>
          ) : (
            <Button
              boxSize='initial'
              justifyContent='flex-start'
              alignItems='center'
              bg='transparent'
              mb={{
                xl: "12px",
              }}
              mx={{
                xl: "0",
              }}
              py='12px'
          ps={{
            sm: "10px",
            xl: "10px",
          }}
          justifyContent='flex-start'
              borderRadius='15px'
              _hover='none'
              w='100%'
              _active={{
                bg: "inherit",
                transform: "none",
                borderColor: "transparent",
              }}
              _focus={{
                boxShadow: "none",
              }}>
              <Flex className='sidebar-button'>
                {typeof prop.icon === "string" ? (
                  <Icon className='sidebar-icon'>{prop.icon}</Icon>
                ) : (
                  <IconBox
                    className='sidebar-icon'
                    bg={inactiveBg}
                    color='brand.200'
                    h='30px'
                    w='30px'
                    me='12px'
                    transition={variantChange}>
                    {prop.icon}
                  </IconBox>
                )}
                <Text className='sidebar-text' color={inactiveColor} my='auto' fontSize='sm' whiteSpace='nowrap' flexShrink={0}>
                  {document.documentElement.dir === "rtl"
                    ? prop.rtlName
                    : prop.name}
                </Text>
              </Flex>
            </Button>
          )}
        </NavLink>
      );
    });
  };
  const { logoText, routes, sidebarVariant } = props;

  var links = <>{createLinks(routes)}</>;
  //  BRAND
  //  Chakra Color Mode
  let sidebarBg =
    "linear-gradient(111.84deg, rgba(6, 11, 38, 0.94) 59.3%, rgba(26, 31, 55, 0) 100%)";
  let sidebarRadius = "16px";
  let sidebarMargins = "16px 0px 16px 16px";
  var brand = (
    <Box pt={"25px"} mb='12px'>
      <Link
        href={`${process.env.PUBLIC_URL}/#/`}
        target='_blank'
        display='flex'
        lineHeight='100%'
        mb='30px'
        fontWeight='bold'
        justifyContent='flex-start'
        alignItems='center'
        fontSize='11px'
        className='brand-link'>
        <SimmmpleLogoWhite w='22px' h='22px' me='10px' mt='2px' flexShrink={0} />
        <Box
          bg='linear-gradient(97.89deg, #FFFFFF 70.67%, rgba(117, 122, 140, 0) 108.55%)'
          bgClip='text'>
          <Text className='sidebar-brand-text' fontSize='sm' letterSpacing='3px' mt='3px' color='transparent' whiteSpace='nowrap'>
            {logoText}
          </Text>
        </Box>
      </Link>
      <Separator></Separator>
    </Box>
  );

  // SIDEBAR
  return (
    <Box ref={mainPanel}>
      <Box display={{ sm: "none", xl: "block" }} position='fixed' zIndex={1000}>
        <Box
          bg={sidebarBg}
          backdropFilter='blur(10px)'
          transition='all 0.3s ease'
          w='80px'
          maxW='80px'
          ms={{
            sm: "16px",
          }}
          my={{
            sm: "16px",
          }}
          h='calc(100vh - 32px)'
          m={sidebarMargins}
          borderRadius={sidebarRadius}
          overflowX='visible'
          overflowY='auto'
          ps='0px'
          pe='0px'
          sx={{
            '&:hover': {
              width: '260px !important',
              maxWidth: '260px !important',
              paddingLeft: '20px !important',
              paddingRight: '20px !important',
            },
            '.sidebar-text': {
              opacity: 0,
              visibility: 'hidden',
              maxWidth: 0,
              transition: 'opacity 0.2s ease, visibility 0.2s ease, max-width 0.2s ease',
            },
            '.sidebar-brand-text': {
              opacity: 0,
              visibility: 'hidden',
              maxWidth: 0,
              transition: 'opacity 0.2s ease, visibility 0.2s ease, max-width 0.2s ease',
            },
            '&:hover .sidebar-text': {
              opacity: 1,
              visibility: 'visible',
              maxWidth: '200px',
            },
            '&:hover .sidebar-brand-text': {
              opacity: 1,
              visibility: 'visible',
              maxWidth: '200px',
            },
            '.sidebar-icon': {
              flexShrink: 0,
            },
            '.sidebar-button': {
              justifyContent: 'flex-start !important',
            },
            '&:hover > div:first-of-type': {
              paddingLeft: '20px !important',
              paddingRight: '20px !important',
            },
            '&:hover > div:last-of-type': {
              paddingLeft: '20px !important',
              paddingRight: '20px !important',
            },
          }}>
          <Box ps='10px' pe='10px'>
            {brand}
          </Box>
          <Stack direction='column' mb='40px' ps='10px' pe='10px'>
            <Box>{links}</Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

// FUNCTIONS

export function SidebarResponsive(props) {
  // to check for active links and opened collapses
  let location = useLocation();
  // this is for the rest of the collapses
  const [state, setState] = React.useState({});
  const mainPanel = React.useRef();
  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return location.pathname === routeName ? "active" : "";
  };
  // this function creates the links and collapses that appear in the sidebar (left menu)
  const createLinks = (routes) => {
    // Chakra Color Mode
    const activeBg = "#1A1F37";
    const inactiveBg = "#1A1F37";
    const activeColor = "white";
    const inactiveColor = "white";

    return routes.map((prop, key) => {
      if (prop.redirect) {
        return null;
      }
      if (prop.category) {
        var st = {};
        st[prop["state"]] = !state[prop.state];
        return (
          <>
            <Text
              color={activeColor}
              fontWeight='bold'
              mb={{
                xl: "12px",
              }}
              mx='auto'
          ps={{
            sm: "10px",
            xl: "10px",
          }}
          justifyContent='flex-start'
              py='12px'
              whiteSpace='nowrap'>
              {document.documentElement.dir === "rtl"
                ? prop.rtlName
                : prop.name}
            </Text>
            {createLinks(prop.views)}
          </>
        );
      }
      return (
        <NavLink to={prop.layout + prop.path}>
          {activeRoute(prop.layout + prop.path) === "active" ? (
            <Button
              boxSize='initial'
              justifyContent='flex-start'
              alignItems='center'
              bg={activeBg}
              mb={{
                xl: "12px",
              }}
              mx={{
                xl: "0",
              }}
          ps={{
            sm: "10px",
            xl: "10px",
          }}
          justifyContent='flex-start'
              py='12px'
              borderRadius='15px'
              _hover='none'
              w='100%'
              _active={{
                bg: "inherit",
                transform: "none",
                borderColor: "transparent",
              }}
              _focus={{
                boxShadow: "none",
              }}>
              <Flex>
                {typeof prop.icon === "string" ? (
                  <Icon>{prop.icon}</Icon>
                ) : (
                  <IconBox
                    bg='brand.200'
                    color='white'
                    h='30px'
                    w='30px'
                    me='12px'>
                    {prop.icon}
                  </IconBox>
                )}
                <Text className='sidebar-text' color={activeColor} my='auto' fontSize='sm' whiteSpace='nowrap' flexShrink={0} ml='12px'>
                  {document.documentElement.dir === "rtl"
                    ? prop.rtlName
                    : prop.name}
                </Text>
              </Flex>
            </Button>
          ) : (
            <Button
              boxSize='initial'
              justifyContent='flex-start'
              alignItems='center'
              bg='transparent'
              mb={{
                xl: "12px",
              }}
              mx={{
                xl: "0",
              }}
              py='12px'
          ps={{
            sm: "10px",
            xl: "10px",
          }}
          justifyContent='flex-start'
              borderRadius='15px'
              _hover='none'
              w='100%'
              _active={{
                bg: "inherit",
                transform: "none",
                borderColor: "transparent",
              }}
              _focus={{
                boxShadow: "none",
              }}>
              <Flex>
                {typeof prop.icon === "string" ? (
                  <Icon>{prop.icon}</Icon>
                ) : (
                  <IconBox
                    bg={inactiveBg}
                    color='brand.200'
                    h='30px'
                    w='30px'
                    me='12px'>
                    {prop.icon}
                  </IconBox>
                )}
                <Text color={inactiveColor} my='auto' fontSize='sm' whiteSpace='nowrap'>
                  {document.documentElement.dir === "rtl"
                    ? prop.rtlName
                    : prop.name}
                </Text>
              </Flex>
            </Button>
          )}
        </NavLink>
      );
    });
  };
  const { logoText, routes, iconColor, ...rest } = props;

  var links = <>{createLinks(routes)}</>;
  //  BRAND
  //  Chakra Color Mode
  var brand = (
    <Box pt={"35px"} mb='8px'>
      <Link
        href={`${process.env.PUBLIC_URL}/#/`}
        target='_blank'
        display='flex'
        lineHeight='100%'
        mb='30px'
        fontWeight='bold'
        justifyContent='flex-start'
        alignItems='center'
        fontSize='11px'>
        <SimmmpleLogoWhite w='22px' h='22px' me='10px' mt='2px' />
        <Box
          bg='linear-gradient(97.89deg, #FFFFFF 70.67%, rgba(117, 122, 140, 0) 108.55%)'
          bgClip='text'>
          <Text fontSize='sm' letterSpacing='3px' mt='3px' color='transparent' whiteSpace='nowrap'>
            {logoText}
          </Text>
        </Box>
      </Link>
      <Separator></Separator>
    </Box>
  );

  // SIDEBAR
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef();
  // Color variables
  return (
    <Flex
      display={{ sm: "flex", xl: "none" }}
      ref={mainPanel}
      alignItems='center'>
      <HamburgerIcon
        color={iconColor}
        w='18px'
        h='18px'
        ref={btnRef}
        colorScheme='teal'
        onClick={onOpen}
      />
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement={document.documentElement.dir === "rtl" ? "right" : "left"}
        finalFocusRef={btnRef}>
        <DrawerOverlay />
        <DrawerContent
          backdropFilter='blur(10px)'
          bg='linear-gradient(111.84deg, rgba(6, 11, 38, 0.94) 59.3%, rgba(26, 31, 55, 0) 100%); '
          w='250px'
          maxW='250px'
          ms={{
            sm: "16px",
          }}
          my={{
            sm: "16px",
          }}
          borderRadius='16px'>
          <DrawerCloseButton
            color='white'
            _focus={{ boxShadow: "none" }}
            _hover={{ boxShadow: "none" }}
          />
          <DrawerBody maxW='250px' px='1rem'>
            <Box maxW='100%' h='100vh'>
              <Box>{brand}</Box>
              <Stack direction='column' mb='40px'>
                <Box>{links}</Box>
              </Stack>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}
// PROPS

Sidebar.propTypes = {
  logoText: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object),
  variant: PropTypes.string,
};
SidebarResponsive.propTypes = {
  logoText: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object),
};

export default Sidebar;
