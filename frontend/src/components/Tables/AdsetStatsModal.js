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
  const [timeInsights, setTimeInsights] = useState(null);
  const [timeInsightsLoading, setTimeInsightsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
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
      fetchTimeInsights();
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

  const fetchTimeInsights = async () => {
    if (!adset?.adset_id) {
      console.log("No adset_id found for time insights:", adset);
      return;
    }
    
    console.log("Fetching time insights for adset_id:", adset.adset_id);
    setTimeInsightsLoading(true);
    try {
      const url = `https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/time-insights`;
      console.log("Time insights URL:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to fetch time insights");
      }
      
      const data = await response.json();
      console.log("Received time insights data:", data);
      
      // Check if data is valid
      if (data && (data.hourly_averages || data.best_hours || data.worst_hours)) {
        setTimeInsights(data);
      } else {
        console.warn("Invalid time insights data received:", data);
        setTimeInsights({ error: "Получены некорректные данные" });
      }
    } catch (error) {
      console.error("Error fetching time insights:", error);
      setTimeInsights({ error: error.message || "Ошибка загрузки данных" });
    } finally {
      setTimeInsightsLoading(false);
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

  // Функции для определения трендов и цветов
  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return { icon: "→", color: "gray.500" };
    const change = ((current - previous) / previous) * 100;
    if (change > 10) return { icon: "↗", color: "green.500" };
    if (change > 0) return { icon: "↗", color: "green.400" };
    if (change < -10) return { icon: "↘", color: "red.500" };
    if (change < 0) return { icon: "↘", color: "red.400" };
    return { icon: "→", color: "gray.500" };
  };

  const getPerformanceColor = (value, type) => {
    if (type === 'leads') {
      if (value >= 10) return "green.500";
      if (value >= 5) return "green.400";
      if (value >= 1) return "yellow.500";
      return "red.500";
    }
    if (type === 'cpl') {
      if (value <= 1) return "green.500";
      if (value <= 2) return "green.400";
      if (value <= 5) return "yellow.500";
      return "red.500";
    }
    if (type === 'ctr') {
      if (value >= 5) return "green.500";
      if (value >= 2) return "green.400";
      if (value >= 1) return "yellow.500";
      return "red.500";
    }
    return "gray.500";
  };

  const getPreviousDayValue = (currentIndex, field) => {
    if (currentIndex >= statsData.length - 1) return null;
    return statsData[currentIndex + 1][field];
  };

  // AI Recommendations based on data analysis
  const generateAIRecommendations = () => {
    if (!statsData || statsData.length === 0) return [];
    
    try {
      const recommendations = [];
      const totals = calculateTotals();
      if (!totals) return [];
      
      const avgCpl = totals.cpl || 0;
      const avgLeads = statsData.length > 0 ? totals.leads / statsData.length : 0;
      const avgSpend = statsData.length > 0 ? totals.spent / statsData.length : 0;
    
    // CPL Analysis
    if (avgCpl > 5) {
      recommendations.push({
        type: "warning",
        icon: "⚠️",
        title: "Высокий CPL",
        description: `Средний CPL составляет $${avgCpl.toFixed(2)}. Рекомендуется оптимизировать таргетинг или креативы.`,
        action: "Оптимизировать таргетинг"
      });
    } else if (avgCpl < 1) {
      recommendations.push({
        type: "success",
        icon: "✅",
        title: "Отличный CPL",
        description: `Средний CPL $${avgCpl.toFixed(2)} - отличный результат!`,
        action: "Увеличить бюджет"
      });
    }
    
    // Leads Analysis
    if (avgLeads < 2) {
      recommendations.push({
        type: "warning",
        icon: "📉",
        title: "Низкое количество лидов",
        description: `Среднее количество лидов в день: ${avgLeads.toFixed(1)}. Рекомендуется расширить аудиторию.`,
        action: "Расширить аудиторию"
      });
    } else if (avgLeads > 10) {
      recommendations.push({
        type: "success",
        icon: "🚀",
        title: "Высокая конверсия",
        description: `Отличное количество лидов: ${avgLeads.toFixed(1)} в день!`,
        action: "Масштабировать кампанию"
      });
    }
    
    // Trend Analysis
    if (statsData.length >= 2) {
      const recentLeads = statsData[0].leads || 0;
      const previousLeads = statsData[1].leads || 0;
      const trend = previousLeads > 0 ? ((recentLeads - previousLeads) / previousLeads) * 100 : 0;
      
      if (trend < -20) {
        recommendations.push({
          type: "error",
          icon: "🔴",
          title: "Падение лидов",
          description: `Количество лидов упало на ${Math.abs(trend).toFixed(1)}% за последний день.`,
          action: "Проверить настройки"
        });
      } else if (trend > 50) {
        recommendations.push({
          type: "success",
          icon: "📈",
          title: "Рост лидов",
          description: `Количество лидов выросло на ${trend.toFixed(1)}%!`,
          action: "Увеличить бюджет"
        });
      }
    }
    
    // Budget Analysis
    if (avgSpend < 5) {
      recommendations.push({
        type: "info",
        icon: "💰",
        title: "Низкий бюджет",
        description: `Средний дневной бюджет: $${avgSpend.toFixed(2)}. Рекомендуется увеличить для лучших результатов.`,
        action: "Увеличить бюджет"
      });
    }
    
    // Time Efficiency Analysis
    if (timeInsights && timeInsights.best_hours && timeInsights.best_hours.length > 0) {
      const bestHour = timeInsights.best_hours[0];
      recommendations.push({
        type: "info",
        icon: "⏰",
        title: "Оптимальное время",
        description: `Лучший час для показа: ${bestHour.hour}:00-${bestHour.hour + 1}:00 (${bestHour.total_leads} лидов).`,
        action: "Сфокусировать показы"
      });
    }
    
      return recommendations.slice(0, 4); // Limit to 4 recommendations
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      return [];
    }
  };

  // Функции для сортировки
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!statsData || !sortConfig.key) return statsData;
    
    return [...statsData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxW="1200px">
        <ModalHeader>
          <Flex align="center" justify="space-between" w="full">
            <Flex align="center" gap={2}>
              <Icon as={FaChartLine} color="purple.500" />
              <Text>Детальная статистика</Text>
              <Badge colorScheme="purple" ml={2}>
                {adset?.adset_name || "Adset"}
              </Badge>
            </Flex>
            
            {/* Quick Actions */}
            <Flex gap={2}>
              <Button
                size="sm"
                colorScheme={adset?.status === "ACTIVE" ? "red" : "green"}
                variant="outline"
                onClick={() => {
                  // TODO: Implement pause/resume functionality
                  console.log("Toggle status for", adset?.adset_id);
                }}
              >
                {adset?.status === "ACTIVE" ? "Пауза" : "Запуск"}
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                variant="outline"
                onClick={() => {
                  // TODO: Implement budget increase
                  console.log("Increase budget for", adset?.adset_id);
                }}
              >
                + Бюджет
              </Button>
              <Button
                size="sm"
                colorScheme="purple"
                variant="outline"
                onClick={() => {
                  // TODO: Implement duplicate functionality
                  console.log("Duplicate", adset?.adset_id);
                }}
              >
                Дублировать
              </Button>
            </Flex>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          {/* AI Recommendations */}
          {statsData && statsData.length > 0 && (
            <Box mb={6}>
              <Text fontSize="lg" fontWeight="bold" mb={3} color={textColor}>
                🤖 AI-рекомендации
              </Text>
              
              <Flex wrap="wrap" gap={3}>
                {generateAIRecommendations().map((rec, index) => (
                  <Box
                    key={index}
                    p={4}
                    bg={useColorModeValue(
                      rec.type === "error" ? "red.50" : 
                      rec.type === "warning" ? "yellow.50" : 
                      rec.type === "success" ? "green.50" : "blue.50",
                      rec.type === "error" ? "red.900" : 
                      rec.type === "warning" ? "yellow.900" : 
                      rec.type === "success" ? "green.900" : "blue.900"
                    )}
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderLeftColor={
                      rec.type === "error" ? "red.500" : 
                      rec.type === "warning" ? "yellow.500" : 
                      rec.type === "success" ? "green.500" : "blue.500"
                    }
                    flex="1"
                    minW="300px"
                  >
                    <Flex align="start" gap={3}>
                      <Text fontSize="lg">{rec.icon}</Text>
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="bold" color={
                          rec.type === "error" ? "red.600" : 
                          rec.type === "warning" ? "yellow.600" : 
                          rec.type === "success" ? "green.600" : "blue.600"
                        }>
                          {rec.title}
                        </Text>
                        <Text fontSize="xs" color="gray.600" mt={1} mb={2}>
                          {rec.description}
                        </Text>
                        <Button
                          size="xs"
                          colorScheme={
                            rec.type === "error" ? "red" : 
                            rec.type === "warning" ? "yellow" : 
                            rec.type === "success" ? "green" : "blue"
                          }
                          variant="outline"
                          onClick={() => {
                            // TODO: Implement action
                            console.log("Action:", rec.action);
                          }}
                        >
                          {rec.action}
                        </Button>
                      </Box>
                    </Flex>
                  </Box>
                ))}
              </Flex>
            </Box>
          )}

          {loading ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" color="purple.500" />
              <Text ml={3}>Загрузка данных...</Text>
            </Flex>
          ) : statsData && statsData.length > 0 ? (
            <>
              <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor}
                          cursor="pointer"
                          onClick={() => handleSort('date')}
                        >
                          Дата {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor} 
                          isNumeric
                          cursor="pointer"
                          onClick={() => handleSort('leads')}
                        >
                          Leads {sortConfig.key === 'leads' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor} 
                          isNumeric
                          cursor="pointer"
                          onClick={() => handleSort('cpl')}
                        >
                          CPL {sortConfig.key === 'cpl' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor} 
                          isNumeric
                          cursor="pointer"
                          onClick={() => handleSort('cpm')}
                        >
                          CPM {sortConfig.key === 'cpm' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor} 
                          isNumeric
                          cursor="pointer"
                          onClick={() => handleSort('ctr')}
                        >
                          CTR {sortConfig.key === 'ctr' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor} 
                          isNumeric
                          cursor="pointer"
                          onClick={() => handleSort('frequency')}
                        >
                          Частота {sortConfig.key === 'frequency' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                        <Th 
                          borderColor={borderColor} 
                          color={textColor} 
                          isNumeric
                          cursor="pointer"
                          onClick={() => handleSort('spent')}
                        >
                          Spent {sortConfig.key === 'spent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {getSortedData().map((dayData, index) => {
                        const originalIndex = statsData.findIndex(item => item.date === dayData.date);
                        const leadsTrend = getTrendIndicator(dayData.leads, getPreviousDayValue(originalIndex, 'leads'));
                        const cplTrend = getTrendIndicator(dayData.cpl, getPreviousDayValue(originalIndex, 'cpl'));
                        const ctrTrend = getTrendIndicator(dayData.ctr, getPreviousDayValue(originalIndex, 'ctr'));
                        
                        return (
                          <Tr key={index}>
                            <Td borderColor={borderColor} color={textColor}>
                              <Text fontWeight="medium">
                                {dayData.label}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor} color={textColor} isNumeric>
                              <Flex align="center" justify="flex-end" gap={1}>
                                <Text color={getPerformanceColor(dayData.leads, 'leads')} fontWeight="medium">
                                  {formatNumber(dayData.leads)}
                                </Text>
                                <Text fontSize="sm" color={leadsTrend.color}>
                                  {leadsTrend.icon}
                                </Text>
                              </Flex>
                            </Td>
                            <Td borderColor={borderColor} color={textColor} isNumeric>
                              <Flex align="center" justify="flex-end" gap={1}>
                                <Text color={getPerformanceColor(dayData.cpl, 'cpl')} fontWeight="medium">
                                  {formatMoney(dayData.cpl)}
                                </Text>
                                <Text fontSize="sm" color={cplTrend.color}>
                                  {cplTrend.icon}
                                </Text>
                              </Flex>
                            </Td>
                            <Td borderColor={borderColor} color={textColor} isNumeric>
                              {formatMoney(dayData.cpm)}
                            </Td>
                            <Td borderColor={borderColor} color={textColor} isNumeric>
                              <Flex align="center" justify="flex-end" gap={1}>
                                <Text color={getPerformanceColor(dayData.ctr, 'ctr')} fontWeight="medium">
                                  {formatPercentage(dayData.ctr)}
                                </Text>
                                <Text fontSize="sm" color={ctrTrend.color}>
                                  {ctrTrend.icon}
                                </Text>
                              </Flex>
                            </Td>
                            <Td borderColor={borderColor} color={textColor} isNumeric>
                              {dayData.frequency ? dayData.frequency.toFixed(2) : "0.00"}
                            </Td>
                            <Td borderColor={borderColor} color={textColor} isNumeric>
                              {formatMoney(dayData.spent)}
                            </Td>
                          </Tr>
                        );
                      })}
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
              
              {/* Trend Chart Section */}
              <Box mt={6}>
                <Text fontSize="lg" fontWeight="bold" mb={3} color={textColor}>
                  График динамики
                </Text>
                
                {statsData && statsData.length > 0 ? (
                  <Box p={4} bg={useColorModeValue("gray.50", "gray.700")} borderRadius="md">
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      Тренд по Leads за последние дни
                    </Text>
                    
                    {/* Simple CSS Chart */}
                    <Box position="relative" h="200px" bg={useColorModeValue("white", "gray.800")} borderRadius="md" p={4}>
                      <Box position="relative" h="full" w="full">
                        {/* Y-axis labels */}
                        <Box position="absolute" left={0} top={0} h="full" w="40px">
                          {(() => {
                            const maxLeads = Math.max(...statsData.map(d => d.leads));
                            const steps = 5;
                            const stepValue = maxLeads / steps;
                            return Array.from({ length: steps + 1 }, (_, i) => (
                              <Text
                                key={i}
                                position="absolute"
                                top={`${(i / steps) * 100}%`}
                                fontSize="xs"
                                color="gray.500"
                                transform="translateY(-50%)"
                              >
                                {Math.round(stepValue * (steps - i))}
                              </Text>
                            ));
                          })()}
                        </Box>
                        
                        {/* Chart area */}
                        <Box position="absolute" left="40px" top={0} right={0} bottom={0}>
                          <Box position="relative" h="full" w="full">
                            {/* Grid lines */}
                            {Array.from({ length: 6 }, (_, i) => (
                              <Box
                                key={i}
                                position="absolute"
                                top={`${(i / 5) * 100}%`}
                                left={0}
                                right={0}
                                h="1px"
                                bg="gray.200"
                              />
                            ))}
                            
                            {/* Data points and lines */}
                            {(() => {
                              const maxLeads = Math.max(...statsData.map(d => d.leads || 0));
                              const minLeads = Math.min(...statsData.map(d => d.leads || 0));
                              const range = maxLeads - minLeads || 1;
                              
                              return statsData.map((day, index) => {
                                const x = statsData.length > 1 ? (index / (statsData.length - 1)) * 100 : 50;
                                const y = ((maxLeads - (day.leads || 0)) / range) * 100;
                                
                                return (
                                  <Box key={index}>
                                    {/* Data point */}
                                    <Box
                                      position="absolute"
                                      left={`${x}%`}
                                      top={`${y}%`}
                                      w="8px"
                                      h="8px"
                                      bg="purple.500"
                                      borderRadius="50%"
                                      transform="translate(-50%, -50%)"
                                    />
                                    
                                    {/* Data label */}
                                    <Text
                                      position="absolute"
                                      left={`${x}%`}
                                      top="100%"
                                      fontSize="xs"
                                      color="gray.600"
                                      transform="translateX(-50%)"
                                      mt={1}
                                    >
                                      {day.leads}
                                    </Text>
                                    
                                    {/* Date label */}
                                    <Text
                                      position="absolute"
                                      left={`${x}%`}
                                      top="100%"
                                      fontSize="xs"
                                      color="gray.500"
                                      transform="translateX(-50%)"
                                      mt={6}
                                    >
                                      {day.label.split(' ')[0]}
                                    </Text>
                                    
                                    {/* Connecting line - simplified */}
                                    {index > 0 && statsData.length > 1 && (
                                      <Box
                                        position="absolute"
                                        left={`${((index - 1) / (statsData.length - 1)) * 100}%`}
                                        top={`${((maxLeads - (statsData[index - 1].leads || 0)) / range) * 100}%`}
                                        w={`${100 / (statsData.length - 1)}%`}
                                        h="2px"
                                        bg="purple.300"
                                        transform="translateY(-50%)"
                                      />
                                    )}
                                  </Box>
                                );
                              });
                            })()}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Text color="gray.500" fontSize="sm">
                      Нет данных для графика
                    </Text>
                  </Box>
                )}
              </Box>
              
              {/* Time Efficiency Section */}
              <Box mt={6}>
                <Text fontSize="lg" fontWeight="bold" mb={3} color={textColor}>
                  Эффективность по времени
                </Text>
                
                {timeInsightsLoading ? (
                  <Flex justify="center" align="center" py={4}>
                    <Spinner size="md" color="purple.500" />
                    <Text ml={3}>Загрузка данных по времени...</Text>
                  </Flex>
                ) : timeInsights && !timeInsights.error && (timeInsights.hourly_averages && Object.keys(timeInsights.hourly_averages).length > 0) ? (
                  <Box>
                    {/* Best and Worst Hours */}
                    <Flex gap={6} mb={6}>
                      <Box flex={1} p={4} bg={useColorModeValue("green.50", "green.900")} borderRadius="md">
                        <Text fontSize="md" fontWeight="bold" color="green.600" mb={2}>
                          🏆 Лучшие часы
                        </Text>
                        {timeInsights.best_hours && timeInsights.best_hours.length > 0 ? (
                          <Box>
                            {timeInsights.best_hours.slice(0, 3).map((hour, index) => (
                              <Flex key={index} justify="space-between" align="center" py={1}>
                                <Text fontSize="sm">
                                  {hour.hour}:00 - {hour.hour + 1}:00
                                </Text>
                                <Text fontSize="sm" fontWeight="bold" color="green.600">
                                  {formatNumber(hour.total_leads)} leads
                                </Text>
                              </Flex>
                            ))}
                          </Box>
                        ) : (
                          <Text fontSize="sm" color="gray.500">Нет данных</Text>
                        )}
                      </Box>
                      
                      <Box flex={1} p={4} bg={useColorModeValue("red.50", "red.900")} borderRadius="md">
                        <Text fontSize="md" fontWeight="bold" color="red.600" mb={2}>
                          ⚠️ Худшие часы
                        </Text>
                        {timeInsights.worst_hours && timeInsights.worst_hours.length > 0 ? (
                          <Box>
                            {timeInsights.worst_hours.slice(0, 3).map((hour, index) => (
                              <Flex key={index} justify="space-between" align="center" py={1}>
                                <Text fontSize="sm">
                                  {hour.hour}:00 - {hour.hour + 1}:00
                                </Text>
                                <Text fontSize="sm" fontWeight="bold" color="red.600">
                                  {formatNumber(hour.total_leads)} leads
                                </Text>
                              </Flex>
                            ))}
                          </Box>
                        ) : (
                          <Text fontSize="sm" color="gray.500">Нет данных</Text>
                        )}
                      </Box>
                    </Flex>
                    
                    {/* Hourly Performance Chart */}
                    <Box>
                      <Flex justify="space-between" align="center" mb={3}>
                        <Text fontSize="md" fontWeight="bold" color={textColor}>
                          Производительность по часам (за все время)
                        </Text>
                        {timeInsights.total_days > 0 && (
                          <Text fontSize="sm" color="gray.500">
                            Проанализировано {timeInsights.total_days} дней
                            {timeInsights.date_range?.start && timeInsights.date_range?.end && (
                              <span> ({timeInsights.date_range.start} - {timeInsights.date_range.end})</span>
                            )}
                          </Text>
                        )}
                      </Flex>
                      <Box p={4} bg={useColorModeValue("gray.50", "gray.700")} borderRadius="md">
                        <Flex wrap="wrap" gap={2}>
                          {timeInsights.hourly_averages && Object.keys(timeInsights.hourly_averages).length > 0 ? (
                            Object.values(timeInsights.hourly_averages)
                              .sort((a, b) => a.hour - b.hour)
                              .map((hour) => {
                                const maxLeads = Math.max(...Object.values(timeInsights.hourly_averages).map(h => h.total_leads));
                                const intensity = maxLeads > 0 ? (hour.total_leads / maxLeads) : 0;
                                const bgColor = intensity > 0.7 ? "green.400" : intensity > 0.4 ? "yellow.400" : "gray.300";
                                
                                return (
                                  <Box
                                    key={hour.hour}
                                    p={2}
                                    bg={bgColor}
                                    borderRadius="md"
                                    minW="60px"
                                    textAlign="center"
                                  >
                                    <Text fontSize="xs" fontWeight="bold">
                                      {hour.hour}:00
                                    </Text>
                                    <Text fontSize="xs">
                                      {formatNumber(hour.total_leads)}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      leads
                                    </Text>
                                  </Box>
                                );
                              })
                          ) : (
                            <Text fontSize="sm" color="gray.500">Нет данных по часам</Text>
                          )}
                        </Flex>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Text color="gray.500" fontSize="sm" mb={2}>
                      {timeInsights && timeInsights.error 
                        ? `Ошибка загрузки данных: ${timeInsights.error}` 
                        : "Нет данных по эффективности времени"
                      }
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      variant="outline"
                      onClick={fetchTimeInsights}
                    >
                      Попробовать снова
                    </Button>
                  </Box>
                )}
              </Box>
            </>
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
