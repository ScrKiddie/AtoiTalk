import { adminService } from "@/services/admin.service";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export function useReportManagement() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch, isError, error } = useQuery({
    queryKey: ["admin-reports", cursor, statusFilter, limit, debouncedSearch],
    queryFn: () =>
      adminService.getReports({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit,
        cursor,
        query: debouncedSearch || undefined,
      }),
  });

  const handleNextPage = useCallback(() => {
    if (data?.meta?.has_next && data.meta.next_cursor) {
      setCursorStack((prev) => [...prev, cursor || ""]);
      setCursor(data.meta.next_cursor);
    }
  }, [data, cursor]);

  const handlePrevPage = useCallback(() => {
    setCursorStack((prev) => {
      const newStack = [...prev];
      const prevCursor = newStack.pop();
      setCursor(prevCursor || undefined);
      return newStack;
    });
  }, []);

  const reports = data?.data || [];
  const meta = data?.meta;

  return {
    reports,
    meta,
    isLoading,
    isError,
    error,
    refetch,
    filterState: {
      search,
      setSearch,
      statusFilter,
      setStatusFilter,
    },
    pagination: {
      cursor,
      cursorStack,
      handleNextPage,
      handlePrevPage,
    },
  };
}
