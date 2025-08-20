import React, { useState, useEffect, useMemo } from "react";
import { Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr, useToast, HStack, Icon } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
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

  // Состояния для фильтров и сортировки
  const [datePreset, setDatePreset] = useState("last_7d");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [objectiveFilter, setObjectiveFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'spend', direction: 'descending' });

  // Загрузка данных с бэкенда
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Убедитесь, что здесь ваш правильный URL
        const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets?date_preset=${datePreset}&status=${statusFilter}`);
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
  }, [datePreset, statusFilter]);

  // Обработчик смены статуса
  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      // Убедитесь, что здесь ваш правильный URL
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

  // Логика фильтрации и сортировки
  const processedAdsets = useMemo(() => {
    let filtered = [...allAdsets];
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
  }, [allAdsets, selectedAccount, objectiveFilter, sortConfig]);

  // Списки для фильтров
  const accounts = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ['all', ...new Set(allAdsets.map(a => a.objective))], [allAdsets]);

  // Функция для сортировки
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Компонент для сортируемого заголовка
  const SortableTh = ({ children, sortKey }) => (
    <Th cursor="pointer" onClick={() => requestSort(sortKey)} color="gray.400">
