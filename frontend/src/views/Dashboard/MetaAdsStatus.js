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
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";
import { RepeatIcon, CalendarIcon } from "@chakra-ui/icons";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import { API_BASE } from "../../config/api";
import { CLIENT_AVATARS } from "../../variables/clientAvatars";
import { formatLastUpdated } from "../../utils/formatters";

const USD_TO_AZN = 1.7;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const normalizeKey = (value) => (value ? String(value).trim().toLowerCase() : "");

const getPresetDays = (preset) => {
  switch (preset) {
    case "today":
    case "yesterday":
      return 1;
    case "month":
      return 30;
    case "maximum":
      return 60;
    default:
      return 7;
  }
};

const computeCycleMetrics = (crm, spendUSD) => {
  if (!crm?.monthly_payment_azn || !crm?.start_date) {
    return {
      cycleDays: null,
      daysElapsed: null,
      plannedDailyAZN: null,
      actualDailyAZN: null,
      remainingAZN: null,
      cycleSpendAZN: spendUSD * USD_TO_AZN,
    };
  }
  const today = new Date();
  const startDate = new Date(crm.start_date);
  if (isNaN(startDate)) {
    return {
      cycleDays: null,
      daysElapsed: null,
      plannedDailyAZN: null,
      actualDailyAZN: null,
      remainingAZN: null,
      cycleSpendAZN: spendUSD * USD_TO_AZN,
    };
  }
  const startDay = startDate.getDate();
  let cycleStart = new Date(today.getFullYear(), today.getMonth(), startDay);
  if (today < cycleStart) {
    cycleStart.setMonth(cycleStart.getMonth() - 1);
  }
  const nextCycle = new Date(cycleStart);
  nextCycle.setMonth(nextCycle.getMonth() + 1);
  const cycleDays = Math.max(1, Math.round((nextCycle - cycleStart) / MS_IN_DAY));
  const daysElapsed = Math.max(1, Math.min(cycleDays, Math.round((today - cycleStart) / MS_IN_DAY)));
  const plannedDailyAZN = crm.monthly_payment_azn / cycleDays;
  const cycleSpendAZN = spendUSD * USD_TO_AZN;
  const actualDailyAZN = cycleSpendAZN / daysElapsed;
  const remainingAZN = crm.monthly_payment_azn - cycleSpendAZN;
  return {
    cycleDays,
    daysElapsed,
    plannedDailyAZN,
    actualDailyAZN,
    remainingAZN,
    cycleSpendAZN,
    cycleStart: cycleStart.toISOString(),
    nextCycle: nextCycle.toISOString(),
  };
};

