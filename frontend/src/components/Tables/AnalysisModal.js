// src/components/Tables/AnalysisModal.js (Final, safe version)

import React from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Box, Text, VStack, HStack, Tag, Icon, useColorModeValue,
} from "@chakra-ui/react";
import { FaHighlighter, FaLightbulb, FaExclamationTriangle } from "react-icons/fa";

const PriorityTag = ({ priority }) => {
  const colors = {
    high: { scheme: "red", icon: FaExclamationTriangle },
    medium: { scheme: "orange", icon: FaLightbulb },
    low: { scheme: "blue", icon: FaHighlighter },
  };
  const { scheme, icon } = colors[priority] || colors.low;
  return (
    <Tag size="sm" colorScheme={scheme} variant="solid" borderRadius="full">
      <HStack spacing={1.5}>
        <Icon as={icon} />
        <Text>{priority}</Text>
      </HStack>
    </Tag>
  );
};

function AnalysisModal({ isOpen, onClose, data }) {
  const textColor = useColorModeValue("gray.700", "white");
  const headerColor = useColorModeValue("gray.800", "white");
  const bgColor = useColorModeValue("white", "#1A202C");

  if (!data) return null;

  // --- SAFEGUARD ADDED HERE ---
  // This ensures 'insights' and 'recommendations' are always arrays,
  // preventing crashes if the AI returns a string or null.
  const insights = Array.isArray(data?.insights) ? data.insights : [];
  const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
  // --- END OF SAFEGUARD ---

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader color={headerColor}>AI-Powered Analysis</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            {/* 1. Summary */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2} color={headerColor}>
                Executive Summary
              </Text>
              <Box
                color={textColor}
                className="ai-summary"
                dangerouslySetInnerHTML={{ __html: data.summary || "" }}
                sx={{
                  "& p": { marginBottom: "0.5rem" },
                  "& strong": { fontWeight: "semibold" },
                }}
              />
            </Box>

            {/* 2. Key Insights */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2} color={headerColor}>
                Key Insights
              </Text>
              <VStack align="stretch" spacing={2}>
                {insights.map((insight, index) => (
                  <Text key={index} color={textColor}>• {insight}</Text>
                ))}
              </VStack>
            </Box>

            {/* 3. Recommendations */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2} color={headerColor}>
                Recommendations
              </Text>
              <VStack align="stretch" spacing={3}>
                {recommendations.map((rec, index) => (
                  <HStack key={index} align="start" spacing={3}>
                    <PriorityTag priority={rec.priority} />
                    <Text pt="1px" color={textColor}>{rec.text}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Got it
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AnalysisModal;
