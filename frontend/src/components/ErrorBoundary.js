// src/components/ErrorBoundary.js
import React from "react";
import { Box, Button, Text, VStack, Code } from "@chakra-ui/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleClearStorage = () => {
    try {
      localStorage.removeItem("adsetTableColumnSizes");
      localStorage.removeItem("datePreset");
      localStorage.removeItem("selectedAccount");
      localStorage.removeItem("statusFilter");
      localStorage.removeItem("objectiveFilter");
      localStorage.removeItem("sortConfig");
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box p={8} bg="red.50" minH="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4} maxW="600px" align="stretch">
            <Text fontSize="2xl" fontWeight="bold" color="red.600">
              Произошла ошибка
            </Text>
            <Text color="gray.700">
              Дашборд не смог загрузиться. Это может быть связано с поврежденными данными в localStorage.
            </Text>
            {this.state.error && (
              <Box bg="white" p={4} borderRadius="md" border="1px solid" borderColor="red.200">
                <Text fontWeight="bold" mb={2} color="red.600">
                  Ошибка:
                </Text>
                <Code display="block" whiteSpace="pre-wrap" fontSize="xs" p={2} bg="gray.50">
                  {this.state.error.toString()}
                </Code>
              </Box>
            )}
            <VStack spacing={2} align="stretch">
              <Button colorScheme="red" onClick={this.handleClearStorage}>
                Очистить localStorage и перезагрузить
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Просто перезагрузить страницу
              </Button>
            </VStack>
            <Text fontSize="sm" color="gray.600">
              Если проблема сохраняется, откройте консоль браузера (F12) и проверьте ошибки.
            </Text>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

