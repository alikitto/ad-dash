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

  const parseBudgetNumber = (v) => {
    if (v == null) return 0;
    const num = typeof v === "string" ? parseFloat(v) : Number(v);
    if (!isFinite(num)) return 0;
    // many APIs return budget in minor units (cents)
    if (num >= 10000 && Number.isFinite(num / 100)) {
      // heuristic: if looks too big, treat as cents
      return Math.round((num / 100) * 100) / 100;
    }
    return num;
  };
  const dailyBudget = parseBudgetNumber(adset?.daily_budget ?? adset?.dailyBudget ?? adset?.budget_daily ?? adset?.budget);
  const lifetimeBudget = parseBudgetNumber(adset?.lifetime_budget ?? adset?.lifetimeBudget ?? adset?.budget_lifetime);
  const budgetType = dailyBudget > 0 ? "Daily" : lifetimeBudget > 0 ? "Lifetime" : null;
  const budgetValue = dailyBudget > 0 ? dailyBudget : lifetimeBudget > 0 ? lifetimeBudget : 0;

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
  const startRaw = adset?.start_time || adset?.time_start || adset?.start || adset?.created_time || adset?.createdTime;
  const endRaw = adset?.end_time || adset?.time_end || adset?.end || adset?.stop_time || adset?.stopTime;
  const startDate = toDate(startRaw);
  const endDate = toDate(endRaw);
  const scheduleLabel = startDate
    ? `${startDate.toLocaleDateString()}${endDate ? ` → ${endDate.toLocaleDateString()}` : " → Ongoing"}`
    : "—";

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
    loadDetails();
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [isOpen, adsetId, fetchAdsetDetails, fetchAdsetHistory]);

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
                  // Prefer details if present
                  const dDaily = parseBudgetNumber(details?.daily_budget ?? details?.dailyBudget ?? details?.budget_daily);
                  const dLife = parseBudgetNumber(details?.lifetime_budget ?? details?.lifetimeBudget ?? details?.budget_lifetime);
                  const type = dDaily > 0 ? "Daily" : dLife > 0 ? "Lifetime" : budgetType;
                  const value = dDaily > 0 ? dDaily : dLife > 0 ? dLife : budgetValue;
                  return `Budget: ${type ? `${type} ${fmtMoney(value)}` : "—"}`;
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
              {(() => {
                // Prefer details dates if present
                const s = toDate(details?.start_time ?? details?.time_start ?? details?.start ?? details?.created_time);
                const e = toDate(details?.end_time ?? details?.time_end ?? details?.end ?? details?.stop_time);
                const label = s ? `${s.toLocaleDateString()}${e ? ` → ${e.toLocaleDateString()}` : " → Ongoing"}` : scheduleLabel;
                return `Schedule: ${label}`;
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
                Performance (last days)
              </Text>
              <Box
                height="120px"
                border="1px dashed #CBD5E0"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="gray.500"
                bg="gray.50"
              >
                Mini chart placeholder
              </Box>
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

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={3}>
                Creatives
              </Text>
              <VStack align="stretch" spacing={3}>
                {adsLoading && (
                  <Text fontSize="sm" color="gray.600">
                    Loading creatives...
                  </Text>
                )}
                {!adsLoading && ads.length === 0 && (
                  <Text fontSize="sm" color="gray.600">
                    No creatives found.
                  </Text>
                )}
                {ads.map((ad) => (
                  <Flex key={ad.ad_id} align="center" gap={3} p={2} borderWidth="1px" borderRadius="md" bg="white">
                    <Box boxSize="64px" borderRadius="md" overflow="hidden" bg="gray.100" flexShrink={0}>
                      {ad.image_url ? (
                        <Image src={ad.image_url} alt={ad.ad_name} objectFit="cover" w="64px" h="64px" />
                      ) : (
                        <Box w="64px" h="64px" display="flex" alignItems="center" justifyContent="center" color="gray.400">
                          No Preview
                        </Box>
                      )}
                    </Box>
                    <Box flex="1 1 auto" minW={0}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {ad.ad_name || "—"}
                      </Text>
                      <HStack spacing={4} mt={1} color="gray.700" fontSize="xs">
                        <Text>Leads: {fmtNum(ad.leads)}</Text>
                        <Text>CPA: {fmtMoney(ad.cpa)}</Text>
                        <Text>Spent: {fmtMoney(ad.spend)}</Text>
                        <Text>CTR: {fmtPct(ad.ctr)}</Text>
                        <Text>CTR (link): {fmtPct(ad.ctr_link)}</Text>
                      </HStack>
                    </Box>
                  </Flex>
                ))}
              </VStack>
            </Box>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

