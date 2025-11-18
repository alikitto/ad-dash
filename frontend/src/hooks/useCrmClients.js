import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "config/api";

export const normalizeClientKey = (value) =>
  value ? String(value).trim().toLowerCase() : "";

export function useCrmClients() {
  const [clients, setClients] = useState([]);
  const [index, setIndex] = useState({ byId: {}, byName: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buildIndex = useCallback((list) => {
    const byId = {};
    const byName = {};
    list.forEach((client) => {
      if (client?.account_id) byId[String(client.account_id)] = client;
      if (client?.account_name) byName[normalizeClientKey(client.account_name)] = client;
    });
    return { byId, byName };
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/clients`);
      if (!response.ok) throw new Error("Failed to load clients");
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      setIndex(buildIndex(list));
      setError(null);
    } catch (err) {
      console.error("useCrmClients error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [buildIndex]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const hasData = useMemo(() => clients.length > 0, [clients]);

  return {
    clients,
    index,
    loading,
    error,
    refresh: fetchClients,
    hasData,
  };
}

