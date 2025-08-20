import React, { useState, useEffect, useMemo } from "react";
import { Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, HStack } from "@chakra-ui/react";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

function Tables() {
  const [allAdsets, setAllAdsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();
  const [datePreset, setDatePreset] = useState("last_7d");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'spend', direction: 'descending' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}`); // REPLACE WITH YOUR URL
        const data = await response.json();
        if (data.detail) throw new Error(data.detail);
        setAllAdsets(data);
      } catch (e) { setError(e.message); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [datePreset]);

  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets/${adsetId}/update-status`, { // REPLACE WITH YOUR URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to update status");
      }
      setAllAdsets(allAdsets.map(a => a.adset_id === adsetId ? { ...a, status: newStatus } : a));
      toast({ title: "Status updated successfully!", status: "success", duration: 2000, isClosable: true });
    } catch (e) {
      toast({ title: "Error updating status.", description: e.message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setUpdatingId(null);
    }
  };

  const processedAdsets = useMemo(() => {
    let filtered = [...allAdsets];
    if (selectedAccount !== "all") {
      filtered = filtered.filter(adset => adset.account_name === selectedAccount);
    }
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [allAdsets, selectedAccount, sortConfig]);

  const accounts = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.account_name))], [allAdsets]);
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const renderTableBody = () => {
    if (loading) return <Tr><Td colSpan="8" textAlign="center">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan="8" textAlign="center">Error: {error}</Td></Tr>;
    if (!processedAdsets.length) return <Tr><Td colSpan="8" textAlign="center">No ad sets found matching your criteria.</Td></Tr>;
    
    return processedAdsets.map((adset) => (
      <TablesTableRow key={adset.adset_id} adset={adset} onStatusChange={handleStatusChange} isUpdating={updatingId === adset.adset_id} />
    ));
  };
  
  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader p='6px 0px 22px 0px'>
          <Flex justify="space-between" align="center" direction={{ base: "column", md: "row" }}>
            <Text fontSize='xl' color='#fff' fontWeight='bold' mb={{ base: "10px", md: "0" }}>Active Ad Sets</Text>
            <HStack>
              <Select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} size="sm" borderRadius="md" bg="#0F1535" borderColor="gray.600">
                {accounts.map(acc => <option key={acc} value={acc} style={{backgroundColor: "#0F1535"}}>{acc === 'all' ? 'All Accounts' : acc}</option>)}
              </Select>
              <Select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} size="sm" borderRadius="md" bg="#0F1535" borderColor="gray.600">
                <option value="today" style={{backgroundColor: "#0F1535"}}>Today</option>
                <option value="yesterday" style={{backgroundColor: "#0F1535"}}>Yesterday</option>
                <option value="last_7d" style={{backgroundColor: "#0F1535"}}>Last 7 Days</option>
                <option value="last_30d" style={{backgroundColor: "#0F1535"}}>Last 30 Days</option>
              </Select>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <Table variant='simple' color='#fff'>
            <Thead>
              <Tr my='.8rem' ps='0px' color='gray.400'>
                <Th>Ad Set / Campaign</Th>
                <Th cursor="pointer" onClick={() => requestSort('spend')}>Spent</Th>
                <Th>Leads (CPA)</Th>
                <Th cursor="pointer" onClick={() => requestSort('cpl')}>CPL</Th>
                <Th>CPM</Th>
                <Th>CTR (All)</Th>
                <Th>Clicks</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>{renderTableBody()}</Tbody>
          </Table>
        </CardBody>
      </Card>
    </Flex>
  );
}
export default Tables;
