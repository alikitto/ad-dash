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
import { useHistory, Link as RouterLink } from "react-router-dom";

// Chakra imports
import {
  Box,
  Flex,
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  Text,
  useToast,
  Heading,
} from "@chakra-ui/react";

// Custom Components
import AuthFooter from "components/Footer/AuthFooter";
import GradientBorder from "components/GradientBorder/GradientBorder";

// Assets
import signUpImage from "assets/img/signUpImage.png";
import { API_BASE } from "../../config/api";

function SignUp() {
  const titleColor = "white";
  const textColor = "gray.400";
  const [name, setName] = useState(""); // <-- 1. Добавили состояние для имени
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const history = useHistory();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }), // <-- 2. Добавили имя в тело запроса
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Registration failed" }));
        throw new Error(errorData.detail);
      }
      
      toast({
        title: "Account created!",
        description: "Your account has been successfully created. Please sign in.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      history.push("/auth/signin"); // Редирект на страницу входа

    } catch (error) {
      toast({
        title: "Registration failed.",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex position='relative' overflow={{ lg: "hidden" }}>
      <Flex
        flexDirection='column' h={{ sm: "initial", md: "unset" }} w={{ base: "90%" }}
        maxW='1044px' mx='auto' justifyContent='space-between' pt={{ sm: "100px", md: "0px" }}
        me={{ base: "auto", lg: "50px", xl: "auto" }}>
        <Flex
          alignItems='center' justifyContent='start' style={{ userSelect: "none" }}
          flexDirection='column' mx={{ base: "auto", lg: "unset" }} ms={{ base: "auto", lg: "auto" }}
          mb='50px' w={{ base: "100%", md: "50%", lg: "42%" }}>
          <Flex
            direction='column' textAlign='center' justifyContent='center' align='center'
            mt={{ base: "60px", md: "140px", lg: "200px" }} mb='50px'>
            <Heading color='white' fontSize='4xl' fontWeight='bold'>
              Welcome!
            </Heading>
            <Text fontSize='md' color='white' fontWeight='normal' mt='10px' w={{ base: "100%", md: "90%", lg: "90%", xl: "80%" }}>
              Create a new account to manage your ad campaigns.
            </Text>
          </Flex>
          <GradientBorder p='2px' me={{ base: "none", lg: "30px", xl: "none" }}>
            <Flex
              as="form"
              onSubmit={handleSubmit}
              background='transparent' borderRadius='30px' direction='column' p='40px'
              minW={{ base: "unset", md: "430px", xl: "450px" }} w='100%' mx={{ base: "0px" }}
              bg={{ base: "rgb(19,21,56)" }}>
              <Heading color={titleColor} fontSize='2xl' mb='36px' textAlign="center">
                Create Account
              </Heading>
              <FormControl>
                {/* 👇 -- 3. Вернули поле "Имя" в форму -- 👇 */}
                <FormLabel color={titleColor} ms='4px' fontSize='sm' fontWeight='normal'>Name</FormLabel>
                <GradientBorder mb='24px' h='50px' w='100%' borderRadius='20px'>
                  <Input
                    color={titleColor} bg={{ base: "rgb(19,21,54)" }} border='transparent'
                    borderRadius='20px' fontSize='sm' size='lg' w='100%' h='46px'
                    type='text' placeholder='Your name'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    isRequired
                  />
                </GradientBorder>
                {/* 👆 -------------------------------- 👆 */}
                <FormLabel color={titleColor} ms='4px' fontSize='sm' fontWeight='normal'>Email</FormLabel>
                <GradientBorder mb='24px' h='50px' w='100%' borderRadius='20px'>
                  <Input
                    color={titleColor} bg={{ base: "rgb(19,21,54)" }} border='transparent'
                    borderRadius='20px' fontSize='sm' size='lg' w='100%' h='46px'
                    type='email' placeholder='Your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isRequired
                  />
                </GradientBorder>
                <FormLabel color={titleColor} ms='4px' fontSize='sm' fontWeight='normal'>Password</FormLabel>
                <GradientBorder mb='24px' h='50px' w='100%' borderRadius='20px'>
                  <Input
                    color={titleColor} bg={{ base: "rgb(19,21,54)" }} border='transparent'
                    borderRadius='20px' fontSize='sm' size='lg' w='100%' h='46px'
                    type='password' placeholder='Your password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isRequired
                  />
                </GradientBorder>
                <Button
                  variant='brand' fontSize='12px' type='submit' w='100%' h='45'
                  mb='20px' mt='20px' isLoading={isLoading}>
                  SIGN UP
                </Button>
              </FormControl>
              <Flex
                flexDirection='column' justifyContent='center' alignItems='center'
                maxW='100%' mt='0px'>
                <Text color={textColor} fontWeight='medium'>
                  Already have an account?
                  <Link
                    as={RouterLink}
                    to="/auth/signin"
                    color={titleColor}
                    ms='5px'
                    fontWeight='bold'>
                    Sign In
                  </Link>
                </Text>
              </Flex>
            </Flex>
          </GradientBorder>
        </Flex>
        <Box w={{ base: "335px", md: "450px" }} mx={{ base: "auto", lg: "unset" }} ms={{ base: "auto", lg: "auto" }} mb='90px'>
          <AuthFooter />
        </Box>
        <Box
          display={{ base: "none", lg: "block" }} overflowX='hidden' h='1300px'
          maxW={{ md: "50vw", lg: "48vw" }} w='960px' position='absolute' left='0px'>
          <Box
            bgImage={signUpImage} w='100%' h='1300px' bgSize='cover' bgPosition='50%'
            position='absolute' display='flex' flexDirection='column'
            justifyContent='center' alignItems='center'>
            <Text
              textAlign='center' color='white' letterSpacing='8px' fontSize='20px'
              fontWeight='500'>
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

export default SignUp;
