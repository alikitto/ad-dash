// src/views/Pages/SignIn.js
import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // Для редиректа
import {
  Box, Flex, Button, FormControl, FormLabel, Heading, Input,
  Link, Switch, Text, DarkMode, useToast
} from "@chakra-ui/react";
import signInImage from "assets/img/signInImage.png";
import AuthFooter from "components/Footer/AuthFooter";
import GradientBorder from "components/GradientBorder/GradientBorder";

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
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sign in");
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.access_token); // Сохраняем токен
      toast({ title: "Successfully signed in!", status: "success", duration: 2000, isClosable: true });
      history.push("/admin/stats"); // Редирект на главную страницу
      
    } catch (error) {
        toast({ title: "Sign in failed", description: error.message, status: "error", duration: 3000, isClosable: true });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Flex position='relative'>
      <Flex /* ... остальная верстка без изменений ... */ >
        <Flex /* ... */ >
          <Flex as="form" onSubmit={handleSubmit} direction='column' w='100%' /* ... */>
            {/* ... Заголовки ... */}
            <FormControl>
              <FormLabel ms='4px' fontSize='sm' fontWeight='normal' color='white'>Email</FormLabel>
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
              <FormLabel ms='4px' fontSize='sm' fontWeight='normal' color='white'>Password</FormLabel>
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
            {/* ... Remember me ... */}
            <Button
              variant='brand' fontSize='10px' type='submit' w='100%'
              maxW='350px' h='45' mb='20px' mt='20px'
              isLoading={isLoading}>
              SIGN IN
            </Button>
            {/* ... Sign Up Link ... */}
          </Flex>
        </Flex>
        {/* ... Footer и правый блок с картинкой ... */}
      </Flex>
    </Flex>
  );
}

export default SignIn;
