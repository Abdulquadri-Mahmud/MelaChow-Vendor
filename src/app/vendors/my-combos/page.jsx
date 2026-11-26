"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { useVendorCombos } from "@/app/hooks/useVendorCombos";
import { toggleComboAvailability, archiveComboItem } from "@/app/lib/menuApi";
import ComboCard from "./components/ComboCard";
import ComboCardSkeleton from "./components/ComboCardSkeleton";
import EmptyCombos from "./components/EmptyCombos";
import { AlertTriangle, Layers, Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import toast from "react-hot-toast";

export default function MyCombosPage() {
  const router = useRouter();
  const { vendorProfile, isLoading: isProfileLoading } = useVendorProfile();
  const vendorId = vendorProfile?._id || vendorProfile?.id;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const params = useMemo(
    () => ({
      ...(search && { search }),
      ...(status === "unavailable" && { is_available: false, is_archived: false }),
      ...(status === "available" && { is_available: true, is_archived: false }),
      ...(status === "archived" && { is_archived: true }),
      ...(status === "all" && { is_archived: false }),
    }),
    [search, status]
  );

  const { data, isLoading, isError, isFetching, refetch } = useVendorCombos(vendorId, params);

  if (!mounted || (isProfileLoading && !vendorId)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-sm font-medium">Loading combo bundles…</p>
        </div>
      </div>
    );
  }

  const combos = data?.combos || [];
  const pagination = data?.pagination || {};

  const handleRefresh = () => {
    refetch();
  };

  const handleToggleAvailability = async (comboId) => {
    try {
      const combo = combos.find((c) => c._id === comboId);
      if (!combo) return;

      await toggleComboAvailability(comboId, !combo.is_available);
      handleRefresh();
      toast.success("Availability updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update availability");
    }
  };

  const handleArchive = async (comboId) => {
    try {
      const combo = combos.find((c) => c._id === comboId);
      if (!combo) return;

      await archiveComboItem(comboId, !combo.is_archived);
      handleRefresh();
      toast.success(combo.is_archived ? "Combo restored" : "Combo archived");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update combo");
    }
  };

  const handleEdit = (comboId) => {
    router.push(`/vendors/my-combos/${comboId}/edit`);
  };

  const handleView = (comboId) => {
    router.push(`/vendors/my-combos/${comboId}`);
  };

  const isFiltered = status !== "all" || Boolean(search);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <Layers size={14} />
              Value Bundles
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
              Combo Bundles
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Create value meal bundles with fixed pricing and optional customer swaps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => router.push("/vendors/my-combos/create")}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
            >
              <Plus size={16} />
              Create Combo
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search combos by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:bg-zinc-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 sm:w-52 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">Active Combos</option>
            <option value="available">Available Only</option>
            <option value="unavailable">Hidden Only</option>
            <option value="archived">Archived Items</option>
          </select>
        </div>

        {!isLoading && combos.length > 0 && (
          <p className="mt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
            Showing {pagination.total || combos.length}{" "}
            {(pagination.total || combos.length) === 1 ? "combo" : "combos"}
            {isFiltered ? " matching filters" : ""}
            {isFetching ? " · Updating…" : ""}
          </p>
        )}
      </section>

      {/* Grid */}
      {isError ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900/40 dark:bg-zinc-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Unable to Load Combos
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            We encountered an issue while fetching your combo bundles. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-5 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ComboCardSkeleton key={i} />)
          ) : combos.length === 0 ? (
            <EmptyCombos
              isFiltered={isFiltered}
              onClearFilters={() => {
                setSearch("");
                setStatus("all");
                setPage(1);
              }}
              onCreate={() => router.push("/vendors/my-combos/create")}
            />
          ) : (
            combos.map((combo) => (
              <ComboCard
                key={combo._id}
                combo={combo}
                onToggleAvailability={handleToggleAvailability}
                onArchive={handleArchive}
                onEdit={handleEdit}
                onView={handleView}
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
            Page {page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasMore}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
