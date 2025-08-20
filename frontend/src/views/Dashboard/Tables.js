import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, HStack, Icon, IconButton } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaSave } from "react-icons/fa";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
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
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}`); // ЗАМЕНИТЕ НА ВАШ URL
      const data = await response.json();
      if (data.detail) throw new Error(data.detail);
      setAllAdsets(data);
    } catch (e) { setError(e.message); } 
    finally { setLoading(false); }
  }, [datePreset]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (adsetId, newStatus) => {
    // ... (этот код без изменений)
  };
  const processedAdsets = useMemo(() => {
    // ... (этот код без изменений)
  }, [allAdsets, selectedAccount, objectiveFilter, statusFilter, sortConfig]);
  const accounts = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.objective || "N/A"))], [allAdsets]);
  const requestSort = (key) => {
    // ... (этот код без изменений)
  };
  const SortableTh = ({ children, sortKey }) => (
    // ... (этот код без изменений)
  );
  const renderTableBody = () => {
    // ... (этот код без изменений)
  };
  
  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <Flex direction="column">
            <Text fontSize='xl' color='#fff' fontWeight='bold'>Active Ad Sets</Text>
            <HStack mt="20px" spacing={3}>
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
                <option value="maximum">Maximum</option>
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
          <Box
            overflowX="auto"
            sx={{
              "&::-webkit-scrollbar": { height: "8px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "#4A5568" },
            }}
          >
            <Table variant='simple' color='#fff'>
              <Thead>
                <Tr my='.8rem' ps='0px'>
                  <Th color="gray.400" position="sticky" left="0" zIndex="1" bg="#1A202C">Ad Set / Campaign</Th>
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
