// src/components/Tables/Tables.js
import React, { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import {
  Box,
  Flex,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  HStack,
  Icon,
  IconButton,
  Image,
  Spinner,
  Switch as ChSwitch,
  Spacer,
} from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave } from "react-icons/fa";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

const API_BASE = "https://ad-dash-backend-production.up.railway.app";

// форматтеры
const money = (v) => (typeof v !== "number" || !isFinite(v) ? "$0.00" : `$${v.toFixed(2)}`);
const pct   = (v) => (typeof v !== "number" || !isFinite(v) ? "0.00%" : `${v.toFixed(2)}%`);
const num   = (v) => (typeof v !== "number" || !isFinite(v) ? "0" : v.toLocaleString("en-US"));

// ——— колонки и их фикс-ширины (px) ———
// важно: это «источник правды» и для основной таблицы, и для подтаблицы ads
const COLUMNS = [
  { key: "entity",       label: "Account / Campaign / Ad Set", width: 420 },
  { key: "status",       label: "Status",                      width: 120 },
  { key: "objective",    label: "Objective",                   width: 140 },
  { key: "spend",        label: "Spent",                       width: 120, sortable: true },
  { key: "impressions",  label: "Impressions",                 width: 140 },
  { key: "frequency",    label: "Frequency",                   width: 130 },
  { key: "leads",        label: "Leads (CPA)",                 width: 140 },
  { key: "cpl",          label: "CPL",                         width: 110, sortable: true },
  { key: "cpm",          label: "CPM",                         width: 110 },
  { key: "ctr_all",      label: "CTR (All)",                   width: 120 },
  { key: "ctr_link",     label: "CTR (Link Click)",            width: 150 },
  { key: "link_clicks",  label: "Link Clicks",                 width: 120 },
];
const COLCOUNT = COLUMNS.length;

