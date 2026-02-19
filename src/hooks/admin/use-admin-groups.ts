import { adminService } from "@/services/admin.service";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export function useAdminGroups() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
  }, [debouncedSearch]);

  const queryParams = {
    query: debouncedSearch || undefined,
    limit: 20,
    cursor,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-groups", queryParams],
    queryFn: () => adminService.getGroups(queryParams),
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

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return {
    groups: data?.data || [],
    meta: data?.meta,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    search,
    handleSearch,
    handleNextPage,
    handlePrevPage,
    hasPrevPage: cursorStack.length > 0,
    hasNextPage: data?.meta?.has_next,
  };
}
