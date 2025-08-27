// src/views/Dashboard/index.js (Это твой бывший Table.js)

import React, { useState, useEffect, useMemo } from "react";
import { Flex, Text, useToast } from "@chakra-ui/react";
import { useAdsets } from "hooks/useAdsets";
import * as api from "api/adsets";
import { formatLastUpdated } from "utils/formatters";

import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import AdsetFilters from "components/Tables/AdsetFilters";
import AdsetTable from "components/Tables/AdsetTable";
import AnalysisModal from "components/Tables/AnalysisModal";

function Dashboard() { // Можно переименовать функцию для ясности
  const {
    processedAdsets, accounts, objectives,
    loading, error, updatingId, lastUpdated,
    filters, setters,
    sortConfig, requestSort,
    fetchData, handleStatusChange
  } = useAdsets();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const lastUpdatedLabel = useMemo(() => formatLastUpdated(lastUpdated), [lastUpdated, tick]);

  const handleAnalysisClick = async () => {
    if (!processedAdsets || processedAdsets.length === 0) {
      toast({ title: "No data to analyze", status: "warning", duration: 2000, position: "top" });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const data = await api.fetchAiAnalysis(processedAdsets);
      setAnalysisResult(data);
      setIsModalOpen(true);
    } catch (e) {
      toast({ title: "AI Analysis Error", description: e.message, status: "error", duration: 2500, position: "top" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader mb="4">
          <Text fontSize="xl" color="white" fontWeight="bold">Active Ad Sets</Text>
          <AdsetFilters
            filters={filters}
            setters={setters}
            accounts={accounts}
            objectives={objectives}
            onRefresh={fetchData}
            onAnalyze={handleAnalysisClick}
            isRefreshing={loading}
            isAnalyzing={isAnalyzing}
            lastUpdatedLabel={lastUpdatedLabel}
          />
        </CardHeader>
        <CardBody pt="0">
          <AdsetTable
            adsets={processedAdsets}
            loading={loading}
            error={error}
            sortConfig={sortConfig}
            onSort={requestSort}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
            datePreset={filters.datePreset}
          />
        </CardBody>
      </Card>
      {analysisResult && <AnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={analysisResult} />}
    </Flex>
  );
}

export default Dashboard;