// Компонент карточки клиента
function ClientCard({ clientData, onOpenDetails }) {
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
    displayAvatar,
    crm,
    plannedDailyAZN,
    actualDailyAZN,
    remainingAZN,
    cycleDays,
    daysElapsed,
    cycleSpendAZN,
    monthly_payment_azn = 0,
    periodDays,
    avgDailyUSD,
    avgDailyAZN,
  } = clientData;

  const avatarSrc =
    displayAvatar ||
    CLIENT_AVATARS[account_id] ||
    CLIENT_AVATARS[account_name] ||
    (account_name && CLIENT_AVATARS[account_name.toLowerCase()]);

  const budgetUsed = monthly_budget > 0 ? (spent / monthly_budget) * 100 : 0;
  const budgetColor = budgetUsed > 90 ? "red" : budgetUsed > 70 ? "orange" : "green";
  const planMonthlyAZN = monthly_payment_azn || crm?.monthly_payment_azn || 0;
  const actualMonthlyAZN = typeof cycleSpendAZN === "number" ? cycleSpendAZN : spent * USD_TO_AZN;
  const aznUsage = planMonthlyAZN > 0 ? Math.min(100, (actualMonthlyAZN / planMonthlyAZN) * 100) : 0;
  const formatAZN = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "0.00 AZN";
    return `${value.toFixed(2)} AZN`;
  };

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
    <Card mb={4} bg="white" boxShadow="md">
      <CardHeader bg="gray.50">
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Avatar size="md" name={account_name} src={avatarSrc} />
            <Box>
              <Button
                variant="link"
                colorScheme="purple"
                fontSize="lg"
                fontWeight="bold"
                onClick={() => onOpenDetails?.(clientData)}
              >
                {account_name || "Unknown Client"}
              </Button>
              <Text fontSize="xs" color="gray.600">
                ID: {account_id || "N/A"}
              </Text>
              {crm && (
                <Badge colorScheme="purple" mt={1}>
                  CRM
                </Badge>
              )}
            </Box>
          </HStack>
          <Button size="sm" variant="outline" onClick={() => onOpenDetails?.(clientData)}>
            Подробнее
          </Button>
        </Flex>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          {/* Бюджет Meta + CRM */}
          <Box>
            <Text fontSize="sm" color="gray.400" mb={1}>
              Месячный бюджет (Meta)
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={2}>
              {formatMoney(monthly_budget)}
            </Text>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Осталось: {formatMoney(remaining_budget)}
            </Text>
            <Progress value={budgetUsed} colorScheme={budgetColor} size="sm" borderRadius="md" />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Использовано {budgetUsed.toFixed(1)}%
            </Text>
            {crm && (
              <Box mt={4} p={3} borderWidth="1px" borderRadius="md" borderColor="purple.100">
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Платёжный план (AZN)
                </Text>
                <HStack justify="space-between" fontSize="xs" color="gray.500" mb={1}>
                  <Text>План на месяц</Text>
                  <Text fontWeight="bold" color="gray.800">
                    {formatAZN(planMonthlyAZN)}
                  </Text>
                </HStack>
                <HStack justify="space-between" fontSize="xs" color="gray.500" mb={1}>
                  <Text>Потрачено (факт)</Text>
                  <Text fontWeight="bold" color="gray.800">
                    {formatAZN(actualMonthlyAZN)}
                  </Text>
                </HStack>
                <Progress
                  value={aznUsage}
                  colorScheme={aznUsage > 90 ? "red" : aznUsage > 70 ? "yellow" : "green"}
                  size="sm"
                  borderRadius="md"
                  mb={2}
                />
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="xs" color="gray.600">
                    План/день:{" "}
                    <Text as="span" fontWeight="bold">
                      {plannedDailyAZN ? formatAZN(plannedDailyAZN) : "—"}
                    </Text>
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    Факт/день:{" "}
                    <Text as="span" fontWeight="bold">
                      {actualDailyAZN ? formatAZN(actualDailyAZN) : "—"}
                    </Text>
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    Осталось:{" "}
                    <Text
                      as="span"
                      fontWeight="bold"
                      color={remainingAZN < 0 ? "red.500" : "gray.800"}
                    >
                      {formatAZN(Math.max(0, remainingAZN ?? planMonthlyAZN - actualMonthlyAZN))}
                    </Text>
                  </Text>
                  {cycleDays && (
                    <Text fontSize="xs" color="gray.500">
                      Цикл: {daysElapsed || 0} / {cycleDays} дней
                    </Text>
                  )}
                </VStack>
              </Box>
            )}
          </Box>

          {/* Активность */}
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Активность
            </Text>
            <HStack spacing={4} mb={2}>
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Группы
                </Text>
                <Badge colorScheme="green" fontSize="md" p={2}>
                  {active_adsets}
                </Badge>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Объявления
                </Text>
                <Badge colorScheme="blue" fontSize="md" p={2}>
                  {active_ads}
                </Badge>
              </Box>
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={2}>
              Обновлено: {formatDate(last_updated)}
            </Text>
          </Box>

          {/* Метрики */}
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Метрики
            </Text>
            <Box mb={2}>
              <Text fontSize="xs" color="gray.600">
                Цена за результат (CPL)
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {formatMoney(cpl)}
              </Text>
            </Box>
            <Box mb={2}>
              <Text fontSize="xs" color="gray.600">
                Показы
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {formatNumber(impressions)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.600">
                Потрачено
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {formatMoney(spent)}
              </Text>
            </Box>
          </Box>
        </SimpleGrid>
        <Text fontSize="xs" color="gray.400" mt={4}>
          Факт по spend Meta за выбранный диапазон ({clientData.periodDays || "?"} дн.)
        </Text>
      </CardBody>
    </Card>
  );
}

