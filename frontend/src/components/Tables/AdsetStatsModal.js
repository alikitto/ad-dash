import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Spinner,
  Box,
  useColorModeValue,
  Badge,
  Flex,
  Icon,
  Button,
  Select,
} from "@chakra-ui/react";
import { FaChartLine, FaCalendarAlt } from "react-icons/fa";

const AdsetStatsModal = ({ isOpen, onClose, adset }) => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("last_7d");
  
  const bgColor = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const periodOptions = [
    { value: "today", label: "Сегодня" },
    { value: "yesterday", label: "Вчера" },
    { value: "last_3d", label: "Позавчера" },
    { value: "last_7d", label: "Неделя" },
    { value: "last_30d", label: "Все время" },
  ];

  useEffect(() => {
    if (isOpen && adset) {
      console.log("AdsetStatsModal opened with adset:", adset);
      console.log("Adset ID:", adset.adset_id);
      fetchAdsetStats();
    }
  }, [isOpen, adset, selectedPeriod]);

  const fetchAdsetStats = async () => {
    if (!adset?.adset_id) {
      console.log("No adset_id found in adset:", adset);
      return;
    }
    
    console.log("Fetching stats for adset_id:", adset.adset_id);
    setLoading(true);
    try {
      const url = `https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/stats?date_preset=${selectedPeriod}`;
      console.log("Request URL:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      
      const data = await response.json();
      console.log("Received stats data:", data);
      setStatsData(data);
    } catch (error) {
      console.error("Error fetching adset stats:", error);
      setStatsData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "$0.00";
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "0";
    return Number(value).toLocaleString("en-US");
  };

  const formatPercentage = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "0.00%";
    return `${value.toFixed(2)}%`;
  };

  const getPeriodLabel = (value) => {
    const option = periodOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxW="800px">
        <ModalHeader>
          <Flex align="center" gap={2}>
            <Icon as={FaChartLine} color="purple.500" />
            <Text>Детальная статистика</Text>
            <Badge colorScheme="purple" ml={2}>
              {adset?.adset_name || "Adset"}
            </Badge>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <Box mb={4}>
            <Flex align="center" gap={3} mb={3}>
              <Icon as={FaCalendarAlt} color="gray.500" />
              <Text fontSize="sm" color="gray.600">
                Период:
              </Text>
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                size="sm"
                width="150px"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Flex>
          </Box>

          {loading ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" color="purple.500" />
              <Text ml={3}>Загрузка данных...</Text>
            </Flex>
          ) : statsData ? (
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th borderColor={borderColor} color={textColor}>Период</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>Leads</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>CPL</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>CPM</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>CTR</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>Spent</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {statsData.map((period, index) => (
                    <Tr key={index}>
                      <Td borderColor={borderColor} color={textColor}>
                        <Text fontWeight="medium">
                          {getPeriodLabel(period.period)}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatNumber(period.leads)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatMoney(period.cpl)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatMoney(period.cpm)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatPercentage(period.ctr)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatMoney(period.spent)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          ) : (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">
                Не удалось загрузить данные статистики
              </Text>
              <Button
                mt={3}
                colorScheme="purple"
                size="sm"
                onClick={fetchAdsetStats}
              >
                Попробовать снова
              </Button>
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default AdsetStatsModal;
