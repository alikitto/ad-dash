import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Switch,
} from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave } from "react-icons/fa";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

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
  const [groupByAccount, setGroupByAccount] = useStickyState(true, "groupByAccount");

  // Updated: now / N mins ago
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
      const response = await fetch(
        `https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}`
      );
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

  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      const response = await fetch(
        `https://ad-dash-backend-production.up.railway.app/api/adsets/${adsetId}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
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

  const accounts = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.account_name || "—"))], [allAdsets]);
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

  const processedAdsets = useMemo(() => {
    // фильтры
    let filtered = [...allAdsets];
    if (statusFilter !== "ALL") filtered = filtered.filter((a) => a.status === statusFilter);
    if (selectedAccount !== "all") filtered = filtered.filter((a) => a.account_name === selectedAccount);
    if (objectiveFilter !== "all") filtered = filtered.filter((a) => a.objective === objectiveFilter);

    // общий сравниватель по текущей сортировке
    const cmp = (a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === "ascending" ? 1 : -1;
      const va = a[key];
      const vb = b[key];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    };

    // Если сортируем по Spent или CPL — игнорируем группировку, чистая глобальная сортировка
    const sortKeyIsGlobal = ["spend", "cpl"].includes(sortConfig.key);
    const shouldGroup = groupByAccount && !sortKeyIsGlobal;

    if (!shouldGroup) {
      return filtered.sort(cmp);
    }

    // Иначе — группируем по аккаунту, сортируем внутри групп, группы — по имени аккаунта
    const groups = filtered.reduce((acc, item) => {
      const key = item.account_name || "—";
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {});
    const orderedAccountNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    const result = [];
    for (const name of orderedAccountNames) {
      const rows = groups[name].slice().sort(cmp);
      result.push(...rows);
    }
    return result;
  }, [allAdsets, selectedAccount, objectiveFilter, statusFilter, sortConfig, groupByAccount]);

  const renderTableBody = () => {
    if (loading) return (<Tr><Td colSpan="12" textAlign="center">Loading ad sets...</Td></Tr>);
    if (error) return (<Tr><Td colSpan="12" textAlign="center">Error: {error}</Td></Tr>);
    if (!processedAdsets.length) return (<Tr><Td colSpan="12" textAlign="center">No ad sets found.</Td></Tr>);
    return processedAdsets.map((adset) => (
      <TablesTableRow
        key={adset.adset_id}
        adset={adset}
        onStatusChange={handleStatusChange}
        isUpdating={updatingId === adset.adset_id}
        datePreset={datePreset}
      />
    ));
  };

  // нейтральный цвет разделителей (под темную тему)
  const SEPARATOR = "rgba(255,255,255,0.10)";

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <Flex direction="column">
            <Text fontSize="xl" color="#fff" fontWeight="bold">Active Ad Sets</Text>
            <HStack mt="20px" spacing={3} align="center" flexWrap="wrap">
              <Select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" } }}>
                {accounts.map((acc) => (<option key={acc} value={acc}>{acc === "all" ? "All Accounts" : acc}</option>))}
              </Select>
              <Select value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" } }}>
                {objectives.map((obj) => (<option key={obj} value={obj}>{obj === "all" ? "All Objectives" : obj}</option>))}
              </Select>
              <Select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" } }}>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7d">Last 7 Days</option>
                <option value="last_30d">Last 30 Days</option>
                <option value="maximum">Maximum</option>
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" } }}>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ALL">All</option>
              </Select>

              {/* Group by account toggle */}
              <HStack pl={2} pr={3} borderLeft={`1px solid ${SEPARATOR}`}>
                <Text fontSize="xs" color="gray.300">Group by account</Text>
                <Switch
                  size="sm"
                  isChecked={groupByAccount}
                  onChange={(e) => setGroupByAccount(e.target.checked)}
                  colorScheme="teal"
                />
              </HStack>

              <IconButton aria-label="Save view" icon={<Icon as={FaSave} />} size="sm"
                onClick={() => toast({ title: "View saved", description: "Filters, grouping and sort are stored locally.", status: "info", duration: 2000, isClosable: true, position: "top" })}
              />
              <HStack spacing={2}>
                <IconButton aria-label="Refresh" icon={<RepeatIcon />} size="sm" onClick={fetchData} isLoading={loading}/>
                <Text fontSize="xs" color="gray.400">Updated: {lastUpdatedLabel}</Text>
              </HStack>
            </HStack>
          </Flex>
        </CardHeader>

        <CardBody>
          {/* СКРОЛЛ-КОНТЕЙНЕР С ЛИПКИМ ХЕДЕРОМ + ВЕРТИКАЛЬНЫЕ ЛИНИИ */}
          <Box
            maxH="70vh"
            overflow="auto"
            sx={{
              "&::-webkit-scrollbar": { height: "8px", width: "8px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "#4A5568" },
              "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#2a406e" },
              "& thead th:first-of-type": { left: 0, zIndex: 5, boxShadow: `inset -1px 0 0 ${SEPARATOR}` },
              "& tbody td:first-of-type": { position: "sticky", left: 0, zIndex: 4, background: "#273b66", boxShadow: `inset -1px 0 0 ${SEPARATOR}` },
              "& th, & td": { borderRight: `1px solid ${SEPARATOR}` },
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
