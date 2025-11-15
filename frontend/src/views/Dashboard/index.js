// src/views/Dashboard/index.js (Финальная версия)

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Flex, Text, useToast } from "@chakra-ui/react";
import { useAdsets } from "hooks/useAdsets";
import * as api from "api/adsets";
import { formatLastUpdated } from "utils/formatters";

// 👇 ВОТ НУЖНЫЕ ИМПОРТЫ 👇
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
// 👆 -------------------- 👆

import AdsetFilters from "components/Tables/AdsetFilters";
import AdsetTable from "components/Tables/AdsetTable";
import AnalysisModal from "components/Tables/AnalysisModal";

function Dashboard() {
  const {
    processedAdsets, accounts, objectives,
    loading, error, updatingId, lastUpdated,
    filters, setters,
    sortConfig, requestSort,
    fetchData, handleStatusChange
  } = useAdsets();

  // ... остальная логика (хуки, хендлеры) ...
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  const [tick, setTick] = useState(0);
  const resetColumnsRef = useRef(null);
  
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const lastUpdatedLabel = useMemo(() => formatLastUpdated(lastUpdated), [lastUpdated, tick]);
  
  const handleResetColumns = () => {
    if (resetColumnsRef.current) {
      resetColumnsRef.current();
      toast({
        title: "Размеры столбцов сброшены",
        status: "success",
        duration: 2000,
        position: "top",
      });
    } else {
      console.warn("Reset function not available");
      toast({
        title: "Ошибка: функция сброса недоступна",
        status: "error",
        duration: 2000,
        position: "top",
      });
    }
  };

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
      <Card bg="white">
        {/* 👇 И ВОТ ЗДЕСЬ ОН ИСПОЛЬЗУЕТСЯ 👇 */}
        <CardHeader mb="4">
          <Flex direction="column">
            <Text fontSize="xl" color="gray.800" fontWeight="bold" mb="4">
              Active Ad Sets
            </Text>
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
              onResetColumns={handleResetColumns}
            />
          </Flex>
        </CardHeader>
        {/* 👆 -------------------------- 👆 */}
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
            onResetColumns={(fn) => { 
              resetColumnsRef.current = fn;
              console.log("Reset function registered:", !!fn);
            }}
          />
        </CardBody>
      </Card>
      {analysisResult && <AnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={analysisResult} />}
    </Flex>
  );
}

export default Dashboard;
