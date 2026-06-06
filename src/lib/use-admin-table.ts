"use client";

import { useCallback, useEffect, useState } from "react";

type UseAdminTableOptions<Row> = {
  endpoint: string;
  autoLoad?: boolean;
  initialRows?: Row[];
  parseRows?: (data: unknown) => Row[];
};

function parseArrayRows<Row>(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

export function useAdminTable<Row>({
  endpoint,
  autoLoad = true,
  initialRows = [],
  parseRows = parseArrayRows<Row>,
}: UseAdminTableOptions<Row>) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setRows(parseRows(data));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load table";
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, parseRows]);

  useEffect(() => {
    if (!autoLoad) return;

    let cancelled = false;

    fetch(endpoint, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setRows(parseRows(data));
      })
      .catch((loadError) => {
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : "Failed to load table";
          setRows([]);
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoLoad, endpoint, parseRows]);

  return {
    rows,
    setRows,
    loading,
    setLoading,
    error,
    setError,
    query,
    setQuery,
    refresh,
  };
}