function MetaAdsStatus() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("today");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [crmIndex, setCrmIndex] = useState({ byId: {}, byName: {} });
  const detailDrawer = useDisclosure();
  const [detailClient, setDetailClient] = useState(null);
  const toast = useToast();

  // Маппинг дат
  const datePresetMap = {
    today: "today",
    yesterday: "yesterday",
    month: "last_30d",
    maximum: "maximum",
  };

  const fetchCrmClients = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/clients`);
      if (!response.ok) throw new Error("Failed to fetch CRM clients");
      const data = await response.json();
      const byId = {};
      const byName = {};
      data.forEach((client) => {
        if (client.account_id) byId[String(client.account_id)] = client;
        if (client.account_name) byName[normalizeKey(client.account_name)] = client;
      });
      setCrmIndex({ byId, byName });
    } catch (error) {
      console.error("CRM clients fetch error:", error);
      toast({
        title: "Не удалось загрузить данных CRM",
        description: error.message,
        status: "warning",
        duration: 3000,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchCrmClients();
  }, [fetchCrmClients]);

  const attachCrmData = useCallback(
    (client) => {
      const crm =
        crmIndex.byId[String(client.account_id)] ||
        crmIndex.byName[normalizeKey(client.account_name)];
      const merged = { ...client };
      if (crm) {
        merged.crm = crm;
        merged.account_name = crm.account_name || merged.account_name;
        merged.start_date = crm.start_date || merged.start_date;
        merged.monthly_payment_azn = crm.monthly_payment_azn || merged.monthly_payment_azn || 0;
        merged.total_paid = crm.total_paid;
        merged.last_payment_at = crm.last_payment_at;
      }
      merged.displayAvatar =
        crm?.avatar_url ||
        CLIENT_AVATARS[client.account_id] ||
        CLIENT_AVATARS[client.account_name] ||
        CLIENT_AVATARS[normalizeKey(client.account_name)];
      const periodDays = getPresetDays(datePreset);
      merged.periodDays = periodDays;
      merged.avgDailyUSD = periodDays > 0 ? (client.spent || 0) / periodDays : 0;
      merged.avgDailyAZN = merged.avgDailyUSD * USD_TO_AZN;
      const metrics = computeCycleMetrics(crm, client.spent || 0);
      return { ...merged, ...metrics };
    },
    [crmIndex, datePreset]
  );

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

      // Получаем бюджеты клиентов из БД
      try {
        const budgetsResponse = await fetch(`${API_BASE}/api/clients`);
        if (budgetsResponse.ok) {
          const clientsFromDb = await budgetsResponse.json();
          const budgetsMap = {};
          clientsFromDb.forEach((client) => {
            budgetsMap[client.account_id] = client;
            // Также создаем маппинг по имени на случай если ID не совпадает
            budgetsMap[client.account_name] = client;
          });
          
          Object.values(clientsMap).forEach((client) => {
            const dbClient = budgetsMap[client.account_id] || budgetsMap[client.account_name];
            if (dbClient) {
              client.monthly_budget = dbClient.monthly_budget || 0;
              client.remaining_budget = Math.max(0, client.monthly_budget - client.spent);
            } else {
              // Если клиента нет в БД, используем оценку
              client.monthly_budget = client.spent * 1.5;
              client.remaining_budget = Math.max(0, client.monthly_budget - client.spent);
            }
          });
        } else {
          // Если API недоступен, используем оценку
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

      const finalClientsList = Object.values(clientsMap).map((client) => attachCrmData(client));
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
  }, [datePreset, toast, attachCrmData]);

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

  const openDetails = (client) => {
    setDetailClient(client);
    detailDrawer.onOpen();
  };

  const closeDetails = () => {
    detailDrawer.onClose();
    setDetailClient(null);
  };

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
                <ClientCard
                  key={client.account_id || index}
                  clientData={client}
                  onOpenDetails={openDetails}
                />
              ))}
            </SimpleGrid>
          )}
        </CardBody>
      </Card>

      <Drawer isOpen={detailDrawer.isOpen} placement="right" size="md" onClose={closeDetails}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {detailClient?.account_name || "Клиент"} ({detailClient?.account_id || "—"})
          </DrawerHeader>
          <DrawerBody>
            {detailClient ? (
              <VStack align="stretch" spacing={4}>
                <Stat>
                  <StatLabel>CRM старт</StatLabel>
                  <StatNumber>
                    {detailClient.crm?.start_date
                      ? new Date(detailClient.crm.start_date).toLocaleDateString("ru-RU")
                      : "—"}
                  </StatNumber>
                  <StatHelpText>Дата начала сотрудничества</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Платёж в месяц (AZN)</StatLabel>
                  <StatNumber>
                    {detailClient.crm?.monthly_payment_azn
                      ? `${detailClient.crm.monthly_payment_azn.toFixed(2)} AZN`
                      : "—"}
                  </StatNumber>
                  <StatHelpText>План согласно CRM</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Факт расход (USD)</StatLabel>
                  <StatNumber>${(detailClient.spent || 0).toFixed(2)}</StatNumber>
                  <StatHelpText>
                    За выбранный период ({detailClient.periodDays || "—"} дн.)
                  </StatHelpText>
                </Stat>
                <Box borderWidth="1px" borderRadius="md" p={3}>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Сводка по бюджету
                  </Text>
                  <Text fontSize="sm">
                    План/день:{" "}
                    <Text as="span" fontWeight="bold">
                      {detailClient.plannedDailyAZN
                        ? `${detailClient.plannedDailyAZN.toFixed(2)} AZN`
                        : "—"}
                    </Text>
                  </Text>
                  <Text fontSize="sm">
                    Факт/день:{" "}
                    <Text as="span" fontWeight="bold">
                      {detailClient.actualDailyAZN
                        ? `${detailClient.actualDailyAZN.toFixed(2)} AZN`
                        : "—"}
                    </Text>
                  </Text>
                  <Text fontSize="sm">
                    Осталось:{" "}
                    <Text
                      as="span"
                      fontWeight="bold"
                      color={
                        detailClient.remainingAZN !== null && detailClient.remainingAZN < 0
                          ? "red.500"
                          : "gray.800"
                      }
                    >
                      {detailClient.remainingAZN !== null
                        ? `${Math.max(0, detailClient.remainingAZN).toFixed(2)} AZN`
                        : "—"}
                    </Text>
                  </Text>
                </Box>
                {detailClient.crm && (
                  <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      CRM данные
                    </Text>
                    <Text fontSize="sm">Последняя оплата: {detailClient.last_payment_at ? new Date(detailClient.last_payment_at).toLocaleDateString("ru-RU") : "—"}</Text>
                    <Text fontSize="sm">Всего оплачено: {detailClient.total_paid ? `${detailClient.total_paid.toFixed(2)} AZN` : "—"}</Text>
                  </Box>
                )}
              </VStack>
            ) : (
              <Text>Выберите клиента</Text>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}

export default MetaAdsStatus;

