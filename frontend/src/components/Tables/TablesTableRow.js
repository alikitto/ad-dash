// --- Файл: frontend/src/components/Tables/TablesTableRow.js ---

import React from "react";
import {
  Avatar,
  Badge,
  Button,
  Flex,
  Td,
  Text,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";

function TablesTableRow(props) {
  const {
    logo,
    name,
    email,
    subdomain,
    domain,
    status,
    date,
  } = props;
  const textColor = useColorModeValue("gray.700", "white");
  const bgStatus = useColorModeValue("gray.400", "#1a202c");
  const colorStatus = useColorModeValue("white", "white");

  return (
    <Tr>
      {/* 1. Колонка: КАМПАНИЯ / КАБИНЕТ */}
      <Td minWidth={{ sm: "250px" }} pl="0px">
        <Flex align="center" py=".8rem" minWidth="100%" flexWrap="nowrap">
          <Avatar src={logo} w="50px" borderRadius="12px" me="18px" />
          <Flex direction="column">
            <Text
              fontSize="md"
              color={textColor}
              fontWeight="bold"
              minWidth="100%"
            >
              {name}
            </Text>
            <Text fontSize="sm" color="gray.400" fontWeight="normal">
              {email}
            </Text>
          </Flex>
        </Flex>
      </Td>

      {/* 2. Колонка: ЦЕЛЬ */}
      <Td>
        <Text fontSize="md" color={textColor} fontWeight="bold" pb=".5rem">
          {domain}
        </Text>
      </Td>
      
      {/* 3. Колонка: СТАТУС */}
      <Td>
        <Badge
          bg={status === "ACTIVE" ? "green.400" : bgStatus}
          color={colorStatus}
          fontSize="16px"
          p="3px 10px"
          borderRadius="8px"
        >
          {status}
        </Badge>
      </Td>

      {/* 4. Колонка: РАСХОД / ЛИДЫ / CPL */}
      <Td>
        <Text fontSize="md" color={textColor} fontWeight="bold">
          {date}
        </Text>
      </Td>

      {/* 5. Колонка: ДЕЙСТВИЯ (например, кнопка) */}
      <Td>
        <Button p="0px" bg="transparent" variant="no-hover">
          <Text
            fontSize="md"
            color="gray.400"
            fontWeight="bold"
            cursor="pointer"
          >
            Details
          </Text>
        </Button>
      </Td>
    </Tr>
  );
}

export default TablesTableRow;
