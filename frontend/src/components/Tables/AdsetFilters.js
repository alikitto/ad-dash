// src/components/Tables/AdsetFilters.js

import React from "react";
import { Select, HStack, Button, Spacer, IconButton, Text, Icon } from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { FaMagic, FaUndo } from "react-icons/fa";

function AdsetFilters({
  filters,
  setters,
  accounts,
  objectives,
  onRefresh,
  onAnalyze,
  isRefreshing,
  isAnalyzing,
  lastUpdatedLabel,
  onResetColumns,
}) {
  const selectStyles = {
    color: "gray.800",
    bg: "white",
    borderColor: "gray.300",
    sx: { 
      "> option": { background: "white", color: "gray.800" },
      "&:hover": { borderColor: "gray.400" }
    },
    size: "sm",
    borderRadius: "md",
  };

  return (
    <HStack mt="20px" spacing={3} align="center">
      <Select {...selectStyles} maxW="200px" value={filters.selectedAccount} onChange={(e) => setters.setSelectedAccount(e.target.value)}>
        {accounts.map((acc) => <option key={acc} value={acc}>{acc === "all" ? "All Accounts" : acc}</option>)}
      </Select>
      <Select {...selectStyles} maxW="200px" value={filters.objectiveFilter} onChange={(e) => setters.setObjectiveFilter(e.target.value)}>
        {objectives.map((obj) => <option key={obj} value={obj}>{obj === "all" ? "All Objectives" : obj}</option>)}
      </Select>
      <Select {...selectStyles} maxW="150px" value={filters.datePreset} onChange={(e) => setters.setDatePreset(e.target.value)}>
        <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="last_7d">Last 7 Days</option>
        <option value="last_30d">Last 30 Days</option><option value="maximum">Maximum</option>
      </Select>
      <Select {...selectStyles} maxW="120px" value={filters.statusFilter} onChange={(e) => setters.setStatusFilter(e.target.value)}>
        <option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="ALL">All</option>
      </Select>
      <Spacer />
      <HStack spacing={2}>
        <Button leftIcon={<Icon as={FaMagic} />} colorScheme="purple" size="sm" onClick={onAnalyze} isLoading={isAnalyzing} loadingText="Analyzing">AI Analysis</Button>
        <IconButton aria-label="Refresh" icon={<RepeatIcon />} size="sm" onClick={onRefresh} isLoading={isRefreshing} />
        {onResetColumns && (
          <IconButton 
            aria-label="Reset Column Sizes" 
            icon={<Icon as={FaUndo} />} 
            size="sm" 
            onClick={onResetColumns}
            title="Сбросить размеры столбцов"
            colorScheme="gray"
            variant="outline"
          />
        )}
        <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">Updated: {lastUpdatedLabel}</Text>
      </HStack>
    </HStack>
  );
}

export default AdsetFilters;
