"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  AlertCircle,
  BookOpen,
  Loader2,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { useVendorFoods } from "@/app/hooks/useVendorFoods";
import {
  archiveMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "@/app/lib/menuApi";
import FoodCard from "./components/FoodCard";
import FoodCardSkeleton from "./components/FoodCardSkeleton";
import FoodsFilterBar from "./components/FoodsFilterBar";
import EmptyFoods from "./components/EmptyFoods";

export default function MyFoodsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { vendorProfile } = useVendorProfile();
  const vendorId = vendorProfile?._id || vendorProfile?.id;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [activeSection, setActiveSection] = useState(null);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !isDeleting) setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget, isDeleting]);

  const filters = {
    status,
    section: activeSection || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: 50,
  };

  const { data, isLoading, isError, isFetching } = useVendorFoods(
    vendorId,
    filters
  );

  const items = data?.items || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || {};

  const sections = useMemo(() => {
    const seen = new Map();
    items.forEach((item) => {
      if (item.section && !seen.has(item.section._id)) {
        seen.set(item.section._id, item.section);
      }
    });
    return Array.from(seen.values());
  }, [items]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor-foods", vendorId] });
  };

  const handleToggleAvailability = async (itemId) => {
    try {
      await toggleMenuItemAvailability(vendorId, itemId);
      invalidate();
      toast.success("Availability updated");
    } catch {
      toast.error("Failed to update availability");
    }
  };

  const handleArchive = async (itemId) => {
    const item = items.find((i) => i._id === itemId);
    if (!item) return;
    try {
      await archiveMenuItem(vendorId, itemId, !item.is_archived);
      invalidate();
      toast.success(item.is_archived ? "Food restored" : "Food archived");
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      const blockedByCombos = err?.response?.data?.combos;
      toast.error(serverMsg || "Failed to update food", {
        duration: blockedByCombos?.length ? 6000 : 4000,
      });
    }
  };

  const handleEdit = (itemId) => {
    router.push(`/vendors/my-foods/${itemId}`);
  };

  const handleDelete = (itemId, itemName) => {
    setDeleteTarget({ id: itemId, name: itemName });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteMenuItem(vendorId, deleteTarget.id);
      invalidate();
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err?.response?.data?.message;
      const blocked = err?.response?.data?.combos;
      toast.error(msg || "Could not delete item", {
        duration: blocked ? 6000 : 4000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setActiveSection(null);
    setPage(1);
  };

  const isFiltered = Boolean(
    debouncedSearch || status !== "all" || activeSection
  );

  return (
    <div className="mx-auto max-w-[1440px] pb-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. HEADER CARD ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.16), transparent 68%)",
              }}
            />

            <div className="relative space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                My Menu
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage dishes, portion pricing, availability, and storefront
                organization.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-2.5">
              <Link
                href="/vendors/options-library"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <SlidersHorizontal size={15} />
                <span>Options Library</span>
              </Link>
              <Link
                href="/vendors/menu-guide"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <BookOpen size={15} />
                <span>Guide</span>
              </Link>
              <button
                type="button"
                onClick={invalidate}
                disabled={isFetching}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                title="Refresh menu"
              >
                <RefreshCw
                  size={15}
                  className={isFetching ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                href="/vendors/create-food"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              >
                <Plus size={16} />
                <span>Add Food</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. STATS & FILTER BAR ── */}
        <FoodsFilterBar
          search={search}
          onSearch={handleSearch}
          status={status}
          onStatus={(v) => {
            setStatus(v);
            setPage(1);
          }}
          sections={sections}
          activeSection={activeSection}
          onSection={(id) => {
            setActiveSection(id);
            setPage(1);
          }}
          stats={stats}
          resultCount={pagination.total ?? items.length}
          isFiltered={isFiltered}
          isFetching={isFetching && !isLoading}
          onClearFilters={handleClearFilters}
        />

        {/* ── 3. MENU GRID ── */}
        {isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={17} />
              Failed to load your menu items.
            </span>
            <button
              type="button"
              onClick={invalidate}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${
              isFetching && !isLoading
                ? "pointer-events-none opacity-65"
                : "opacity-100"
            }`}
          >
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <FoodCardSkeleton key={i} />
              ))
            ) : items.length === 0 ? (
              <EmptyFoods
                isFiltered={isFiltered}
                onClearFilters={handleClearFilters}
                onAddFood={() => router.push("/vendors/create-food")}
              />
            ) : (
              items.map((item) => (
                <FoodCard
                  key={item._id}
                  item={item}
                  onToggleAvailability={handleToggleAvailability}
                  onArchive={handleArchive}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}

        {/* ── 4. PAGINATION ── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex min-h-[42px] items-center rounded-xl border border-zinc-200 bg-white px-5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Previous
            </button>
            <span className="text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
              Page {page} of {pagination.pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore}
              className="inline-flex min-h-[42px] items-center rounded-xl border border-zinc-200 bg-white px-5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Delete menu item"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteTarget(null)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                  <Trash2 size={20} />
                </span>
                <button
                  type="button"
                  onClick={() => !isDeleting && setDeleteTarget(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
                Delete &ldquo;{deleteTarget.name}&rdquo;?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                This permanently removes the dish along with all of its portions
                and choice groups. This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="min-h-[42px] rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-55"
                >
                  {isDeleting && <Loader2 size={15} className="animate-spin" />}
                  <span>{isDeleting ? "Deleting..." : "Delete Forever"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
