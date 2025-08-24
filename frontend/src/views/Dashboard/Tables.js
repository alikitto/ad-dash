// frontend/src/components/Tables/Tables.js

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, HStack, Icon, IconButton, Button, Spacer } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave, FaMagic } from "react-icons/fa";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";
import AnalysisModal from "components/Tables/AnalysisModal";

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => { window.localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

function Tables() {
  const [allAdsets, setAllAdsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  const [datePreset, setDatePreset] = useStickyState("last_7d", "datePreset");
  const [selectedAccount, setSelectedAccount] = useStickyState("all", "selectedAccount");
  const [statusFilter, setStatusFilter] = useStickyState("ACTIVE", "statusFilter");
  const [objectiveFilter, setObjectiveFilter] = useStickyState("all", "objectiveFilter");
  const [sortConfig, setSortConfig] = useStickyState({ key: "spend", direction: "descending" }, "sortConfig");
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
    if (mins < 1) return "now";
    if (mins === 1) return "1 min ago";
    return mins < 60 ? `${mins} mins ago` : `${Math.floor(mins / 60)} hrs ago`;
  }, [lastUpdated, tick]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}`);
      const data = await response.json();
      if (data.detail) throw new Error(data.detail);
      setAllAdsets(data); setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally { setLoading(false); }
  }, [datePreset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets/${adsetId}/update-status`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Failed to update status");
      setAllAdsets((prev) => prev.map((a) => (a.adset_id === adsetId ? { ...a, status: newStatus } : a)));
      toast({ title: "Status updated!", status: "success", duration: 1500, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Couldn't update status", description: e.message, status: "error", duration: 2500, isClosable: true, position: "top" });
    } finally { setUpdatingId(null); }
  };

  const processedAdsets = useMemo(() => {
    let filtered = [...allAdsets];
    if (statusFilter !== "ALL") filtered = filtered.filter((a) => a.status === statusFilter);
    if (selectedAccount !== "all") filtered = filtered.filter((a) => a.account_name === selectedAccount);
    if (objectiveFilter !== "all") filtered = filtered.filter((a) => a.objective === objectiveFilter);
    filtered.sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === "ascending" ? 1 : -1;
      const va = a[key], vb = b[key];
      if (typeof va === "string" || typeof vb === "string") return (va ?? "").toString().toLowerCase().localeCompare((vb ?? "").toString().toLowerCase()) * dir;
      const na = Number.isFinite(va) ? va : 0, nb = Number.isFinite(vb) ? vb : 0;
      if (na < nb) return -1 * dir; if (na > nb) return 1 * dir; return 0;
    });
    return filtered;
  }, [allAdsets, selectedAccount, objectiveFilter, statusFilter, sortConfig]);
  
  const handleAnalysisClick = async () => {
    if (!processedAdsets || processedAdsets.length === 0) {
      toast({ title: "No data to analyze", status: "warning", duration: 2000, isClosable: true, position: "top" });
      return;
    }
    setIsAnalyzing(true); setAnalysisResult(null);
    try {
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/analyze-adsets`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(processedAdsets),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Failed to fetch");
      const data = await response.json();
      setAnalysisResult(data); setIsModalOpen(true);
    } catch (e) {
      toast({ title: "AI Analysis Error", description: e.message, status: "error", duration: 2500, isClosable: true, position: "top" });
    } finally { setIsAnalyzing(false); }
  };

  const accounts = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.objective || "N/A"))], [allAdsets]);
  const requestSort = (key) => { let direction = "ascending"; if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending"; setSortConfig({ key, direction }); };
  const SortableTh = ({ children, sortKey }) => (<Th color="white" cursor="pointer" onClick={() => requestSort(sortKey)}><Flex align="center">{children}{sortConfig.key === sortKey && <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />}</Flex></Th>);
  const renderTableBody = () => {
    if (loading) return <Tr><Td colSpan={13} textAlign="center">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan={13} textAlign="center">Error: {error}</Td></Tr>;
    if (!processedAdsets.length) return <Tr><Td colSpan={13} textAlign="center">No ad sets found.</Td></Tr>;
    return processedAdsets.map((adset) => <TablesTableRow key={adset.adset_id} adset={adset} onStatusChange={handleStatusChange} isUpdating={updatingId === adset.adset_id} datePreset={datePreset} />);
  };

  const SEPARATOR = "rgba(255,255,255,0.10)";

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader mb="4">
          <Flex direction="column">
            <Text fontSize="xl" color="white" fontWeight="bold">Active Ad Sets</Text>
            <HStack mt="20px" spacing={3} align="center">
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} size="sm" borderRadius="md" maxW="200px">{accounts.map((acc) => <option key={acc} value={acc}>{acc === "all" ? "All Accounts" : acc}</option>)}</Select>
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)} size="sm" borderRadius="md" maxW="200px">{objectives.map((obj) => <option key={obj} value={obj}>{obj === "all" ? "All Objectives" : obj}</option>)}</Select>
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={datePreset} onChange={(e) => setDatePreset(e.target.value)} size="sm" borderRadius="md" maxW="150px"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last_7d">Last 7 Days</option><option value="last_30d">Last 30 Days</option><option value="maximum">Maximum</option></Select>
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm" borderRadius="md" maxW="120px"><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="ALL">All</option></Select>
              <Spacer />
              <HStack spacing={2}>
                <Button leftIcon={<Icon as={FaMagic} />} colorScheme="purple" size="sm" onClick={handleAnalysisClick} isLoading={isAnalyzing} loadingText="Analyzing">AI Analysis</Button>
                <IconButton aria-label="Refresh" icon={<RepeatIcon />} size="sm" onClick={fetchData} isLoading={loading} />
                <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">Updated: {lastUpdatedLabel}</Text>
              </HStack>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody pt="0">
          <Box maxH="70vh" overflow="auto" sx={{ "&::-webkit-scrollbar": { height: "8px", width: "8px" }, "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" }, "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#2a406e" }, "& thead th:first-of-type": { left: 0, zIndex: 5 }, "& tbody td:first-of-type": { position: "sticky", left: 0, zIndex: 4 }, "& th, & td": { borderRight: `1px solid ${SEPARATOR}` }}}>
            <Table variant="simple" color="white">
              <Thead>
                <Tr my=".8rem" ps="0px">
                  <SortableTh sortKey="account_name">Account / Campaign / Ad Set</SortableTh>
                  <Th color="white">Status</Th>
                  <Th color="white">Actions</Th>
                  <Th color="white">Objective</Th>
                  <SortableTh sortKey="spend">Spent</SortableTh>
                  <SortableTh sortKey="impressions">Impressions</SortableTh>
                  <SortableTh sortKey="frequency">Frequency</SortableTh>
                  <SortableTh sortKey="leads">Leads</SortableTh>
                  <SortableTh sortKey="cpl">CPL</SortableTh>
                  <SortableTh sortKey="cpm">CPM</SortableTh>
                  <SortableTh sortKey="ctr_all">CTR (All)</SortableTh>
                  <Th color="white">CTR (Link Click)</Th>
                  <SortableTh sortKey="link_clicks">Link Clicks</SortableTh>
                </Tr>
              </Thead>
              <Tbody>{renderTableBody()}</Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
      {analysisResult && <AnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={analysisResult} />}
    </Flex>
  );
}

export default Tables;
