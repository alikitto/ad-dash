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
  Image,
  Avatar,
} from "@chakra-ui/react";
import { FaChartLine } from "react-icons/fa";

const AdsetStatsModal = ({ isOpen, onClose, adset }) => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creativesData, setCreativesData] = useState(null);
  const [creativesLoading, setCreativesLoading] = useState(false);
  
  const bgColor = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const totalsBgColor = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    if (isOpen && adset) {
      console.log("AdsetStatsModal opened with adset:", adset);
      console.log("Adset ID:", adset.adset_id);
      fetchAdsetStats();
      fetchCreatives();
    }
  }, [isOpen, adset]);

  const fetchAdsetStats = async () => {
    if (!adset?.adset_id) {
      console.log("No adset_id found in adset:", adset);
      return;
    }
    
    console.log("Fetching stats for adset_id:", adset.adset_id);
    setLoading(true);
    try {
      const url = `https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/stats`;
      console.log("Request URL:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      
      const data = await response.json();
      console.log("Received stats data:", data);
      console.log("Stats data type:", typeof data);
      console.log("Stats data is array:", Array.isArray(data));
      console.log("Stats data length:", data?.length);
      setStatsData(data);
    } catch (error) {
      console.error("Error fetching adset stats:", error);
      setStatsData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatives = async () => {
    if (!adset?.adset_id) {
      console.log("No adset_id found for creatives:", adset);
      return;
    }
    
    console.log("Fetching creatives for adset_id:", adset.adset_id);
    setCreativesLoading(true);
    try {
      const url = `https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/ads?date_preset=maximum`;
      console.log("Creatives URL:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to fetch creatives");
      }
      
      const data = await response.json();
      console.log("Received creatives data:", data);
      setCreativesData(data);
    } catch (error) {
      console.error("Error fetching creatives:", error);
      setCreativesData(null);
    } finally {
      setCreativesLoading(false);
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

  const calculateTotals = () => {
    if (!statsData || statsData.length === 0) return null;
    
    const totals = statsData.reduce((acc, day) => ({
      leads: acc.leads + day.leads,
      spent: acc.spent + day.spent,
      impressions: acc.impressions + day.impressions
    }), { leads: 0, spent: 0, impressions: 0 });
    
    return {
      ...totals,
      cpl: totals.leads > 0 ? totals.spent / totals.leads : 0,
      cpm: totals.impressions > 0 ? (totals.spent / totals.impressions) * 1000 : 0,
      ctr: 0, // CTR нужно вычислять по-другому
      frequency: statsData.reduce((acc, day) => acc + (day.frequency || 0), 0) / statsData.length
    };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxW="1200px">
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

          {loading ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" color="purple.500" />
              <Text ml={3}>Загрузка данных...</Text>
            </Flex>
          ) : statsData && statsData.length > 0 ? (
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th borderColor={borderColor} color={textColor}>Дата</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>Leads</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>CPL</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>CPM</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>CTR</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>Частота</Th>
                    <Th borderColor={borderColor} color={textColor} isNumeric>Spent</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {statsData.map((dayData, index) => (
                    <Tr key={index}>
                      <Td borderColor={borderColor} color={textColor}>
                        <Text fontWeight="medium">
                          {dayData.label}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatNumber(dayData.leads)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatMoney(dayData.cpl)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatMoney(dayData.cpm)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatPercentage(dayData.ctr)}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {dayData.frequency ? dayData.frequency.toFixed(2) : "0.00"}
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        {formatMoney(dayData.spent)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            
            {/* Totals row */}
            {calculateTotals() && (
              <Box mt={4} pt={4} borderTop="1px solid" borderColor={borderColor}>
                <Table variant="simple" size="sm">
                  <Tbody>
                    <Tr bg={totalsBgColor}>
                      <Td borderColor={borderColor} color={textColor}>
                        <Text fontWeight="bold" fontSize="sm">
                          Всего
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        <Text fontWeight="bold" fontSize="sm">
                          {formatNumber(calculateTotals().leads)}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        <Text fontWeight="bold" fontSize="sm">
                          {formatMoney(calculateTotals().cpl)}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        <Text fontWeight="bold" fontSize="sm">
                          {formatMoney(calculateTotals().cpm)}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        <Text fontWeight="bold" fontSize="sm">
                          {formatPercentage(calculateTotals().ctr)}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        <Text fontWeight="bold" fontSize="sm">
                          {calculateTotals().frequency.toFixed(2)}
                        </Text>
                      </Td>
                      <Td borderColor={borderColor} color={textColor} isNumeric>
                        <Text fontWeight="bold" fontSize="sm">
                          {formatMoney(calculateTotals().spent)}
                        </Text>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            )}
            
            {/* Creatives Table */}
            <Box mt={6}>
              <Text fontSize="lg" fontWeight="bold" mb={3} color={textColor}>
                Креативы
              </Text>
              
              {creativesLoading ? (
                <Flex justify="center" align="center" py={4}>
                  <Spinner size="md" color="purple.500" />
                  <Text ml={3}>Загрузка креативов...</Text>
                </Flex>
              ) : creativesData && creativesData.length > 0 ? (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th borderColor={borderColor} color={textColor}>Креатив</Th>
                        <Th borderColor={borderColor} color={textColor}>Статус</Th>
                        <Th borderColor={borderColor} color={textColor} isNumeric>Leads</Th>
                        <Th borderColor={borderColor} color={textColor} isNumeric>CPA</Th>
                        <Th borderColor={borderColor} color={textColor} isNumeric>CPM</Th>
                        <Th borderColor={borderColor} color={textColor} isNumeric>CTR</Th>
                        <Th borderColor={borderColor} color={textColor} isNumeric>Частота</Th>
                        <Th borderColor={borderColor} color={textColor} isNumeric>Spent</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {creativesData.map((creative, index) => (
                        <Tr key={index}>
                          <Td borderColor={borderColor} color={textColor}>
                            <Flex align="center" gap={3}>
                              {creative.thumbnail_url ? (
                                <Image 
                                  src={creative.thumbnail_url} 
                                  alt="" 
                                  boxSize="40px" 
                                  borderRadius="md" 
                                  objectFit="cover" 
                                />
                              ) : (
                                <Avatar size="sm" name={creative.ad_name} />
                              )}
                              <Text fontSize="sm" noOfLines={2}>
                                {creative.ad_name}
                              </Text>
                            </Flex>
                          </Td>
                          <Td borderColor={borderColor} color={textColor}>
                            <Badge 
                              colorScheme={creative.status === "ACTIVE" ? "green" : "red"} 
                              size="sm"
                            >
                              {creative.status}
                            </Badge>
                          </Td>
                          <Td borderColor={borderColor} color={textColor} isNumeric>
                            {formatNumber(creative.leads)}
                          </Td>
                          <Td borderColor={borderColor} color={textColor} isNumeric>
                            {formatMoney(creative.cpa)}
                          </Td>
                          <Td borderColor={borderColor} color={textColor} isNumeric>
                            {formatMoney(creative.cpm)}
                          </Td>
                          <Td borderColor={borderColor} color={textColor} isNumeric>
                            {formatPercentage(creative.ctr)}
                          </Td>
                          <Td borderColor={borderColor} color={textColor} isNumeric>
                            {creative.frequency ? creative.frequency.toFixed(2) : "0.00"}
                          </Td>
                          <Td borderColor={borderColor} color={textColor} isNumeric>
                            {formatMoney(creative.spend)}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <Text color="gray.500" fontSize="sm">
                    Нет креативов для отображения
                  </Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">
                {statsData === null ? "Не удалось загрузить данные статистики" : "Нет данных для отображения"}
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