function ColGroup() {
  return (
    <colgroup>
      {COLUMNS.map((c, i) => (
        <col key={c.key || i} style={{ width: `${c.width}px` }} />
      ))}
    </colgroup>
  );
}

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function Tables() {
  const [allAdsets, setAllAdsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const toast = useToast();

  const [datePreset, setDatePreset] = useStickyState("last_7d", "datePreset");
  const [selectedAccount, setSelectedAccount] = useStickyState("all", "selectedAccount");
  const [statusFilter, setStatusFilter] = useStickyState("ACTIVE", "statusFilter");
  const [objectiveFilter, setObjectiveFilter] = useStickyState("all", "objectiveFilter");
  const [sortConfig, setSortConfig] = useStickyState(
    { key: "spend", direction: "descending" },
    "sortConfig"
  );

  // раскрытие Ads + кэш
  const [expanded, setExpanded] = useState({});   // { [adset_id]: bool }
  const [adsCache, setAdsCache] = useState({});   // { [adset_id]: { items, loading, error } }

  // Updated label
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return "—";
    const now = new Date();
    const mins = Math.floor((now - lastUpdated) / 60000);
    const hrs = Math.floor(mins / 60);
    if (mins < 1) return "now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    if (hrs === 1) return "1 hr ago";
    return `${hrs} hrs ago`;
  }, [lastUpdated, tick]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/adsets?date_preset=${datePreset}`);
      const data = await response.json();
      if (data.detail) throw new Error(data.detail);
      setAllAdsets(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [datePreset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAdsForAdset = async (adsetId) => {
    const url = `${API_BASE}/api/adsets/${adsetId}/ads?date_preset=${encodeURIComponent(datePreset)}`;
    setAdsCache((prev) => ({ ...prev, [adsetId]: { ...(prev[adsetId] || {}), loading: true, error: null } }));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ads: ${res.status}`);
      const items = await res.json();
      setAdsCache((prev) => ({ ...prev, [adsetId]: { items, loading: false, error: null } }));
    } catch (e) {
      setAdsCache((prev) => ({ ...prev, [adsetId]: { items: [], loading: false, error: e.message || "Error" } }));
    }
  };

  const toggleExpand = (adsetId) => {
    setExpanded((prev) => ({ ...prev, [adsetId]: !prev[adsetId] }));
    if (!adsCache[adsetId]) fetchAdsForAdset(adsetId);
  };

  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      const response = await fetch(`${API_BASE}/api/adsets/${adsetId}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update status");
      }
      setAllAdsets((prev) =>
        prev.map((a) => (a.adset_id === adsetId ? { ...a, status: newStatus } : a))
      );
      toast({ title: "Status updated!", status: "success", duration: 1400, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Couldn't update status", description: e.message, status: "error", duration: 2400, isClosable: true, position: "top" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdStatusChange = async (adsetId, adId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/ads/${adId}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update ad status");
      }
      // апдейтим кэш
      setAdsCache((prev) => {
        const bucket = prev[adsetId];
        if (!bucket) return prev;
        return {
          ...prev,
          [adsetId]: {
            ...bucket,
            items: (bucket.items || []).map((ad) =>
              (ad.ad_id || ad.id) === adId ? { ...ad, status: newStatus } : ad
            ),
          },
        };
      });
      toast({ title: "Ad status updated!", status: "success", duration: 1000, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Error", description: e.message, status: "error", duration: 2200, isClosable: true, position: "top" });
    }
  };

  // фильтрация/сортировка
  const processedAdsets = useMemo(() => {
    let filtered = [...allAdsets];
    if (statusFilter !== "ALL") filtered = filtered.filter((a) => a.status === statusFilter);
    if (selectedAccount !== "all") filtered = filtered.filter((a) => a.account_name === selectedAccount);
    if (objectiveFilter !== "all") filtered = filtered.filter((a) => a.objective === objectiveFilter);

    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [allAdsets, selectedAccount, objectiveFilter, statusFilter, sortConfig]);

  const accounts   = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.objective || "N/A"))], [allAdsets]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction });
  };

  const SortableTh = ({ children, sortKey }) => (
    <Th cursor="pointer" onClick={() => requestSort(sortKey)} color="gray.200">
      <Flex align="center">
        {children}
        {sortConfig.key === sortKey && (
          <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />
        )}
      </Flex>
    </Th>
  );

  // Вложенная таблица, но в тех же колонках (через общий <colgroup/>)
  const AdsRows = ({ adsetId, items = [], loading, error }) => {
    return (
      <Box bg="#1a2550">
        {loading && (
          <Flex align="center" justify="center" py={4} color="gray.300" gap={2}>
            <Spinner size="sm" /> <Text>Loading ads…</Text>
          </Flex>
        )}
        {!loading && error && (
          <Text color="red.300" fontSize="sm" px={4} py={3}>Error: {error}</Text>
        )}
        {!loading && !error && (!items || items.length === 0) && (
          <Text color="gray.300" fontSize="sm" px={4} py={3}>No ads found for this ad set.</Text>
        )}

        {!loading && !error && items && items.length > 0 && (
          <Table
            variant="simple"
            size="sm"
            color="#fff"
            sx={{
              tableLayout: "fixed",
              width: "100%",
              "& th, & td": { borderRight: "1px solid rgba(255,255,255,0.10)" },
              "& th:last-of-type, & td:last-of-type": { borderRight: "none" },
              // выравниваем паддинги с родительской таблицей
              "& td": { py: 3 },
            }}
          >
            <ColGroup />
            <Tbody>
              {items.map((ad) => {
                const id   = ad.ad_id || ad.id;
                const name = ad.ad_name || ad.name || "Untitled Ad";
                const thumb = ad.thumbnail_url || ad.creative_thumbnail || ad.image_url || undefined;

                const spend       = Number(ad.spend || 0);
                const impressions = Number(ad.impressions || 0);
                const frequency   = Number(ad.frequency || 0);
                const clicksLink  = Number(ad.link_clicks ?? ad.clicks ?? 0);
                const leads       = Number(ad.leads ?? ad.results ?? 0);
                const ctrAll      = Number(ad.ctr || 0); // уже %
                const ctrLink     = impressions > 0 ? (clicksLink / impressions) * 100 : 0;
                const cpm         = impressions > 0 ? spend / (impressions / 1000) : Number(ad.cpm || 0);
                const cpl         = leads > 0 ? spend / leads : 0;

                return (
                  <Tr key={id}>
                    {/* 1. та же первая колонка */}
                    <Td>
                      <HStack align="center" spacing={3}>
                        <Image
                          src={thumb}
                          alt={name}
                          boxSize="32px"
                          objectFit="cover"
                          borderRadius="md"
                          bg="gray.600"
                          cursor={thumb ? "zoom-in" : "default"}
                          onClick={() => thumb && window.open(thumb, "_blank")}
                        />
                        <Box minW={0}>
                          <Text noOfLines={1} fontWeight="semibold">{name}</Text>
                        </Box>
                      </HStack>
                    </Td>

                    {/* 2. статус (ровно под колонкой Status) */}
                    <Td>
                      <ChSwitch
                        colorScheme="teal"
                        isChecked={(ad.status || "").toUpperCase() === "ACTIVE"}
                        onChange={() =>
                          handleAdStatusChange(
                            adsetId,
                            id,
                            (ad.status || "").toUpperCase() === "ACTIVE" ? "PAUSED" : "ACTIVE"
                          )
                        }
                      />
                    </Td>

                    {/* 3. Objective — у ad нет своей цели */}
                    <Td><Text fontSize="xs">—</Text></Td>

                    <Td>{money(spend)}</Td>
                    <Td>{num(impressions)}</Td>
                    <Td>{num(frequency)}</Td>
                    <Td>{num(leads)}</Td>
                    <Td>{money(cpl)}</Td>
                    <Td>{money(cpm)}</Td>
                    <Td>{pct(ctrAll)}</Td>
                    <Td>{pct(ctrLink)}</Td>
                    <Td>{num(clicksLink)}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
    );
  };

  const SEPARATOR = "rgba(255,255,255,0.10)";

  const renderTableBody = () => {
    if (loading) return (<Tr><Td colSpan={COLCOUNT} textAlign="center">Loading ad sets...</Td></Tr>);
    if (error)   return (<Tr><Td colSpan={COLCOUNT} textAlign="center">Error: {error}</Td></Tr>);
    if (!processedAdsets.length)
      return (<Tr><Td colSpan={COLCOUNT} textAlign="center">No ad sets found.</Td></Tr>);

    return processedAdsets.map((adset) => {
      const isOpen = !!expanded[adset.adset_id];
      const cache = adsCache[adset.adset_id] || { items: [], loading: false, error: null };
      return (
        <Fragment key={adset.adset_id}>
          <TablesTableRow
            adset={adset}
            expanded={isOpen}
            onToggleExpand={() => toggleExpand(adset.adset_id)}
            onStatusChange={handleStatusChange}
            isUpdating={updatingId === adset.adset_id}
          />
          {isOpen && (
            <Tr>
              <Td colSpan={COLCOUNT} p={0} bg="#1a2550" borderTop={`1px solid ${SEPARATOR}`}>
                {/* ВЛОЖЕННАЯ ТАБЛИЦА В ТЕХ ЖЕ КОЛОНКАХ */}
                <AdsRows
                  adsetId={adset.adset_id}
                  items={cache.items}
                  loading={cache.loading}
                  error={cache.error}
                />
              </Td>
            </Tr>
          )}
        </Fragment>
      );
    });
  };

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <<CardHeader>
  <Flex direction="column" w="100%">
    <Text fontSize="xl" color="#fff" fontWeight="bold">
      Active Ad Sets
    </Text>

    {/* Фильтры: одна строка + горизонтальный скролл при нехватке места */}
    <Box mt="16px" overflowX="auto">
      <Flex align="center" gap={3} minW="max-content" pr={1}>
        <Select
          minW="220px"
          flexShrink={0}
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          size="sm"
          borderRadius="md"
          borderColor="gray.600"
          color="white"
          sx={{ "> option": { background: "#0F1535" } }}
        >
          {accounts.map((acc) => (
            <option key={acc} value={acc}>
              {acc === "all" ? "All Accounts" : acc}
            </option>
          ))}
        </Select>

        <Select
          minW="220px"
          flexShrink={0}
          value={objectiveFilter}
          onChange={(e) => setObjectiveFilter(e.target.value)}
          size="sm"
          borderRadius="md"
          borderColor="gray.600"
          color="white"
          sx={{ "> option": { background: "#0F1535" } }}
        >
          {objectives.map((obj) => (
            <option key={obj} value={obj}>
              {obj === "all" ? "All Objectives" : obj}
            </option>
          ))}
        </Select>

        <Select
          minW="180px"
          flexShrink={0}
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
          size="sm"
          borderRadius="md"
          borderColor="gray.600"
          color="white"
          sx={{ "> option": { background: "#0F1535" } }}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last_7d">Last 7 Days</option>
          <option value="last_30d">Last 30 Days</option>
          <option value="maximum">Maximum</option>
        </Select>

        <Select
          minW="160px"
          flexShrink={0}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="sm"
          borderRadius="md"
          borderColor="gray.600"
          color="white"
          sx={{ "> option": { background: "#0F1535" } }}
        >
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="ALL">All</option>
        </Select>

        {/* actions справа */}
        <IconButton
          aria-label="Save view"
          icon={<Icon as={FaSave} />}
          size="sm"
          flexShrink={0}
          onClick={() =>
            toast({
              title: "View saved",
              description: "Filters and sort are stored locally.",
              status: "info",
              duration: 2000,
              isClosable: true,
              position: "top",
            })
          }
        />
        <HStack spacing={2} flexShrink={0}>
          <IconButton
            aria-label="Refresh"
            icon={<RepeatIcon />}
            size="sm"
            onClick={fetchData}
            isLoading={loading}
          />
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
            Updated: {lastUpdatedLabel}
          </Text>
        </HStack>
      </Flex>
    </Box>
  </Flex>
</CardHeader>

        <CardBody>
          <Box
            maxH="70vh"
            overflow="auto"
            sx={{
              "&::-webkit-scrollbar": { height: "8px", width: "8px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "#4A5568" },

              // липкие заголовки + 1-я колонка
              "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#2a406e" },
              "& thead th:first-of-type": { left: 0, zIndex: 5, boxShadow: `inset -1px 0 0 rgba(255,255,255,0.10)` },
              "& tbody > tr > td:first-of-type": { position: "sticky", left: 0, zIndex: 4, background: "#273b66", boxShadow: `inset -1px 0 0 rgba(255,255,255,0.10)` },

              // вертикальные линии
              "& th, & td": { borderRight: "1px solid rgba(255,255,255,0.10)" },
              "& th:last-of-type, & td:last-of-type": { borderRight: "none" },

              // фиксированная раскладка колонок
              "& table": { tableLayout: "fixed", width: "100%" },
            }}
          >
            <Table variant="simple" color="#fff">
              <ColGroup />
              <Thead>
                <Tr my=".8rem" ps="0px">
                  {COLUMNS.map((c) =>
                    c.sortable ? (
                      <SortableTh key={c.key} sortKey={c.key}>{c.label}</SortableTh>
                    ) : (
                      <Th key={c.key} color="gray.200">{c.label}</Th>
                    )
                  )}
                </Tr>
              </Thead>
              <Tbody>{renderTableBody()}</Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </Flex>
  );
}

export default Tables;
