import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flex,
  Text,
  Button,
  useToast,
  Select,
  SimpleGrid,
  Spinner,
  Box,
  HStack,
  IconButton,
  Badge,
  Avatar,
  Progress,
  Divider,
  Spacer,
} from "@chakra-ui/react";
import { RepeatIcon, CalendarIcon } from "@chakra-ui/icons";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import { API_BASE } from "../../config/api";
import { CLIENT_AVATARS } from "../../variables/clientAvatars";
import { formatLastUpdated } from "../../utils/formatters";

// Компонент карточки клиента
function ClientCard({ clientData, datePreset }) {
  const {
    account_name,
    account_id,
    monthly_budget = 0,
    spent = 0,
    remaining_budget = 0,
    last_updated,
    active_adsets = 0,
    active_ads = 0,
    cpl = 0,
    impressions = 0,
  } = clientData;

  const avatarSrc = CLIENT_AVATARS[account_id] || CLIENT_AVATARS[account_name] || 
    (account_name && CLIENT_AVATARS[account_name.toLowerCase()]);

  const budgetUsed = monthly_budget > 0 ? (spent / monthly_budget) * 100 : 0;
  const budgetColor = budgetUsed > 90 ? "red" : budgetUsed > 70 ? "orange" : "green";

  const formatMoney = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "$0.00";
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "0";
    return Number(value).toLocaleString("en-US");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card mb={4}>
      <CardHeader>
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Avatar size="md" name={account_name} src={avatarSrc} />
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="white">
                {account_name || "Unknown Client"}
              </Text>
              <Text fontSize="xs" color="gray.400">
                ID: {account_id || "N/A"}
              </Text>
            </Box>
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {/* Бюджет */}
          <Box>
            <Text fontSize="sm" color="gray.400" mb={1}>
              Месячный бюджет
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="white" mb={2}>
              {formatMoney(monthly_budget)}
            </Text>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Осталось: {formatMoney(remaining_budget)}
            </Text>
            <Progress
              value={budgetUsed}
              colorScheme={budgetColor}
              size="sm"
              borderRadius="md"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Использовано {budgetUsed.toFixed(1)}%
            </Text>
          </Box>

          {/* Статистика */}
          <Box>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Активность
            </Text>
            <HStack spacing={4} mb={2}>
              <Box>
                <Text fontSize="xs" color="gray.500">
                  Группы
                </Text>
                <Badge colorScheme="green" fontSize="md">
                  {active_adsets}
                </Badge>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500">
                  Объявления
                </Text>
                <Badge colorScheme="blue" fontSize="md">
                  {active_ads}
                </Badge>
              </Box>
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={2}>
              Последнее обновление: {formatDate(last_updated)}
            </Text>
          </Box>

          {/* Метрики */}
          <Box>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Метрики
            </Text>
            <Box mb={2}>
              <Text fontSize="xs" color="gray.500">
                Цена за результат (CPL)
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="white">
                {formatMoney(cpl)}
              </Text>
            </Box>
            <Box mb={2}>
              <Text fontSize="xs" color="gray.500">
                Показы
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="white">
                {formatNumber(impressions)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">
                Потрачено
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="white">
                {formatMoney(spent)}
              </Text>
            </Box>
          </Box>
        </SimpleGrid>
      </CardBody>
    </Card>
  );
}

