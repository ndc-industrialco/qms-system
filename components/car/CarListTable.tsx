"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useUrlFilters } from "@/hooks/use-url-filters";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CarStatusBadge from "./CarStatusBadge";
import { CAR_SOURCE_LABELS, CAR_STATUS_LABELS, type CarListResponse, type CarSourceType, type CarStatus } from "@/types/car";

interface Props {
  initialData?: CarListResponse;
  isPrivileged?: boolean;
}

type CarListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  sourceType?: string;
};

const PAGE_SIZE = 20;
const STATUS_VALUES: CarStatus[] = ["DRAFT", "ISSUED", "RESPONDED", "VERIFY_1", "VERIFY_2", "CLOSED", "RE_CAR", "CANCELLED"];
const SOURCE_VALUES: CarSourceType[] = ["I", "C", "N", "O"];

async function fetchCars(query: CarListQuery): Promise<CarListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.sourceType) params.set("sourceType", query.sourceType);

  const res = await fetch(`/api/car?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch CARs");
  const json = await res.json();
  return {
    data: json.data ?? [],
    meta: json.meta ?? { page: query.page, limit: query.limit, total: 0 },
  };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card-premium p-4 space-y-3">
        <Skeleton className="h-8 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 animate-pulse flex gap-4 items-center">
              <Skeleton className="h-4 rounded w-24" />
              <Skeleton className="h-4 rounded w-24" />
              <Skeleton className="h-4 rounded w-24" />
              <Skeleton className="h-4 rounded flex-1" />
              <Skeleton className="h-5 rounded-full w-24" />
              <Skeleton className="h-4 rounded w-20" />
              <Skeleton className="h-4 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CarListTable({ initialData, isPrivileged = false }: Props) {
  const t = useT();
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "status", "sourceType", "page"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  const page = Math.max(1, Number(params.page || "1"));
  const query = {
    page,
    limit: PAGE_SIZE,
    search: params.search || undefined,
    status: params.status || undefined,
    sourceType: params.sourceType || undefined,
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cars", isPrivileged ? "privileged" : "department", query.search, query.status, query.sourceType, query.page, query.limit],
    queryFn: () => fetchCars(query),
    initialData,
  });

  const cars = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.total ? Math.ceil(data.meta.total / data.meta.limit) : 0;
  const basePath = isPrivileged ? "/qms/car" : "/car";

  if (isLoading && !initialData) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
        <p className="text-slate-800 font-semibold text-base mb-1">{t("common.error")}</p>
        <p className="text-slate-400 text-sm mb-4">{t("common.errorRetry")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={rawValues.search}
        onSearchChange={(value) => {
          setParam("search", value);
          setParam("page", "1");
        }}
        searchPlaceholder={`${t("common.search")} CAR`}
        filters={[
          {
            key: "status",
            label: t("car.list.colStatus"),
            allLabel: "All statuses",
            options: STATUS_VALUES.map((status) => ({
              value: status,
              label: CAR_STATUS_LABELS[status],
            })),
          },
          {
            key: "sourceType",
            label: t("car.list.colType"),
            allLabel: "All types",
            options: SOURCE_VALUES.map((sourceType) => ({
              value: sourceType,
              label: CAR_SOURCE_LABELS[sourceType],
            })),
          },
        ]}
        filterValues={{
          status: params.status || "",
          sourceType: params.sourceType || "",
        }}
        onFilterChange={(key, value) => {
          setParam(key, value);
          setParam("page", "1");
        }}
        hasActiveFilters={hasFilters}
        onClearAll={clearAll}
        clearLabel="Clear"
        resultCount={cars.length}
        totalCount={total}
        countLabel="CARs"
      />

      {cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">{t("common.noData")}</p>
          <p className="text-slate-400 text-sm">{t("car.list.empty")}</p>
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {cars.map((car) => {
              const isOverdue = !!car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED";
              return (
                <Link
                  key={car.id}
                  href={`${basePath}/${car.id}`}
                  className="block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-blue-600 truncate">{car.carNo}</p>
                      <p className="text-sm text-slate-700 mt-1">{CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}</p>
                    </div>
                    <CarStatusBadge status={car.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-3">{car.defectDetail}</p>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-500">
                      {t("car.list.colDept")}: <span className="text-slate-700">{car.targetDepartment.name}</span>
                    </p>
                    <p className="text-slate-500">
                      {t("car.detail.labelIssuer")}: <span className="text-slate-700">{car.issuer.name ?? "-"}</span>
                    </p>
                    <p className="text-slate-500">
                      {t("car.list.colIssuedAt")}: <span className="text-slate-700 font-mono">{formatDate(car.issuedAt)}</span>
                    </p>
                    <p className={`font-mono ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                      {t("car.list.colDueAt")}: <span>{formatDate(car.responseDueAt)}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("car.list.colCarNo")}</TableHead>
                    <TableHead>{t("car.list.colType")}</TableHead>
                    <TableHead>{t("car.list.colDept")}</TableHead>
                    <TableHead>{t("car.list.colDetail")}</TableHead>
                    <TableHead className="text-center">{t("car.list.colStatus")}</TableHead>
                    <TableHead className="text-center">{t("car.list.colIssuedAt")}</TableHead>
                    <TableHead className="text-center">{t("car.list.colDueAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cars.map((car) => {
                    const isOverdue = !!car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED";
                    return (
                      <TableRow key={car.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <Link href={`${basePath}/${car.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                            {car.carNo}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">
                          {CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}
                        </TableCell>
                        <TableCell className="text-slate-700">{car.targetDepartment.name}</TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">{car.defectDetail}</TableCell>
                        <TableCell className="text-center">
                          <CarStatusBadge status={car.status} />
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs text-center font-mono">
                          {formatDate(car.issuedAt)}
                        </TableCell>
                        <TableCell className={`text-xs text-center font-mono ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                          {formatDate(car.responseDueAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={Math.max(totalPages, 1)}
            total={total}
            countLabel="CARs"
            onPageChange={(nextPage) => setParam("page", String(nextPage))}
          />
        </>
      )}

      {isFetching && !isLoading ? (
        <p className="text-xs text-slate-400 text-right">{t("common.loading")}</p>
      ) : null}
    </div>
  );
}

