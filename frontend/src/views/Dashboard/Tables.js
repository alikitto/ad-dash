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
  Switch as ChSwitch,
  FormControl,
  FormLabel,
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

  // New: layout toggles
  const [wideMode, setWideMode] = useStickyState(false, "wideMode");
  const [compact, setCompact] = useStickyState(true, "compactRows"); // compact by default

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
      // window.__lastAdsets = data; // для дебага при желании
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
      <Flex align="center" justify="space-between">
        <span>{children}</span>
        {sortConfig.key === sortKey && (
          <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />
        )}
      </Flex>
    </Th>
  );

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
      />
    ));
  };

  // нейтральный цвет разделителей (под темную тему)
  const SEPARATOR = "rgba(255,255,255,0.10)";
  // таблица: плотность строк
  const rowPy = compact ? "10px" : "14px";
  const headerPy = compact ? "10px" : "14px";

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card w="100%" maxW={wideMode ? "100%" : "1440px"} mx="auto">
        <CardHeader>
          <Flex direction="column" w="100%">
            <HStack justify="space-between" align="center">
              <Text fontSize="xl" color="#fff" fontWeight="bold">Active Ad Sets</Text>

              {/* Layout toggles */}
              <HStack spacing={6}>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="compact" mb="0" color="gray.300" fontSize="sm">Compact</FormLabel>
                  <ChSwitch id="compact" colorScheme="purple" isChecked={compact} onChange={(e) => setCompact(e.target.checked)} />
                </FormControl>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="wide" mb="0" color="gray.300" fontSize="sm">Wide mode</FormLabel>
                  <ChSwitch id="wide" colorScheme="purple" isChecked={wideMode} onChange={(e) => setWideMode(e.target.checked)} />
                </FormControl>
              </HStack>
            </HStack>

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
              <IconButton aria-label="Save view" icon={<Icon as={FaSave} />} size="sm"
                onClick={() => toast({ title: "View saved", description: "Filters and sort are stored locally.", status: "info", duration: 2000, isClosable: true, position: "top" })}
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
            maxH="calc(100vh - 240px)"
            overflow="auto"
            sx={{
              "&::-webkit-scrollbar": { height: "8px", width: "8px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "#4A5568" },

              // липкая шапка
              "& thead th": {
                position: "sticky",
                top: 0,
                zIndex: 3,
                background: "#2a406e",
                py: headerPy,
              },
              "& thead th:first-of-type": {
                left: 0,
                zIndex: 5,
                boxShadow: `inset -1px 0 0 ${SEPARATOR}`,
              },
              "& tbody td:first-of-type": {
                position: "sticky",
                left: 0,
                zIndex: 4,
                background: "#273b66",
                boxShadow: `inset -1px 0 0 ${SEPARATOR}`,
              },

              // вертикальные линии + плотность строк
              "& th, & td": {
                borderRight: `1px solid ${SEPARATOR}`,
              },
              "& th:last-of-type, & td:last-of-type": {
                borderRight: "none",
              },
              "& tbody td": {
                py: rowPy,
              },
            }}
          >
            <Table variant="simple" color="#fff" sx={{ tableLayout: "fixed", minWidth: "1200px" }}>
              <Thead>
                <Tr my=".8rem" ps="0px">
                  <Th color="white" w="420px">Account / Campaign / Ad Set</Th>
                  <Th color="gray.200" w="110px">Status</Th>
                  <Th color="gray.200" w="140px">Objective</Th>
                  <SortableTh sortKey="spend"><span style={{display:"inline-block", minWidth: 90}}>Spent</span></SortableTh>
                  <Th color="gray.200" w="130px">Impressions</Th>
                  <Th color="gray.200" w="120px">Frequency</Th>
                  <Th color="gray.200" w="120px">Leads (CPA)</Th>
                  <SortableTh sortKey="cpl"><span style={{display:"inline-block", minWidth: 80}}>CPL</span></SortableTh>
                  <Th color="gray.200" w="110px">CPM</Th>
                  <Th color="gray.200" w="120px">CTR (All)</Th>
                  <Th color="gray.200" w="140px">CTR (Link Click)</Th>
                  <Th color="gray.200" w="120px">Link Clicks</Th>
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
