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
  const lastUpdatedLabel = useMemo(() => {
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      toast({ title: "Status updated!", status: "success", duration: 1500, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Couldn't update status", description: e.message, status: "error", duration: 2500, isClosable: true, position: "top" });
    } finally {
      setUpdatingId(null);
    }
  };

  // статус объявлений (тумблер в подтаблице)
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
      // обновим локальный кэш ads
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
      toast({ title: "Ad status updated!", status: "success", duration: 1200, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Error", description: e.message, status: "error", duration: 2500, isClosable: true, position: "top" });
    }
  };

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

  const accounts = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.account_name))], [allAdsets]);
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

  // мини-таблица объявлений: те же колонки, что и в основной
  const AdsSubTable = ({ adsetId, items = [], loading, error }) => {
    const formatCurrency = (v) => (typeof v !== "number" || !isFinite(v) ? "$0.00" : `$${v.toFixed(2)}`);
    const formatPct = (v) => (typeof v !== "number" || !isFinite(v) ? "0.00%" : `${v.toFixed(2)}%`);
    const formatNum = (v) => (typeof v !== "number" || !isFinite(v) ? "0" : v.toLocaleString("en-US"));

    return (
      <Box p={3} bg="#1e2b52" borderTop="1px solid rgba(255,255,255,0.1)">
        {loading && (
          <Flex align="center" justify="center" py={6} color="gray.300" gap={2}>
            <Spinner size="sm" /> <Text>Loading ads…</Text>
          </Flex>
        )}
        {!loading && error && <Text color="red.300" fontSize="sm">Error: {error}</Text>}
        {!loading && !error && (!items || items.length === 0) && (
          <Text color="gray.300" fontSize="sm">No ads found for this ad set.</Text>
        )}

        {!loading && !error && items && items.length > 0 && (
          <Box
            overflowX="auto"
            sx={{
              "& th, & td": { borderRight: "1px solid rgba(255,255,255,0.10)" },
              "& th:last-of-type, & td:last-of-type": { borderRight: "none" },
            }}
          >
            <Table variant="simple" size="sm" color="#fff" sx={{ minWidth: "1200px" }}>
              <Thead>
                <Tr>
                  <Th color="gray.200">Ad</Th>
                  <Th color="gray.200">Status</Th>
                  <Th color="gray.200">Objective</Th>
                  <Th color="gray.200">Spent</Th>
                  <Th color="gray.200">Impressions</Th>
                  <Th color="gray.200">Frequency</Th>
                  <Th color="gray.200">Leads (CPA)</Th>
                  <Th color="gray.200">CPL</Th>
                  <Th color="gray.200">CPM</Th>
                  <Th color="gray.200">CTR (All)</Th>
                  <Th color="gray.200">CTR (Link Click)</Th>
                  <Th color="gray.200">Link Clicks</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((ad) => {
                  const id = ad.ad_id || ad.id;
                  const name = ad.ad_name || ad.name || "Untitled Ad";
                  const thumb =
                    ad.thumbnail_url || ad.creative_thumbnail || ad.image_url || undefined;

                  const spend = Number(ad.spend || 0);
                  const impressions = Number(ad.impressions || 0);
                  const frequency = Number(ad.frequency || 0);
                  const clicks = Number(ad.link_clicks ?? ad.clicks ?? 0);
                  const leads = Number(ad.leads ?? ad.results ?? 0);
                  const ctrAll = Number(ad.ctr || 0);              // уже %
                  const ctrLink = impressions > 0 ? (clicks / impressions) * 100 : 0;
                  const cpm = impressions > 0 ? spend / (impressions / 1000) : Number(ad.cpm || 0);
                  const cpl = leads > 0 ? spend / leads : 0;

                  return (
                    <Tr key={id}>
                      {/* Ad */}
                      <Td>
                        <HStack align="center" spacing={3}>
                          <Image
                            src={thumb}
                            alt={name}
                            boxSize="36px"
                            objectFit="cover"
                            borderRadius="md"
                            bg="gray.600"
                            cursor={thumb ? "zoom-in" : "default"}
                            onClick={() => thumb && window.open(thumb, "_blank")}
                          />
                          <Box minW={0}>
                            <Text fontWeight="semibold" noOfLines={1}>{name}</Text>
                          </Box>
                        </HStack>
                      </Td>

                      {/* Status switch */}
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

                      {/* Objective — у ad нет своей цели, ставим «—» */}
                      <Td><Text fontSize="xs">—</Text></Td>

                      <Td>{formatCurrency(spend)}</Td>
                      <Td>{formatNum(impressions)}</Td>
                      <Td>{formatNum(frequency)}</Td>
                      <Td>{formatNum(leads)}</Td>
                      <Td>{formatCurrency(cpl)}</Td>
                      <Td>{formatCurrency(cpm)}</Td>
                      <Td>{formatPct(ctrAll)}</Td>
                      <Td>{formatPct(ctrLink)}</Td>
                      <Td>{formatNum(clicks)}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    );
  };

  const SEPARATOR = "rgba(255,255,255,0.10)";

  const renderTableBody = () => {
    if (loading) return (<Tr><Td colSpan="12" textAlign="center">Loading ad sets...</Td></Tr>);
    if (error)   return (<Tr><Td colSpan="12" textAlign="center">Error: {error}</Td></Tr>);
    if (!processedAdsets.length)
      return (<Tr><Td colSpan="12" textAlign="center">No ad sets found.</Td></Tr>);

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
              <Td colSpan={12} p={0} bg="#1a2550" borderTop={`1px solid ${SEPARATOR}`}>
                <AdsSubTable
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
        <CardHeader>
          <Flex direction="column" w="100%">
            <Text fontSize="xl" color="#fff" fontWeight="bold">Active Ad Sets</Text>

            {/* FIX фильтров: одна строка, справа — кнопки/таймер; на узких — перенос */}
            <HStack mt="16px" spacing={3} align="center" flexWrap="wrap">
              <HStack spacing={3} flexWrap="wrap">
                <Select minW="220px" flex="0 0 auto"
                  value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
                  size="sm" borderRadius="md" borderColor="gray.600" color="white"
                  sx={{ "> option": { background: "#0F1535" } }}
                >
                  {accounts.map((acc) => (
                    <option key={acc} value={acc}>{acc === "all" ? "All Accounts" : acc}</option>
                  ))}
                </Select>

                <Select minW="220px" flex="0 0 auto"
                  value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)}
                  size="sm" borderRadius="md" borderColor="gray.600" color="white"
                  sx={{ "> option": { background: "#0F1535" } }}
                >
                  {objectives.map((obj) => (
                    <option key={obj} value={obj}>{obj === "all" ? "All Objectives" : obj}</option>
                  ))}
                </Select>

                <Select minW="180px" flex="0 0 auto"
                  value={datePreset} onChange={(e) => setDatePreset(e.target.value)}
                  size="sm" borderRadius="md" borderColor="gray.600" color="white"
                  sx={{ "> option": { background: "#0F1535" } }}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7d">Last 7 Days</option>
                  <option value="last_30d">Last 30 Days</option>
                  <option value="maximum">Maximum</option>
                </Select>

                <Select minW="160px" flex="0 0 auto"
                  value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  size="sm" borderRadius="md" borderColor="gray.600" color="white"
                  sx={{ "> option": { background: "#0F1535" } }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="ALL">All</option>
                </Select>
              </HStack>

              <Spacer />

              <HStack spacing={2}>
                <IconButton
                  aria-label="Save view"
                  icon={<Icon as={FaSave} />}
                  size="sm"
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
                <IconButton aria-label="Refresh" icon={<RepeatIcon />} size="sm" onClick={fetchData} isLoading={loading}/>
                <Text fontSize="xs" color="gray.400">Updated: {lastUpdatedLabel}</Text>
              </HStack>
            </HStack>
          </Flex>
        </CardHeader>

        <CardBody>
          {/* Скролл-контейнер: липкая шапка/первая колонка + вертикальные линии */}
          <Box
            maxH="70vh"
            overflow="auto"
            sx={{
              "&::-webkit-scrollbar": { height: "8px", width: "8px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "#4A5568" },

              "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#2a406e" },
              "& thead th:first-of-type": { left: 0, zIndex: 5, boxShadow: `inset -1px 0 0 rgba(255,255,255,0.10)` },
              "& tbody td:first-of-type": { position: "sticky", left: 0, zIndex: 4, background: "#273b66", boxShadow: `inset -1px 0 0 rgba(255,255,255,0.10)` },

              "& th, & td": { borderRight: "1px solid rgba(255,255,255,0.10)" },
              "& th:last-of-type, & td:last-of-type": { borderRight: "none" },
            }}
          >
            <Table variant="simple" color="#fff">
              <Thead>
                <Tr my=".8rem" ps="0px">
                  <Th color="white">Account / Campaign / Ad Set</Th>
                  <Th color="gray.200">Status</Th>
                  <Th color="gray.200">Objective</Th>
                  <SortableTh sortKey="spend">Spent</SortableTh>
                  <Th color="gray.200">Impressions</Th>
                  <Th color="gray.200">Frequency</Th>
                  <Th color="gray.200">Leads (CPA)</Th>
                  <SortableTh sortKey="cpl">CPL</SortableTh>
                  <Th color="gray.200">CPM</Th>
                  <Th color="gray.200">CTR (All)</Th>
                  <Th color="gray.200">CTR (Link Click)</Th>
                  <Th color="gray.200">Link Clicks</Th>
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
