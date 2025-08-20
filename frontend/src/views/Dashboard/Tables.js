import React, { useState, useEffect, useMemo } from "react";
import { Box, Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, Button, HStack, Spacer } from "@chakra-ui/react";
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
  const [statusFilter, setStatusFilter] = useState("ACTIVE"); // По умолчанию показываем активные
  const [sortConfig, setSortConfig] = useState({ key: 'spend', direction: 'descending' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}&status=${statusFilter}`); // ЗАМЕНИТЕ НА ВАШ URL
        const data = await response.json();
        if (data.detail) throw new Error(data.detail);
        setAllAdsets(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [datePreset, statusFilter]); // Перезагружаем данные при смене даты или статуса

  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      const response = await fetch(`https://YOUR-BACKEND-URL/api/adsets/${adsetId}/update-status`, { // ЗАМЕНИТЕ НА ВАШ URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to update status");
      }
      // Обновляем только измененный элемент, чтобы не сбрасывать сортировку
      setAllAdsets(allAdsets.map(a => a.adset_id === adsetId ? { ...a, status: newStatus } : a));
      toast({ title: "Status updated successfully!", status: "success", duration: 2000, isClosable: true });
    } catch (e) {
      toast({ title: "Error updating status.", description: e.message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setUpdatingId(null);
    }
  };

  const processedAdsets = useMemo(() => {
    // ... (логика фильтрации и сортировки остается без изменений) ...
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
    // ... (логика сортировки остается без изменений) ...
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const renderTableBody = () => {
    // ... (логика рендера остается без изменений) ...
    if (loading) return <Tr><Td colSpan="9" textAlign="center">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan="9" textAlign="center">Error: {error}</Td></Tr>;
    if (!processedAdsets.length) return <Tr><Td colSpan="9" textAlign="center">No ad sets found matching your criteria.</Td></Tr>;
    
    return processedAdsets.map((adset) => (
      <TablesTableRow
        key={adset.adset_id}
        adset={adset}
        onStatusChange={handleStatusChange}
        isUpdating={updatingId === adset.adset_id}
      />
    ));
  };
  
  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader p='6px 0px 22px 0px'>
          <Flex direction="column">
            <Text fontSize='xl' color='#fff' fontWeight='bold'>Active Ad Sets</Text>
            {/* ИЗМЕНЕНИЕ: Добавляем отступ и все фильтры */}
            <HStack mt="20px">
              <Select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} size="sm" borderRadius="md">
                {accounts.map(acc => <option key={acc} value={acc}>{acc === 'all' ? 'All Accounts' : acc}</option>)}
              </Select>
              <Select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} size="sm" borderRadius="md">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7d">Last 7 Days</option>
                <option value="last_30d">Last 30 Days</option>
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm" borderRadius="md">
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ALL">All</option>
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
                <Th>CTR (Link Click)</Th>
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
