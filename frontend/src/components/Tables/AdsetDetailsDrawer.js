// src/components/Tables/AdsetDetailsDrawer.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Box,
  Flex,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  useToast,
  Divider,
  Icon,
} from "@chakra-ui/react";
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import { FaExternalLinkAlt, FaCopy, FaStickyNote } from "react-icons/fa";
import { fmtMoney, fmtPct, fmtNum, fmtDateDMYIntl } from "utils/formatters";
import { API_BASE } from "../../config/api";
import { updateAdsetBudgetDates } from "../../api/adsets";

export default function AdsetDetailsDrawer({
  isOpen,
  onClose,
  adset,
  isUpdating,
  onToggleStatus,
  fetchAdsForAdset,
  fetchAdsetDetails,
  fetchAdsetHistory,
  fetchAdsetTimeInsights,
}) {
  const toast = useToast();
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const accountId = adset?.account_id ? String(adset.account_id) : "";
  const adsetId = adset?.adset_id ? String(adset.adset_id) : "";
  const [schedule, setSchedule] = useState(null);
  const [timeInsights, setTimeInsights] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelRef = React.useRef();
  const [pendingChange, setPendingChange] = useState(null); // { summary, payload, toastSuccess }

  const parseBudgetNumber = (v) => {
    if (v == null) return 0;
    const num = typeof v === "string" ? parseFloat(v) : Number(v);
    if (!isFinite(num)) return 0;
    // Heuristics: some APIs return minor units (cents) or micros
    if (num >= 1_000_000 && Number.isFinite(num / 1_000_000)) {
      // micros to major (e.g. Google-style)
      return Math.round((num / 1_000_000) * 100) / 100;
    }
    // Facebook returns budgets in the smallest currency unit (cents for USD/EUR, etc.)
    // Convert any reasonably-sized integer >= 100 to major units.
    if (num >= 100 && Number.isFinite(num / 100)) {
      // cents to major (Meta-style)
      return Math.round((num / 100) * 100) / 100;
    }
    return num;
  };
  const dailyBudget = parseBudgetNumber(
    adset?.daily_budget ??
      adset?.dailyBudget ??
      adset?.budget_daily ??
      adset?.daily_budget_amount ??
      adset?.dailyBudgetAmount ??
      adset?.daily_budget_micro ??
      adset?.dailyBudgetMicros
  );
  const lifetimeBudget = parseBudgetNumber(
    adset?.lifetime_budget ??
      adset?.lifetimeBudget ??
      adset?.budget_lifetime ??
      adset?.lifetime_budget_amount ??
      adset?.lifetimeBudgetAmount ??
      adset?.lifetime_budget_micro ??
      adset?.lifetimeBudgetMicros
  );
  const budgetType = dailyBudget > 0 ? "Daily" : lifetimeBudget > 0 ? "Lifetime" : null;
  const budgetValue = dailyBudget > 0 ? dailyBudget : lifetimeBudget > 0 ? lifetimeBudget : 0;

  // Try to extract daily budget from adset name like "$10/day", "10$ per day", "Budget 15 daily"
  const parseBudgetFromName = (name) => {
    if (!name || typeof name !== "string") return null;
    const text = name.toLowerCase();
    // common patterns: $10/day, 10$/day, 10 $ / day, 10 per day, daily 10, 10 daily
    const dollarPattern = /(?:\$?\s?)(\d+(?:[.,]\d{1,2})?)(?:\s?\$)?\s*(?:\/\s*day|per\s*day|daily)/i;
    const reversedPattern = /(?:daily|per\s*day)\s*(\$?\s?\d+(?:[.,]\d{1,2})?(?:\s?\$)?)/i;
    let m = text.match(dollarPattern);
    if (!m) m = text.match(reversedPattern);
    if (m && m[1]) {
      const raw = m[1].replace(/[^0-9.,]/g, "").replace(",", ".");
      const num = parseFloat(raw);
      if (isFinite(num) && num > 0) return { type: "Daily", value: Math.round(num * 100) / 100 };
    }
    return null;
  };

  const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "number") {
      // seconds vs ms heuristic
      return new Date(v > 1e12 ? v : v * 1000);
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatDMY = (date) => {
    if (!date) return null;
    try {
      return fmtDateDMYIntl(date);
    } catch {
      const d = date.getDate();
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  };
  const startRaw =
    adset?.start_time ||
    adset?.time_start ||
    adset?.start ||
    adset?.created_time ||
    adset?.createdTime ||
    (typeof adset?.adset_name === "string" && (adset.adset_name.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/) || [])[0]);
  const endRaw =
    adset?.end_time ||
    adset?.time_end ||
    adset?.end ||
    adset?.stop_time ||
    adset?.stopTime;
  const startDate = toDate(startRaw);
  const endDate = toDate(endRaw);
  const initialScheduleLabel =
    startDate ? `${formatDMY(startDate)}${endDate ? ` → ${formatDMY(endDate)}` : " → Ongoing"}` : "—";

  // Load details and history if providers exist to improve budget/schedule and add change history
  useEffect(() => {
    if (!isOpen || !adsetId) return;
    let cancelled = false;
    const loadDetails = async () => {
      if (!fetchAdsetDetails) return;
      try {
        setDetailsLoading(true);
        const d = await fetchAdsetDetails(adsetId);
        if (!cancelled) setDetails(d);
        // derive schedule from details if present
        if (!cancelled && d) {
          const s = toDate(d?.start_time ?? d?.time_start ?? d?.start ?? d?.created_time);
          const e = toDate(d?.end_time ?? d?.time_end ?? d?.end ?? d?.stop_time);
          if (s) {
            setSchedule(`${formatDMY(s)}${e ? ` → ${formatDMY(e)}` : " → Ongoing"}`);
          }
        }
      } catch {
        if (!cancelled) setDetails(null);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };
    const loadHistory = async () => {
      if (!fetchAdsetHistory) return;
      try {
        setHistoryLoading(true);
        const h = await fetchAdsetHistory(adsetId);
        let items = Array.isArray(h) ? h : [];
        // Fallback: if no adset activity and we know campaign_id, fetch campaign activity
        try {
          if (items.length === 0) {
            // ensure details are loaded to get campaign_id
            const d = details || (fetchAdsetDetails ? await fetchAdsetDetails(adsetId) : null);
            const campaignId = d?.campaign_id;
            if (campaignId) {
              const resp = await fetch(`${API_BASE}/api/campaigns/${encodeURIComponent(campaignId)}/history?limit=50`);
              if (resp.ok) {
                const cam = await resp.json();
                if (Array.isArray(cam) && cam.length > 0) {
                  // mark items as campaign-level
                  items = cam.map((it) => ({ ...it, _scope: "campaign" }));
                }
              }
            }
          }
        } catch {}
        if (!cancelled) setHistory(items);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    const loadTimeInsights = async () => {
      if (!fetchAdsetTimeInsights) return;
      try {
        const ti = await fetchAdsetTimeInsights(adsetId);
        if (!cancelled) setTimeInsights(ti || null);
        const dr = ti?.date_range || {};
        // Do not override explicit schedule from details
        const hasExplicitStart = !!(details?.start_time ?? details?.time_start ?? details?.start ?? details?.created_time);
        const hasExplicitEnd = !!(details?.end_time ?? details?.time_end ?? details?.end ?? details?.stop_time);
        if (!hasExplicitStart && (dr.start || dr.end)) {
          const s = toDate(dr.start);
          const e = toDate(dr.end);
          if (s) setSchedule(`${formatDMY(s)}${e ? ` → ${formatDMY(e)}` : " → Ongoing"}`);
        }
      } catch {}
    };
    loadDetails();
    loadHistory();
    loadTimeInsights();
    return () => {
      cancelled = true;
    };
  }, [isOpen, adsetId, fetchAdsetDetails, fetchAdsetHistory, fetchAdsetTimeInsights]);

  useEffect(() => {
    if (!isOpen || !adsetId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setAdsLoading(true);
        const res = await fetchAdsForAdset(adsetId);
        if (!cancelled) setAds(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!cancelled) {
          setAds([]);
          toast({
            title: "Failed to load creatives",
            status: "error",
            duration: 2000,
            position: "top",
          });
        }
      } finally {
        if (!cancelled) setAdsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, adsetId, fetchAdsForAdset, toast]);

  // Оставляем только релевантные события: создание, бюджет, график
  const relevantHistory = useMemo(() => {
    const items = Array.isArray(history) ? history : [];
    return items.filter((evt) => {
      const action = String(evt?.action || "").toLowerCase();
      const detailsText = String(evt?.details || "");
      const isCreated = /(^|_)create(_|$)|created/.test(action);
      // учитываем и название действия, и текст деталей
      const isBudget =
        /budget|daily_budget|lifetime_budget/i.test(detailsText) ||
        /budget/.test(action);
      const isDate =
        /start_time|end_time/i.test(detailsText) ||
        /(duration|schedule|scheduling|start|end)/.test(action);
      return isCreated || isBudget || isDate;
    });
  }, [history]);

  // управление раскрытием подробностей
  const [openItems, setOpenItems] = useState({});
  const toggleOpen = (idx) => setOpenItems((s) => ({ ...s, [idx]: !s[idx] }));

  const actionToTitle = (actionLower) => {
    if (/create_ad_set|(^|_)create(_|$)/.test(actionLower)) return "Группа объявлений создана";
    if (/update_ad_set_budget|budget/.test(actionLower)) return "Бюджет группы объявлений обновлён";
    if (/update_ad_set_duration|scheduling|schedule|(start|end)/.test(actionLower)) return "График группы объявлений обновлён";
    if (/update_ad_set_name|rename|name/.test(actionLower)) return "Название группы объявлений обновлено";
    return "Изменение";
  };

  const renderPrettyDetails = (detailsText) => {
    if (!detailsText || detailsText === "{}") {
      return <Text fontSize="xs" color="gray.600">Подробности недоступны.</Text>;
    }
    // если строка похожа на JSON — красиво отформатируем
    try {
      const obj = typeof detailsText === "string" ? JSON.parse(detailsText) : detailsText;
      const pretty = JSON.stringify(obj, null, 2);
      return (
        <Box as="pre" fontSize="xs" color="gray.700" bg="gray.50" p={2} borderRadius="md" overflowX="auto">
{pretty}
        </Box>
      );
    } catch {
      // иначе покажем как есть
      return <Text fontSize="xs" color="gray.700">{String(detailsText)}</Text>;
    }
  };

  const adsManagerUrl = useMemo(() => {
    if (!accountId || !adsetId) return undefined;
    const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    return `https://business.facebook.com/adsmanager/manage/adset?act=${encodeURIComponent(
      actId
    )}&adset_id=${encodeURIComponent(adsetId)}`;
  }, [accountId, adsetId]);

  if (!adset) return null;

  const handleDuplicate = () => {
    toast({
      title: "Duplicate",
      description: "Coming soon",
      status: "info",
      duration: 1500,
      position: "top",
    });
  };

  const handleAddNote = () => {
    toast({
      title: "Add note",
      description: "Coming soon",
      status: "info",
      duration: 1500,
      position: "top",
    });
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent bg="white" color="gray.800">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="bold" noOfLines={2}>
              {adset?.adset_name || "—"}
            </Text>
            <HStack spacing={3} wrap="wrap">
              <Badge colorScheme="blue">{adset?.account_name || "—"}</Badge>
              <Badge colorScheme="purple">
                {String(adset?.objective || "—")
                  .toUpperCase()
                  .replace(/^OUTCOME_/, "")
                  .replace(/_/g, " ")}
              </Badge>
              <Badge colorScheme="green">
                {(() => {
                  // Prefer details if present, otherwise from name, otherwise from row fallback
                  const dDaily = parseBudgetNumber(details?.daily_budget ?? details?.dailyBudget ?? details?.budget_daily ?? details?.daily_budget_amount ?? details?.daily_budget_micro);
                  const dLife = parseBudgetNumber(details?.lifetime_budget ?? details?.lifetimeBudget ?? details?.budget_lifetime ?? details?.lifetime_budget_amount ?? details?.lifetime_budget_micro);

                  // If backend provides explicit budget_type, honor it
                  const explicitType = typeof details?.budget_type === "string" ? details.budget_type.toUpperCase() : null;

                  let type = null;
                  let value = 0;

                  if (explicitType === "DAILY" && dDaily > 0) {
                    type = "Daily";
                    value = dDaily;
                  } else if (explicitType === "LIFETIME" && dLife > 0) {
                    type = "Lifetime";
                    value = dLife;
                  } else if (dLife > 0 && (details?.end_time || !dDaily)) {
                    // If lifetime budget is set and we have an end date, prefer lifetime even if daily exists
                    type = "Lifetime";
                    value = dLife;
                  } else if (dDaily > 0) {
                    type = "Daily";
                    value = dDaily;
                  } else {
                    // Fallback to what we inferred from the row
                    type = budgetType;
                    value = budgetValue;
                  }
                  if (!type || !(value > 0)) {
                    const fromName = parseBudgetFromName(adset?.adset_name);
                    if (fromName) {
                      type = fromName.type;
                      value = fromName.value;
                    }
                  }
                  return `Budget: ${type && value > 0 ? `${type} ${fmtMoney(value)}` : "—"}`;
                })()}
              </Badge>
            </HStack>
            <HStack spacing={6} pt={2}>
              <Text fontSize="sm">
                Spent: <b>{fmtMoney(adset?.spend)}</b>
              </Text>
              <Text fontSize="sm">
                Leads: <b>{fmtNum(adset?.leads)}</b>
              </Text>
              <Text fontSize="sm">
                CPL: <b>{fmtMoney(adset?.cpl)}</b>
              </Text>
              <Text fontSize="sm">
                CTR (link):{" "}
                <b>
                  {fmtPct(
                    adset && adset.impressions > 0
                      ? (Number(adset.link_clicks || 0) / adset.impressions) * 100
                      : 0
                  )}
                </b>
              </Text>
              <Text fontSize="sm">
                CPM: <b>{fmtMoney(adset?.cpm)}</b>
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.600" pt={1}>
              Schedule: {(() => {
                if (schedule) return schedule;
                const s = toDate(details?.start_time ?? details?.time_start ?? details?.start ?? details?.created_time);
                const e = toDate(details?.end_time ?? details?.time_end ?? details?.end ?? details?.stop_time);
                if (s) return `${formatDMY(s)}${e ? ` → ${formatDMY(e)}` : " → Ongoing"}`;
                return initialScheduleLabel;
              })()}
            </Text>
            <Text fontSize="xs" color="gray.600">
              Launched: {(() => {
                const s = toDate(details?.start_time ?? details?.created_time ?? startRaw);
                return s ? formatDMY(s) : "—";
              })()}
              {details?.updated_time ? ` • Updated: ${formatDMY(toDate(details.updated_time))}` : ""}
            </Text>
          </VStack>
        </DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={4}>
            <HStack spacing={3}>
              {adsManagerUrl && (
                <Button
                  as="a"
                  href={adsManagerUrl}
                  target="_blank"
                  rel="noreferrer"
                  leftIcon={<Icon as={FaExternalLinkAlt} />}
                  size="sm"
                  colorScheme="blue"
                >
                  Open in Ads Manager
                </Button>
              )}
              <Button size="sm" variant="outline" leftIcon={<Icon as={FaCopy} />} onClick={handleDuplicate}>
                Duplicate
              </Button>
              <Button
                size="sm"
                colorScheme={adset?.status === "ACTIVE" ? "red" : "green"}
                onClick={() => onToggleStatus(adset)}
                isLoading={isUpdating}
              >
                {adset?.status === "ACTIVE" ? "Pause" : "Activate"}
              </Button>
              <Button size="sm" variant="outline" leftIcon={<Icon as={FaStickyNote} />} onClick={handleAddNote}>
                Add note
              </Button>
            </HStack>

            <Divider />

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                Smart рекомендации
              </Text>
              {(() => {
                // Рассчитываем среднесуточную трату по daily_data из timeInsights
                const daily = Array.isArray(timeInsights?.daily_data) ? timeInsights.daily_data : [];
                const days = daily.length;
                const totalSpend = daily.reduce((sum, d) => sum + (Number(d?.spend || d?.spent || 0) || 0), 0);
                const avgDaily = days > 0 ? Math.round((totalSpend / days) * 100) / 100 : 0;
                const isLifetime = (details?.lifetime_budget || lifetimeBudget > 0) && (!!(details?.end_time || endDate));
                const dailyValue = dailyBudget > 0 ? dailyBudget : (details?.daily_budget ? parseBudgetNumber(details.daily_budget) : 0);
                const lifeValue = lifetimeBudget > 0 ? lifetimeBudget : (details?.lifetime_budget ? parseBudgetNumber(details.lifetime_budget) : 0);

                const openConfirm = (change) => {
                  setPendingChange(change);
                  setConfirmOpen(true);
                };
                return (
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" color="gray.600">
                      Средняя дневная трата: <b>{fmtMoney(avgDaily)}</b> за {days} дн.
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {isLifetime ? (
                        <>
                          <Button size="xs" variant="outline" colorScheme="green" isDisabled={avgDaily <= 0} onClick={() => {
                            const addDays = 1;
                            const newLifetimeMajor = lifeValue + avgDaily * addDays;
                            const currentEnd = endDate || toDate(details?.end_time);
                            const newEnd = new Date((currentEnd || new Date()).getTime());
                            newEnd.setDate(newEnd.getDate() + addDays);
                            openConfirm({
                              summary: `Продлить на +1 день: бюджет ${fmtMoney(lifeValue)} → ${fmtMoney(newLifetimeMajor)}, дата ${formatDMY(currentEnd || new Date())} → ${formatDMY(newEnd)}`,
                              payload: {
                                lifetime_budget: Math.round(newLifetimeMajor * 100),
                                end_time: newEnd.toISOString(),
                              },
                              toastSuccess: "Продлено на +1 день",
                            });
                          }}>
                            +1 день ({fmtMoney(avgDaily)})
                          </Button>
                          <Button size="xs" variant="outline" colorScheme="green" isDisabled={avgDaily <= 0} onClick={() => {
                            const addDays = 3;
                            const newLifetimeMajor = lifeValue + avgDaily * addDays;
                            const currentEnd = endDate || toDate(details?.end_time);
                            const newEnd = new Date((currentEnd || new Date()).getTime());
                            newEnd.setDate(newEnd.getDate() + addDays);
                            openConfirm({
                              summary: `Продлить на +3 дня: бюджет ${fmtMoney(lifeValue)} → ${fmtMoney(newLifetimeMajor)}, дата ${formatDMY(currentEnd || new Date())} → ${formatDMY(newEnd)}`,
                              payload: {
                                lifetime_budget: Math.round(newLifetimeMajor * 100),
                                end_time: newEnd.toISOString(),
                              },
                              toastSuccess: "Продлено на +3 дня",
                            });
                          }}>
                            +3 дня ({fmtMoney(avgDaily * 3)})
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="xs" variant="outline" colorScheme="blue" isDisabled={!(dailyValue > 0)} onClick={() => {
                            const newDailyMajor = dailyValue * 1.1;
                            openConfirm({
                              summary: `Увеличить daily на +10%: ${fmtMoney(dailyValue)} → ${fmtMoney(newDailyMajor)}`,
                              payload: { daily_budget: Math.round(newDailyMajor * 100) },
                              toastSuccess: "Дневной бюджет +10%",
                            });
                          }}>
                            +10% {dailyValue > 0 ? `(${fmtMoney(dailyValue * 1.1)})` : ""}
                          </Button>
                          <Button size="xs" variant="outline" colorScheme="blue" isDisabled={!(dailyValue > 0)} onClick={() => {
                            const newDailyMajor = dailyValue * 1.2;
                            openConfirm({
                              summary: `Увеличить daily на +20%: ${fmtMoney(dailyValue)} → ${fmtMoney(newDailyMajor)}`,
                              payload: { daily_budget: Math.round(newDailyMajor * 100) },
                              toastSuccess: "Дневной бюджет +20%",
                            });
                          }}>
                            +20% {dailyValue > 0 ? `(${fmtMoney(dailyValue * 1.2)})` : ""}
                          </Button>
                        </>
                      )}
                    </HStack>
                  </VStack>
                );
              })()}
            </Box>

            <Divider />

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={3}>
                История изменений
              </Text>
              <VStack align="stretch" spacing={2}>
                {historyLoading && <Text fontSize="sm" color="gray.600">Загрузка истории...</Text>}
                {!historyLoading && relevantHistory.length === 0 && (
                  <Text fontSize="sm" color="gray.600">Нет данных по созданию, бюджету или графику.</Text>
                )}
                {!historyLoading && relevantHistory.length > 0 && relevantHistory.map((evt, idx) => {
                  const when = toDate(evt.timestamp || evt.time || evt.date);
                  const who = evt.user || evt.actor || "system";
                  const action = evt.action || evt.change || evt.event || "updated";
                  const actionLower = String(action).toLowerCase();
                  const detailsTextRaw = evt.details || evt.note || "";
                  const detailsText = (detailsTextRaw === "{}" ? "" : detailsTextRaw);
                  const isBudget =
                    /budget|daily_budget|lifetime_budget/i.test(detailsText) ||
                    /budget/.test(actionLower);
                  const isDate =
                    /start_time|end_time/i.test(detailsText) ||
                    /(duration|schedule|scheduling|start|end)/.test(actionLower);
                  const isCreated = /(^|_)create(_|$)|created/.test(actionLower);
                  const actionLabel = actionToTitle(actionLower);
                  return (
                    <Flex key={idx} direction="column" p={2} borderWidth="1px" borderRadius="md" bg="white">
                      <Flex align="start" gap={3} cursor="pointer" onClick={() => toggleOpen(idx)}>
                        <Box flex="0 0 auto" minW="120px" color="gray.600" fontSize="xs">
                          {when ? when.toLocaleString("ru-RU") : "—"}
                        </Box>
                        <Box flex="1 1 auto">
                          <Text fontSize="sm">
                            <b>{who}</b>: {actionLabel}
                            {evt._scope === "campaign" ? " (кампания)" : ""}
                          </Text>
                        </Box>
                      </Flex>
                      {openItems[idx] && (
                        <Box mt={2} ml={0} pl={0}>
                          {renderPrettyDetails(detailsText)}
                        </Box>
                      )}
                    </Flex>
                  );
                })}
              </VStack>
            </Box>

            <Divider />

            {/* Creatives moved to Detailed Stats modal */}
          </VStack>
        </DrawerBody>
        {/* Confirm Dialog */}
        <AlertDialog isOpen={confirmOpen} leastDestructiveRef={cancelRef} onClose={() => setConfirmOpen(false)}>
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Подтверждение изменений
              </AlertDialogHeader>
              <AlertDialogBody>
                {pendingChange?.summary || "Применить изменения?"}
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={() => setConfirmOpen(false)}>
                  Отменить
                </Button>
                <Button colorScheme="blue" ml={3} onClick={async () => {
                  try {
                    await updateAdsetBudgetDates(adsetId, pendingChange?.payload || {});
                    if (fetchAdsetDetails) {
                      const d = await fetchAdsetDetails(adsetId);
                      setDetails(d);
                      const s = toDate(d?.start_time);
                      const e = toDate(d?.end_time);
                      if (s) setSchedule(`${formatDMY(s)}${e ? ` → ${formatDMY(e)}` : " → Ongoing"}`);
                    }
                    // append to local history
                    try {
                      const when = new Date();
                      const entry = {
                        timestamp: when.toISOString(),
                        user: "you",
                        action: "update",
                        details: pendingChange?.summary || "Budget/dates updated",
                      };
                      setHistory((h) => Array.isArray(h) ? [entry, ...h] : [entry]);
                    } catch {}
                    try {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("adsetUpdated", { detail: { adsetId } }));
                      }
                    } catch {}
                    toast({ title: "Обновлено", description: pendingChange?.toastSuccess || "Изменения применены", status: "success", duration: 2000, position: "top" });
                  } catch (e) {
                    const msg = (e && e.message) ? e.message : "Не удалось применить изменения";
                    toast({ title: "Ошибка", description: msg, status: "error", duration: 3000, position: "top" });
                  } finally {
                    setConfirmOpen(false);
                    setPendingChange(null);
                  }
                }}>
                  Подтвердить
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </DrawerContent>
    </Drawer>
  );
}

