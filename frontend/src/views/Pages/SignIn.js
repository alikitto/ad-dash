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

import React, { useState } from "react";
import {
  Box, Flex, Button, FormControl, FormLabel, Heading, Input,
  Link, Switch, Text, DarkMode, useToast
} from "@chakra-ui/react";
import signInImage from "assets/img/signInImage.png";
import AuthFooter from "components/Footer/AuthFooter";
import GradientBorder from "components/GradientBorder/GradientBorder";

// ИЗМЕНЕНИЕ: Объединили два импорта в один
import { useHistory, Link as RouterLink } from "react-router-dom";

function SignIn() {
  const titleColor = "white";
  const textColor = "gray.400";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const history = useHistory();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("https://ad-dash-backend-production.up.railway.app/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to sign in" }));
        throw new Error(errorData.detail);
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.access_token); // Сохраняем токен
      toast({ title: "Successfully signed in!", status: "success", duration: 2000, isClosable: true, position: "top" });
      history.push("/admin/stats"); // Редирект на главную страницу
      
    } catch (error) {
        toast({ title: "Sign in failed", description: error.message, status: "error", duration: 3000, isClosable: true, position: "top" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Flex position='relative'>
      <Flex
        minH='100vh' h={{ base: "120vh", lg: "fit-content" }} w='100%' maxW='1044px' mx='auto'
        pt={{ sm: "100px", md: "0px" }} flexDirection='column' me={{ base: "auto", lg: "50px", xl: "auto" }}>
        <Flex
          alignItems='center' justifyContent='start' style={{ userSelect: "none" }} mx={{ base: "auto", lg: "unset" }}
          ms={{ base: "auto", lg: "auto" }} w={{ base: "100%", md: "50%", lg: "450px" }} px='50px'>
          <Flex
            as="form" 
            onSubmit={handleSubmit}
            direction='column' w='100%' background='transparent'
            mt={{ base: "50px", md: "150px", lg: "160px", xl: "245px" }}
            mb={{ base: "60px", lg: "95px" }}>
            <Heading color={titleColor} fontSize='32px' mb='10px'>
              Nice to see you!
            </Heading>
            <Text mb='36px' ms='4px' color={textColor} fontWeight='bold' fontSize='14px'>
              Enter your email and password to sign in
            </Text>
            <FormControl>
              <FormLabel ms='4px' fontSize='sm' fontWeight='normal' color='white'>
                Email
              </FormLabel>
              <GradientBorder mb='24px' w={{ base: "100%", lg: "fit-content" }} borderRadius='20px'>
                <Input
                  color='white' bg='rgb(19,21,54)' border='transparent' borderRadius='20px'
                  fontSize='sm' size='lg' w={{ base: "100%", md: "346px" }} maxW='100%'
                  placeholder='Your email address'
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isRequired
                />
              </GradientBorder>
            </FormControl>
            <FormControl>
              <FormLabel ms='4px' fontSize='sm' fontWeight='normal' color='white'>
                Password
              </FormLabel>
              <GradientBorder mb='24px' w={{ base: "100%", lg: "fit-content" }} borderRadius='20px'>
                <Input
                  color='white' bg='rgb(19,21,54)' border='transparent' borderRadius='20px'
                  fontSize='sm' size='lg' w={{ base: "100%", md: "346px" }} maxW='100%'
                  type='password'
                  placeholder='Your password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isRequired
                />
              </GradientBorder>
            </FormControl>
            <FormControl display='flex' alignItems='center'>
              <DarkMode>
                <Switch id='remember-login' colorScheme='brand' me='10px' />
              </DarkMode>
              <FormLabel htmlFor='remember-login' mb='0' ms='1' fontWeight='normal' color='white'>
                Remember me
              </FormLabel>
            </FormControl>
            <Button
              variant='brand' fontSize='10px' type='submit' w='100%' maxW='350px'
              h='45' mb='20px' mt='20px' isLoading={isLoading}>
              SIGN IN
            </Button>
            <Flex
              flexDirection='column' justifyContent='center' alignItems='center'
              maxW='100%' mt='0px'>
            <Text color={textColor} fontWeight='medium'>
              Don't have an account?
                <Link as={RouterLink} to="/auth/signup" color={titleColor} ms='5px' fontWeight='bold'>
                  Sign Up
                </Link>
            </Text>
            </Flex>
          </Flex>
        </Flex>
        <Box w={{ base: "335px", md: "450px" }} mx={{ base: "auto", lg: "unset" }} ms={{ base: "auto", lg: "auto" }} mb='80px'>
          <AuthFooter />
        </Box>
        <Box
          display={{ base: "none", lg: "block" }} overflowX='hidden' h='100%'
          maxW={{ md: "50vw", lg: "50vw" }} minH='100vh' w='960px' position='absolute' left='0px'>
          <Box
            bgImage={signInImage} w='100%' h='100%' bgSize='cover' bgPosition='50%'
            position='absolute' display='flex' flexDirection='column' justifyContent='center'
            alignItems='center'>
            <Text
              textAlign='center' color='white' letterSpacing='8px'
              fontSize='20px' fontWeight='500'>
              INSPIRED BY THE FUTURE:
            </Text>
            <Text
              textAlign='center' color='transparent' letterSpacing='8px' fontSize='36px'
              fontWeight='bold' bgClip='text !important' bg='linear-gradient(94.56deg, #FFFFFF 79.99%, #21242F 102.65%)'>
              THE VISION UI DASHBOARD
            </Text>
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}

export default SignIn;
