// src/hooks/useAdsets.js

import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import { useStickyState } from "./useStickyState";
import * as api from "../api/adsets";

export function useAdsets() {
  const [allAdsets, setAllAdsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const toast = useToast();

  // Filters and Sorting
  const [datePreset, setDatePreset] = useStickyState("last_7d", "datePreset");
  const [selectedAccount, setSelectedAccount] = useStickyState("all", "selectedAccount");
  const [statusFilter, setStatusFilter] = useStickyState("ACTIVE", "statusFilter");
  const [objectiveFilter, setObjectiveFilter] = useStickyState("all", "objectiveFilter");
  const [sortConfig, setSortConfig] = useStickyState({ key: "spend", direction: "descending" }, "sortConfig");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchAdsets(datePreset);
      setAllAdsets(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [datePreset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (adsetId, newStatus) => {
    setUpdatingId(adsetId);
    try {
      await api.updateAdsetStatus(adsetId, newStatus);
      setAllAdsets((prev) => prev.map((a) => (a.adset_id === adsetId ? { ...a, status: newStatus } : a)));
      toast({ title: "Status updated!", status: "success", duration: 1500, isClosable: true, position: "top" });
    } catch (e) {
      toast({ title: "Couldn't update status", description: e.message, status: "error", duration: 2500, isClosable: true, position: "top" });
    } finally {
      setUpdatingId(null);
    }
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

  const accounts = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.account_name))], [allAdsets]);
  const objectives = useMemo(() => ["all", ...new Set(allAdsets.map((a) => a.objective || "N/A"))], [allAdsets]);
  
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  return {
    // Data
    processedAdsets,
    accounts,
    objectives,
    // State
    loading,
    error,
    updatingId,
    lastUpdated,
    // Filters & Sorting
    filters: { datePreset, selectedAccount, statusFilter, objectiveFilter },
    setters: { setDatePreset, setSelectedAccount, setStatusFilter, setObjectiveFilter },
    sortConfig,
    requestSort,
    // Actions
    fetchData,
    handleStatusChange,
  };
}
