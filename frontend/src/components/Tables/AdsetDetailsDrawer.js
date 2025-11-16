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
  Image,
  useToast,
  Divider,
  Icon,
} from "@chakra-ui/react";
import { FaExternalLinkAlt, FaCopy, FaStickyNote } from "react-icons/fa";
import { fmtMoney, fmtPct, fmtNum } from "utils/formatters";

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
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
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
        if (!cancelled) setHistory(Array.isArray(h) ? h : []);
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
                if (s) return `${s.toLocaleDateString()}${e ? ` → ${e.toLocaleDateString()}` : " → Ongoing"}`;
                return initialScheduleLabel;
              })()}
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

                return (
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" color="gray.600">
                      Средняя дневная трата: <b>{fmtMoney(avgDaily)}</b> за {days} дн.
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {isLifetime ? (
                        <>
                          <Button size="xs" variant="outline" colorScheme="green" onClick={async () => {
                            try {
                              // lifetime budgets are in minor units; here avgDaily is in major, backend expects minor
                              const addDays = 1;
                              const newLifetime = Math.round((lifeValue + avgDaily * addDays) * 100);
                              const currentEnd = endDate || toDate(details?.end_time);
                              const newEnd = new Date((currentEnd || new Date()).getTime());
                              newEnd.setDate(newEnd.getDate() + addDays);
                              await fetch(`${API_BASE}/api/adsets/${encodeURIComponent(adsetId)}/update-budget-dates`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  lifetime_budget: newLifetime,
                                  end_time: newEnd.toISOString(),
                                }),
                              });
                              toast({ title: "Обновлено", description: "Продлено на +1 день", status: "success", duration: 2000, position: "top" });
                            } catch (e) {
                              toast({ title: "Ошибка", description: "Не удалось обновить бюджет/дату", status: "error", duration: 2500, position: "top" });
                            }
                          }}>
                            +1 день ({fmtMoney(avgDaily)})
                          </Button>
                          <Button size="xs" variant="outline" colorScheme="green" onClick={async () => {
                            try {
                              const addDays = 3;
                              const newLifetime = Math.round((lifeValue + avgDaily * addDays) * 100);
                              const currentEnd = endDate || toDate(details?.end_time);
                              const newEnd = new Date((currentEnd || new Date()).getTime());
                              newEnd.setDate(newEnd.getDate() + addDays);
                              await fetch(`${API_BASE}/api/adsets/${encodeURIComponent(adsetId)}/update-budget-dates`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  lifetime_budget: newLifetime,
                                  end_time: newEnd.toISOString(),
                                }),
                              });
                              toast({ title: "Обновлено", description: "Продлено на +3 дня", status: "success", duration: 2000, position: "top" });
                            } catch (e) {
                              toast({ title: "Ошибка", description: "Не удалось обновить бюджет/дату", status: "error", duration: 2500, position: "top" });
                            }
                          }}>
                            +3 дня ({fmtMoney(avgDaily * 3)})
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="xs" variant="outline" colorScheme="blue" onClick={async () => {
                            try {
                              const newDaily = Math.round(dailyValue * 1.1 * 100);
                              await fetch(`${API_BASE}/api/adsets/${encodeURIComponent(adsetId)}/update-budget-dates`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ daily_budget: newDaily }),
                              });
                              toast({ title: "Обновлено", description: "Дневной бюджет +10%", status: "success", duration: 2000, position: "top" });
                            } catch (e) {
                              toast({ title: "Ошибка", description: "Не удалось обновить дневной бюджет", status: "error", duration: 2500, position: "top" });
                            }
                          }}>
                            +10% {dailyValue > 0 ? `(${fmtMoney(dailyValue * 1.1)})` : ""}
                          </Button>
                          <Button size="xs" variant="outline" colorScheme="blue" onClick={async () => {
                            try {
                              const newDaily = Math.round(dailyValue * 1.2 * 100);
                              await fetch(`${API_BASE}/api/adsets/${encodeURIComponent(adsetId)}/update-budget-dates`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ daily_budget: newDaily }),
                              });
                              toast({ title: "Обновлено", description: "Дневной бюджет +20%", status: "success", duration: 2000, position: "top" });
                            } catch (e) {
                              toast({ title: "Ошибка", description: "Не удалось обновить дневной бюджет", status: "error", duration: 2500, position: "top" });
                            }
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
                Change history
              </Text>
              <VStack align="stretch" spacing={2}>
                {historyLoading && <Text fontSize="sm" color="gray.600">Loading history...</Text>}
                {!historyLoading && history.length === 0 && (
                  <Text fontSize="sm" color="gray.600">No recent changes.</Text>
                )}
                {history.map((evt, idx) => {
                  const when = toDate(evt.timestamp || evt.time || evt.date);
                  const who = evt.user || evt.actor || "system";
                  const action = evt.action || evt.change || evt.event || "updated";
                  const detailsText = evt.details || evt.note || "";
                  return (
                    <Flex key={idx} align="start" gap={3} p={2} borderWidth="1px" borderRadius="md" bg="white">
                      <Box flex="0 0 auto" minW="120px" color="gray.600" fontSize="xs">
                        {when ? when.toLocaleString() : "—"}
                      </Box>
                      <Box flex="1 1 auto">
                        <Text fontSize="sm"><b>{who}</b>: {action}</Text>
                        {detailsText && <Text fontSize="xs" color="gray.700">{detailsText}</Text>}
                      </Box>
                    </Flex>
                  );
                })}
              </VStack>
            </Box>

            <Divider />

            {/* Creatives moved to Detailed Stats modal */}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

