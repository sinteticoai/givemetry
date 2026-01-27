"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  /** Custom render function for cell content */
  render?: (item: T) => React.ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Custom accessor for sorting/filtering */
  accessor?: (item: T) => string | number | Date | null | undefined;
  /** Column width class */
  width?: string;
}

export interface Filter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Unique key accessor for each row */
  getRowKey: (item: T) => string;
  /** Enable search functionality */
  searchable?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Columns to search in */
  searchColumns?: string[];
  /** Filters to display */
  filters?: Filter[];
  /** Items per page options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback when row is clicked */
  onRowClick?: (item: T) => void;
  /** Current filter values (controlled) */
  filterValues?: Record<string, string>;
  /** Callback when filters change */
  onFilterChange?: (filters: Record<string, string>) => void;
  /** Server-side pagination */
  serverPagination?: {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  searchable = false,
  searchPlaceholder = "Search...",
  searchColumns,
  filters = [],
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  isLoading = false,
  emptyMessage = "No data found",
  onRowClick,
  filterValues: externalFilterValues,
  onFilterChange,
  serverPagination,
}: DataTableProps<T>) {
  // Local state for client-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [internalFilterValues, setInternalFilterValues] = useState<Record<string, string>>({});

  const filterValues = externalFilterValues ?? internalFilterValues;

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterValues, [key]: value };
    if (value === "" || value === "all") {
      delete newFilters[key];
    }
    if (onFilterChange) {
      onFilterChange(newFilters);
    } else {
      setInternalFilterValues(newFilters);
    }
    setPage(1);
  };

  const clearFilters = () => {
    if (onFilterChange) {
      onFilterChange({});
    } else {
      setInternalFilterValues({});
    }
    setSearchQuery("");
    setPage(1);
  };

  // Apply filtering, searching, and sorting (client-side only if no server pagination)
  const processedData = useMemo(() => {
    if (serverPagination) {
      return data; // Data is already filtered/sorted by server
    }

    let result = [...data];

    // Apply search
    if (searchQuery && searchColumns) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        return searchColumns.some((columnKey) => {
          const column = columns.find((c) => c.key === columnKey);
          const value = column?.accessor
            ? column.accessor(item)
            : (item as Record<string, unknown>)[columnKey];
          return String(value ?? "")
            .toLowerCase()
            .includes(query);
        });
      });
    }

    // Apply filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== "all") {
        result = result.filter((item) => {
          const column = columns.find((c) => c.key === key);
          const itemValue = column?.accessor
            ? column.accessor(item)
            : (item as Record<string, unknown>)[key];
          return String(itemValue) === value;
        });
      }
    });

    // Apply sorting
    if (sortColumn) {
      const column = columns.find((c) => c.key === sortColumn);
      result.sort((a, b) => {
        const aValue = column?.accessor
          ? column.accessor(a)
          : (a as Record<string, unknown>)[sortColumn];
        const bValue = column?.accessor
          ? column.accessor(b)
          : (b as Record<string, unknown>)[sortColumn];

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        let comparison = 0;
        if (typeof aValue === "string" && typeof bValue === "string") {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          comparison = Number(aValue) - Number(bValue);
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, searchColumns, filterValues, sortColumn, sortDirection, columns, serverPagination]);

  // Pagination
  const totalItems = serverPagination ? serverPagination.total : processedData.length;
  const currentPage = serverPagination ? serverPagination.page : page;
  const currentPageSize = serverPagination ? serverPagination.pageSize : pageSize;
  const totalPages = Math.ceil(totalItems / currentPageSize);
  const startIndex = (currentPage - 1) * currentPageSize;
  const endIndex = Math.min(startIndex + currentPageSize, totalItems);

  const paginatedData = serverPagination
    ? processedData
    : processedData.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (serverPagination) {
      serverPagination.onPageChange(newPage);
    } else {
      setPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (serverPagination) {
      serverPagination.onPageSizeChange(newSize);
    } else {
      setPageSize(newSize);
      setPage(1);
    }
  };

  const handleSort = (columnKey: string) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const hasActiveFilters = Object.keys(filterValues).length > 0 || searchQuery;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(searchable || filters.length > 0) && (
        <div className="flex flex-wrap items-center gap-4">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          )}

          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filterValues[filter.key] || "all"}
              onValueChange={(value) => handleFilterChange(filter.key, value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.width}
                  onClick={() => handleSort(column.key)}
                  style={{ cursor: column.sortable ? "pointer" : "default" }}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={getRowKey(item)}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {endIndex} of {totalItems} results
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(currentPageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
