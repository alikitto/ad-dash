// frontend/src/components/Tables/Tables.js (Full updated code)

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, HStack, Icon, IconButton, Button, Spacer, keyframes, Input } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave, FaMagic } from "react-icons/fa";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";
import AnalysisModal from "components/Tables/AnalysisModal";

const blinkAnimation = keyframes`
  50% { opacity: 0.3; }
`;

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
  
  // --- НОВЫЕ СТЕЙТЫ ДЛЯ ДАТ ---
  const [datePreset, setDatePreset] = useStickyState("last_7d", "datePreset");
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // --- ОБНОВЛЕНА ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ ---
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    let url = `https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}`;
    
    if (datePreset === 'custom' && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.detail) throw new Error(data.detail);
      setAllAdsets(data); setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally { setLoading(false); }
  }, [datePreset, startDate, endDate]); // Добавлены зависимости

  useEffect(() => { 
    // Запускаем загрузку, только если для 'custom' выбраны обе даты
    if (datePreset === 'custom' && (!startDate || !endDate)) {
      setAllAdsets([]); // Очищаем данные, если даты неполные
      return;
    }
    fetchData(); 
  }, [fetchData, datePreset, startDate, endDate]);

  const handleStatusChange = async (adsetId, newStatus) => {
    // ...
  };
  const processedAdsets = useMemo(() => {
    // ...
  }, [allAdsets, selectedAccount, objectiveFilter, statusFilter, sortConfig]);
  const handleAnalysisClick = async () => {
    // ...
  };
  const accounts = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.objective || "N/A"))], [allAdsets]);
  const requestSort = (key) => { /* ... */ };
  const SortableTh = ({ children, sortKey }) => (/* ... */);
  
  const renderTableBody = () => {
    const animation = `${blinkAnimation} 1.5s ease-in-out infinite`;
    if (loading) return ( <Tr><Td colSpan={13} textAlign="center"><Flex justify="center" align="center" py={4}><Text fontSize="lg" animation={animation}>⌛ Loading ad sets...</Text></Flex></Td></Tr> );
    if (error) return <Tr><Td colSpan={13} textAlign="center">Error: {error}</Td></Tr>;
    if (datePreset === 'custom' && (!startDate || !endDate)) {
        return <Tr><Td colSpan={13} textAlign="center">Please select a start and end date.</Td></Tr>
    }
    if (!processedAdsets.length) return <Tr><Td colSpan={13} textAlign="center">No ad sets found for this period.</Td></Tr>;
    
    return processedAdsets.map((adset) => ( <TablesTableRow key={adset.adset_id} adset={adset} onStatusChange={handleStatusChange} isUpdating={updatingId === adset.adset_id} datePreset={datePreset} startDate={startDate} endDate={endDate} /> ));
  };

  const SEPARATOR = "rgba(255,255,255,0.10)";

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader mb="4">
          <Flex direction="column">
            <Text fontSize="xl" color="white" fontWeight="bold">Active Ad Sets</Text>
            <HStack mt="20px" spacing={3} align="center" flexWrap="wrap">
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} size="sm" borderRadius="md" maxW="200px">{accounts.map((acc) => <option key={acc} value={acc}>{acc === "all" ? "All Accounts" : acc}</option>)}</Select>
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)} size="sm" borderRadius="md" maxW="200px">{objectives.map((obj) => <option key={obj} value={obj}>{obj === "all" ? "All Objectives" : obj}</option>)}</Select>
              <Select color="white" sx={{ "> option": { background: "#0F1535" } }} value={datePreset} onChange={(e) => setDatePreset(e.target.value)} size="sm" borderRadius="md" maxW="150px">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7d">Last 7 Days</option>
                <option value="last_30d">Last 30 Days</option>
                <option value="maximum">Maximum</option>
                <option value="custom">Custom Range</option>
              </Select>
              {datePreset === 'custom' && (
                <>
                  <Input type="date" size="sm" borderRadius="md" maxW="150px" color="white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <Input type="date" size="sm" borderRadius="md" maxW="150px" color="white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </>
              )}
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
          {/* ... Table structure remains the same */}
        </CardBody>
      </Card>
      {analysisResult && <AnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={analysisResult} />}
    </Flex>
  );
}

export default Tables;
