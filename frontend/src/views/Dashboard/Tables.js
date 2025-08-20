import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, HStack, Icon, IconButton } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave } from "react-icons/fa";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

// ... (useStickyState, и вся логика компонента остаются без изменений) ...
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
  const [sortConfig, setSortConfig] = useStickyState({ key: 'spend', direction: 'descending' }, "sortConfig");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}`);
      const data = await response.json();
      if (data.detail) throw new Error(data.detail);
      setAllAdsets(data);
    } catch (e) {
      setError(e.message);
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
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets/${adsetId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update status");
      }
      setAllAdsets(allAdsets.map(a => a.adset_id === adsetId ? { ...a, status: newStatus } : a));
      toast({ title: "Status updated successfully!", status: "success", duration: 2000, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Error updating status.", description: e.message, status: "error", duration: 3000, isClosable: true, position: "top" });
    } finally {
      setUpdatingId(null);
    }
  };

  const processedAdsets = useMemo(() => {
    let filtered = [...allAdsets];
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(adset => adset.status === statusFilter);
    }
    if (selectedAccount !== "all") {
      filtered = filtered.filter(adset => adset.account_name === selectedAccount);
    }
    if (objectiveFilter !== "all") {
        filtered = filtered.filter(adset => adset.objective === objectiveFilter);
    }
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [allAdsets, selectedAccount, objectiveFilter, statusFilter, sortConfig]);

  const accounts = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.objective || "N/A"))], [allAdsets]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableTh = ({ children, sortKey }) => (
    <Th cursor="pointer" onClick={() => requestSort(sortKey)} color="gray.400">
      <Flex align="center">
        {children}
        {sortConfig.key === sortKey && (
          <Icon as={sortConfig.direction === 'ascending' ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />
        )}
      </Flex>
    </Th>
  );
  
  const renderTableBody = () => {
    if (loading) return <Tr><Td colSpan="12" textAlign="center">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan="12" textAlign="center">Error: {error}</Td></Tr>;
    if (!processedAdsets.length) return <Tr><Td colSpan="12" textAlign="center">No ad sets found matching your criteria.</Td></Tr>;
    
    return processedAdsets.map((adset) => (
      <TablesTableRow key={adset.adset_id} adset={adset} onStatusChange={handleStatusChange} isUpdating={updatingId === adset.adset_id} />
    ));
  };

  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <Flex direction="column">
            <Text fontSize='xl' color='#fff' fontWeight='bold'>Active Ad Sets</Text>
            <HStack mt="20px" spacing={3}>
              {/* ... (фильтры остаются без изменений) ... */}
              <Select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} size="sm" borderRadius="md"  borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" }}}>
                {accounts.map(acc => <option key={acc} value={acc}>{acc === 'all' ? 'All Accounts' : acc}</option>)}
              </Select>
              <Select value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" }}}>
                {objectives.map(obj => <option key={obj} value={obj}>{obj === 'all' ? 'All Objectives' : obj}</option>)}
              </Select>
            <Select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" }}}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="maximum">Maximum</option> {/* <-- ДОБАВЬТЕ ЭТУ СТРОКУ */}
</Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm" borderRadius="md" borderColor="gray.600" color="white" sx={{ "> option": { background: "#0F1535" }}}>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ALL">All</option>
              </Select>
              <IconButton aria-label="Refresh Data" icon={<RepeatIcon />} size="sm" onClick={fetchData} isLoading={loading} />
              <IconButton aria-label="Save Filters" icon={<Icon as={FaSave} />} size="sm" onClick={() => toast({ title: "Filters saved!", description: "Your current filter and sort settings are saved automatically.", status: "info", duration: 3000, isClosable: true, position: "top" })} />
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          {/* ИЗМЕНЕНИЕ: Добавляем Box со стилями для скроллбара */}
          <Box
            overflowX="auto"
            sx={{
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#2D3748", // Темно-серый
                borderRadius: "8px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "#4A5568", // Серый посветлее
              },
            }}
          >
            <Table variant='simple' color='#fff'>
              <Thead>
                <Tr my='.8rem' ps='0px'>
                  <Th
                    color="white"
                    position="sticky"
                    left="0"
                    zIndex="1"
                    bg="#2a406e" // Тот же фон, что и у ячейки
                  >
                    Ad Set / Campaign
                  </Th>
                  {/* ... (остальные заголовки Th остаются без изменений) ... */}
                  <Th color="gray.400">Objective</Th>
                  <SortableTh sortKey="spend">Spent</SortableTh>
                  <Th color="gray.400">Impressions</Th>
                  <Th color="gray.400">Frequency</Th>
                  <Th color="gray.400">Leads (CPA)</Th>
                  <SortableTh sortKey="cpl">CPL</SortableTh>
                  <Th color="gray.400">CPM</Th>
                  <Th color="gray.400">CTR (All)</Th>
                  <Th color="gray.400">CTR (Link Click)</Th>
                  <Th color="gray.400">Link Clicks</Th>
                  <Th color="gray.400">Status</Th>
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