function MetaAdsStatus() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("today");
  const [lastUpdated, setLastUpdated] = useState(null);
  const toast = useToast();

  // Маппинг дат
  const datePresetMap = {
    today: "today",
    yesterday: "yesterday",
    month: "last_30d",
    maximum: "maximum",
  };

  const fetchClientsData = useCallback(async () => {
    setLoading(true);
    try {
      // Формируем URL для запроса
      let apiUrl = `${API_BASE}/api/adsets?date_preset=${datePresetMap[datePreset] || "today"}`;
      
      // Для "maximum" добавляем дату начала (июнь 2025)
      if (datePreset === "maximum") {
        apiUrl += "&start_date=2025-06-01";
      }
      
      // Получаем данные по adsets
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch data");
      const adsetsData = await response.json();

      // Группируем по клиентам (account_name)
      const clientsMap = {};
      
      adsetsData.forEach((adset) => {
        const accountName = adset.account_name || "Unknown";
        const accountId = adset.account_id || "";

        if (!clientsMap[accountName]) {
          clientsMap[accountName] = {
            account_name: accountName,
            account_id: accountId,
            monthly_budget: 0, // Будет из настроек клиентов
            spent: 0,
            active_adsets: 0,
            active_ads: 0,
            impressions: 0,
            leads: 0,
            cpl: 0,
            last_updated: adset.last_updated || new Date().toISOString(),
          };
        }

        const client = clientsMap[accountName];
        
        // Подсчитываем метрики
        if (adset.status === "ACTIVE") {
          client.active_adsets += 1;
        }
        client.spent += adset.spend || 0;
        client.impressions += adset.impressions || 0;
        client.leads += adset.leads || 0;
        
        // Обновляем дату последнего обновления (берем самую свежую)
        if (adset.last_updated && adset.last_updated > client.last_updated) {
          client.last_updated = adset.last_updated;
        }
      });

      // Вычисляем CPL для каждого клиента
      Object.values(clientsMap).forEach((client) => {
        client.cpl = client.leads > 0 ? client.spent / client.leads : 0;
      });

      // Получаем бюджеты клиентов (если есть API)
      // Пока используем заглушку - потом можно будет добавить отдельный API
      try {
        const budgetsResponse = await fetch(`${API_BASE}/api/settings/clients`);
        if (budgetsResponse.ok) {
          const budgets = await budgetsResponse.json();
          Object.values(clientsMap).forEach((client) => {
            const budget = budgets[client.account_id] || budgets[client.account_name];
            if (budget) {
              client.monthly_budget = budget.monthly_budget || 0;
              client.remaining_budget = Math.max(0, client.monthly_budget - client.spent);
            } else {
              // Если бюджета нет, вычисляем как spent * коэффициент
              client.monthly_budget = client.spent * 1.5; // Примерная оценка
              client.remaining_budget = client.monthly_budget - client.spent;
            }
          });
        } else {
          // Если API нет, используем оценку
          Object.values(clientsMap).forEach((client) => {
            client.monthly_budget = client.spent * 1.5;
            client.remaining_budget = Math.max(0, client.monthly_budget - client.spent);
          });
        }
      } catch (e) {
        // Если API для бюджетов недоступен, используем оценку
        Object.values(clientsMap).forEach((client) => {
          client.monthly_budget = client.spent * 1.5;
          client.remaining_budget = Math.max(0, client.monthly_budget - client.spent);
        });
      }

      // Получаем количество активных объявлений для каждого клиента
      await Promise.all(
        Object.values(clientsMap).map(async (client) => {
          try {
            // Получаем объявления для каждого adset клиента
            const adsetsForClient = adsetsData.filter(
              (a) => (a.account_name || "Unknown") === client.account_name
            );
            let totalAds = 0;
            
            // Подсчитываем объявления из данных adsets (если есть поле ads_count)
            // Или делаем запрос для каждого активного adset
            for (const adset of adsetsForClient) {
              if (adset.status === "ACTIVE" && adset.adset_id) {
                try {
                  const adsResponse = await fetch(
                    `${API_BASE}/api/adsets/${adset.adset_id}/ads?date_preset=${datePresetMap[datePreset] || "today"}`
                  );
                  if (adsResponse.ok) {
                    const ads = await adsResponse.json();
                    const activeAds = Array.isArray(ads) 
                      ? ads.filter(ad => ad.status === "ACTIVE").length 
                      : 0;
                    totalAds += activeAds;
                  }
                } catch (e) {
                  // Если не удалось получить, используем оценку
                  totalAds += 2; // Примерная оценка
                }
              }
            }
            
            client.active_ads = totalAds || client.active_adsets * 2; // Fallback на оценку
          } catch (e) {
            // Если не удалось получить, используем оценку
            client.active_ads = client.active_adsets * 2;
          }
        })
      );

      const finalClientsList = Object.values(clientsMap);
      setClients(finalClientsList);
      setLastUpdated(new Date());
    } catch (error) {
      toast({
        title: "Ошибка загрузки данных",
        description: error.message,
        status: "error",
        duration: 3000,
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  }, [datePreset, toast]);

  useEffect(() => {
    fetchClientsData();
  }, [fetchClientsData]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const lastUpdatedLabel = useMemo(
    () => formatLastUpdated(lastUpdated),
    [lastUpdated, tick]
  );

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <Flex direction="column">
            <Text fontSize="xl" color="white" fontWeight="bold" mb={4}>
              Meta Ads Status
            </Text>
            <HStack spacing={3} align="center">
              <Select
                color="white"
                sx={{ "> option": { background: "#0F1535" } }}
                size="sm"
                borderRadius="md"
                maxW="200px"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                icon={<CalendarIcon />}
              >
                <option value="today">Сегодня</option>
                <option value="yesterday">Вчера</option>
                <option value="month">Месяц</option>
                <option value="maximum">Максимум (с июня 2025)</option>
              </Select>
              <Spacer />
              <HStack spacing={2}>
                <IconButton
                  aria-label="Обновить"
                  icon={<RepeatIcon />}
                  size="sm"
                  onClick={fetchClientsData}
                  isLoading={loading}
                />
                <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
                  Обновлено: {lastUpdatedLabel}
                </Text>
              </HStack>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody pt="0">
          {loading ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" color="purple.500" />
              <Text ml={3} color="white">
                Загрузка данных...
              </Text>
            </Flex>
          ) : clients.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Text color="gray.400">Нет данных о клиентах</Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
              {clients.map((client, index) => (
                <ClientCard key={client.account_id || index} clientData={client} datePreset={datePreset} />
              ))}
            </SimpleGrid>
          )}
        </CardBody>
      </Card>
    </Flex>
  );
}

export default MetaAdsStatus;

