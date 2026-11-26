"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Lock,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { useVendorStorage } from "@/app/hooks/vendorStorage";
import {
  getVendorPayoutDetails,
  getVendorWallet,
  getWithdrawalHistory,
} from "@/app/lib/vendorApi";

import { PayoutScheduleInfo } from "./components/PayoutModals";
import {
  PayoutDetailsModal,
  TransactionDetailsModal,
  WithdrawModal,
} from "./components/TransactionModals";
import {
  exportLedgerCsv,
  exportPayoutsCsv,
  formatDateTime,
  formatMonthKey,
  formatMonthLabel,
  formatNaira,
  getWithdrawalStatusMeta,
  printTransactionReceipt,
} from "./lib/transactionUtils";

export default function TransactionsPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [payoutDetails, setPayoutDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [activeTab, setActiveTab] = useState("ledger"); // ledger | payouts
  const [typeFilter, setTypeFilter] = useState("all"); // all | credit | debit
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("all"); // all | completed | processing | failed
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const monthDropdownRef = useRef(null);
  const { vendorDetails } = useVendorStorage();
  const storeName =
    vendorDetails?.vendor?.name ||
    vendorDetails?.vendor?.storeName ||
    "MelaChow Vendor";

  // Close month dropdown on outside click
  useEffect(() => {
    if (!showMonthDropdown) return;
    const handleClickOutside = (e) => {
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(e.target)
      ) {
        setShowMonthDropdown(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setShowMonthDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [showMonthDropdown]);

  const fetchWallet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [walletRes, payoutRes, withdrawalRes] = await Promise.allSettled([
        getVendorWallet(),
        getVendorPayoutDetails(),
        getWithdrawalHistory(),
      ]);

      if (walletRes.status === "fulfilled" && walletRes.value?.success && walletRes.value?.data) {
        const data = walletRes.value.data;
        setWallet(data);
        const sortedTxns = [...(data.transactions || [])].sort(
          (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
        );
        setTransactions(sortedTxns);
      } else if (walletRes.status === "rejected" && walletRes.reason?.response?.status === 404) {
        setWallet({ balance: 0, pendingBalance: 0, totalEarned: 0, totalWithdrawn: 0, transactions: [] });
        setTransactions([]);
      }

      if (payoutRes.status === "fulfilled" && payoutRes.value?.success && payoutRes.value?.payoutDetails) {
        // Defensively strip recipientCode — must never reach client state
        const { recipientCode: _stripped, ...safePayoutDetails } =
          payoutRes.value.payoutDetails;
        setPayoutDetails(safePayoutDetails);
      }

      if (withdrawalRes.status === "fulfilled") {
        const list = withdrawalRes.value?.withdrawals || [];
        const sortedWithdrawals = [...list].sort(
          (a, b) =>
            new Date(b.initiatedAt || b.createdAt || 0) -
            new Date(a.initiatedAt || a.createdAt || 0)
        );
        setWithdrawals(sortedWithdrawals);
      } else {
        setWithdrawals([]);
      }

      setLastSyncedAt(new Date());
      if (isRefresh) toast.success("Financial ledger synced");
    } catch (err) {
      console.error("Transactions fetch error:", err);
      if (isRefresh) toast.error("Could not refresh ledger right now.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet(false);
  }, [fetchWallet]);

  // Combined available months from both ledger & withdrawals
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach((txn) => {
      const key = formatMonthKey(txn.date || txn.createdAt);
      if (key) months.add(key);
    });
    withdrawals.forEach((w) => {
      const key = formatMonthKey(w.initiatedAt || w.createdAt);
      if (key) months.add(key);
    });
    return Array.from(months).sort().reverse();
  }, [transactions, withdrawals]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      if (typeFilter !== "all" && txn.type !== typeFilter) return false;
      if (selectedMonth !== "all") {
        if (formatMonthKey(txn.date || txn.createdAt) !== selectedMonth) return false;
      }
      if (normalizedQuery) {
        const hay = `${txn.description || ""} ${txn._id || ""} ${txn.type || ""}`.toLowerCase();
        if (!hay.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, selectedMonth, normalizedQuery]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const meta = getWithdrawalStatusMeta(w.status);
      if (payoutStatusFilter !== "all") {
        if (payoutStatusFilter === "processing") {
          if (meta.key !== "processing" && meta.key !== "pending") return false;
        } else if (meta.key !== payoutStatusFilter) {
          return false;
        }
      }
      if (selectedMonth !== "all") {
        if (formatMonthKey(w.initiatedAt || w.createdAt) !== selectedMonth) return false;
      }
      if (normalizedQuery) {
        const hay = `${w.paystackReference || ""} ${w._id || ""} ${w.bankName || ""} ${w.accountNumber || ""} ${w.accountName || ""} ${meta.label}`.toLowerCase();
        if (!hay.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [withdrawals, payoutStatusFilter, selectedMonth, normalizedQuery]);

  // Live filtered summary stats
  const ledgerSummary = useMemo(() => {
    let totalCredits = 0;
    let totalDebits = 0;
    let creditCount = 0;
    let debitCount = 0;
    for (const txn of filteredTransactions) {
      const amt = Number(txn.amount || 0);
      if (txn.type === "credit") {
        totalCredits += amt;
        creditCount += 1;
      } else {
        totalDebits += amt;
        debitCount += 1;
      }
    }
    return {
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      creditCount,
      debitCount,
    };
  }, [filteredTransactions]);

  const payoutSummary = useMemo(() => {
    let settledTotal = 0;
    let totalFees = 0;
    let inProgressCount = 0;
    let settledCount = 0;
    for (const w of filteredWithdrawals) {
      const meta = getWithdrawalStatusMeta(w.status);
      if (meta.isCompleted) {
        settledTotal += Number(w.netAmount || 0);
        settledCount += 1;
      }
      if (meta.isPending || meta.key === "processing") {
        inProgressCount += 1;
      }
      totalFees += Number(w.transferFee || 0);
    }
    return { settledTotal, totalFees, inProgressCount, settledCount };
  }, [filteredWithdrawals]);

  const handleExportCsv = () => {
    if (activeTab === "ledger") {
      if (filteredTransactions.length === 0) {
        toast.error("No ledger entries to export");
        return;
      }
      exportLedgerCsv(filteredTransactions, selectedMonth);
      toast.success(`Exported ${filteredTransactions.length} ledger rows`);
    } else {
      if (filteredWithdrawals.length === 0) {
        toast.error("No payout records to export");
        return;
      }
      exportPayoutsCsv(filteredWithdrawals, selectedMonth);
      toast.success(`Exported ${filteredWithdrawals.length} payout records`);
    }
  };

  const handleDownloadReceipt = (txn) => {
    const ok = printTransactionReceipt(txn, storeName);
    if (!ok) {
      toast.error("Pop-up blocked — allow pop-ups to print or save receipt PDF.");
    }
  };

  const handleCopyAccount = () => {
    if (!payoutDetails?.accountNumber) return;
    navigator.clipboard.writeText(payoutDetails.accountNumber);
    setCopiedAccount(true);
    toast.success("Account number copied");
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const hasActiveFilters =
    selectedMonth !== "all" ||
    normalizedQuery.length > 0 ||
    (activeTab === "ledger" ? typeFilter !== "all" : payoutStatusFilter !== "all");

  const resetFilters = () => {
    setSelectedMonth("all");
    setSearchQuery("");
    setTypeFilter("all");
    setPayoutStatusFilter("all");
  };

  const availableBalance = Number(wallet?.balance || 0);
  const pendingBalance = Number(wallet?.pendingBalance || 0);
  const totalEarned = Number(wallet?.totalEarned || 0);
  const totalWithdrawn = Number(wallet?.totalWithdrawn || 0);
  const hasBankAccount = Boolean(payoutDetails?.accountNumber);
  const canWithdraw = hasBankAccount && availableBalance > 0;
  const completedPayoutsAll = withdrawals.filter(
    (w) => getWithdrawalStatusMeta(w.status).isCompleted
  ).length;

  const syncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1440px] pb-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. HEADER CARD ────────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.14), transparent 68%)",
              }}
            />

            <div className="relative space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                  <ShieldCheck size={13} />
                  Escrow Protected
                </span>
                {syncedLabel && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Synced at {syncedLabel}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Financial Ledger &amp; Payouts
              </h1>
              <p className="max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                Revenue is held safely in escrow while orders are active and
                credited automatically to your available balance upon delivery.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fetchWallet(true)}
                disabled={isRefreshing}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. 4-CARD FINANCIAL SUMMARY GRID ──────────────────────────────── */}
        <section
          aria-label="Wallet balances"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* Available Balance */}
          <div className="flex flex-col justify-between rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-600 to-amber-600 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Wallet size={16} />
                </span>
                <span>Available Balance</span>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                Settled
              </span>
            </div>

            <div className="mt-4">
              <p className="text-3xl font-bold tracking-tight tabular-nums">
                {formatNaira(availableBalance, { decimals: true })}
              </p>
              <div className="mt-3">
                {hasBankAccount ? (
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={!canWithdraw}
                    className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <ArrowDownToLine size={14} />
                    <span>
                      {canWithdraw ? "Withdraw Now" : "No Funds to Withdraw"}
                    </span>
                  </button>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85">
                    <Lock size={12} />
                    Payout bank not configured yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pending in Escrow */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                  <Clock size={16} />
                </span>
                <span>Pending in Escrow</span>
              </div>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                In Escrow
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                {formatNaira(pendingBalance, { decimals: true })}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Releases automatically when orders complete
              </p>
            </div>
          </div>

          {/* Lifetime Earned */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <TrendingUp size={16} />
                </span>
                <span>Total Earned</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Lifetime
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                {formatNaira(totalEarned, { decimals: true })}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Across{" "}
                <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {transactions.filter((t) => t.type === "credit").length}
                </strong>{" "}
                settled credit{transactions.filter((t) => t.type === "credit").length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                  <TrendingDown size={16} />
                </span>
                <span>Total Withdrawn</span>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Disbursed
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                {formatNaira(totalWithdrawn, { decimals: true })}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {completedPayoutsAll} completed bank transfer
                {completedPayoutsAll === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. PAYOUT SCHEDULE & BANK DESTINATION (2-COLUMN ROW) ──────────── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PayoutScheduleInfo
            balance={availableBalance}
            payoutDetails={payoutDetails}
          />

          {/* Settlement Bank Account Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                    <Building2 size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Settlement Bank Account
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Verified Paystack transfer destination
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <Lock size={11} />
                  Locked
                </span>
              </div>

              {hasBankAccount ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                      {payoutDetails.bankName || "Verified Bank"}
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {payoutDetails.accountNumber}
                    </p>
                    {payoutDetails.accountName && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {payoutDetails.accountName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {copiedAccount ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <p className="font-bold">No payout destination linked yet</p>
                  <p className="mt-1">
                    Your bank details are locked for self-service editing.
                    Contact MelaChow support to register or verify your payout
                    account.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              For account security, bank details are locked after onboarding.
              Contact{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                support@melachow.com
              </span>{" "}
              to request a verified change.
            </p>
          </div>
        </section>

        {/* ── 4. MAIN LEDGER & PAYOUTS TABLE CARD ───────────────────────────── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Top Tabs + Search & Filter Toolbar */}
          <div className="space-y-4 border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Primary Tab Switcher */}
              <div
                role="tablist"
                aria-label="Financial views"
                className="inline-flex w-fit rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "ledger"}
                  onClick={() => setActiveTab("ledger")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "ledger"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>Wallet Ledger</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {transactions.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "payouts"}
                  onClick={() => setActiveTab("payouts")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "payouts"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>Bank Payouts</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {withdrawals.length}
                  </span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "ledger"
                      ? "Search description or ref..."
                      : "Search Paystack ref or bank..."
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {activeTab === "ledger" ? (
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950">
                    {[
                      { id: "all", label: "All Entries" },
                      { id: "credit", label: "Credits" },
                      { id: "debit", label: "Debits" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTypeFilter(opt.id)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                          typeFilter === opt.id
                            ? "bg-orange-600 text-white shadow-sm"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="inline-flex flex-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950">
                    {[
                      { id: "all", label: "All Statuses" },
                      { id: "completed", label: "Settled" },
                      { id: "processing", label: "In Progress" },
                      { id: "failed", label: "Failed" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPayoutStatusFilter(opt.id)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                          payoutStatusFilter === opt.id
                            ? "bg-orange-600 text-white shadow-sm"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Month Dropdown */}
                <div className="relative" ref={monthDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowMonthDropdown((prev) => !prev)}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Calendar size={14} className="text-zinc-400" />
                    <span>{formatMonthLabel(selectedMonth)}</span>
                    <ChevronDown
                      size={14}
                      className={`text-zinc-400 transition-transform ${
                        showMonthDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {showMonthDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.14 }}
                        className="absolute left-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:left-auto sm:right-0"
                      >
                        <div className="max-h-64 overflow-y-auto p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth("all");
                              setShowMonthDropdown(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                              selectedMonth === "all"
                                ? "bg-orange-600 text-white"
                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                          >
                            All Time
                          </button>
                          {availableMonths.map((month) => (
                            <button
                              key={month}
                              type="button"
                              onClick={() => {
                                setSelectedMonth(month);
                                setShowMonthDropdown(false);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                                selectedMonth === month
                                  ? "bg-orange-600 text-white"
                                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {formatMonthLabel(month)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
                  >
                    <X size={14} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filtered Summary Bar */}
          {activeTab === "ledger" ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                Showing {filteredTransactions.length} entr
                {filteredTransactions.length === 1 ? "y" : "ies"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                Credits ({ledgerSummary.creditCount}):{" "}
                <strong className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatNaira(ledgerSummary.totalCredits)}
                </strong>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                Debits ({ledgerSummary.debitCount}):{" "}
                <strong className="font-bold text-rose-600 dark:text-rose-400">
                  −{formatNaira(ledgerSummary.totalDebits)}
                </strong>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                Net flow:{" "}
                <strong className="font-bold text-zinc-900 dark:text-white">
                  {ledgerSummary.netFlow >= 0 ? "+" : "−"}
                  {formatNaira(Math.abs(ledgerSummary.netFlow))}
                </strong>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                Showing {filteredWithdrawals.length} payout
                {filteredWithdrawals.length === 1 ? "" : "s"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                Total Settled ({payoutSummary.settledCount}):{" "}
                <strong className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNaira(payoutSummary.settledTotal)}
                </strong>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                In Progress:{" "}
                <strong className="font-bold text-sky-600 dark:text-sky-400">
                  {payoutSummary.inProgressCount}
                </strong>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                Total Fees:{" "}
                <strong className="font-bold text-zinc-800 dark:text-zinc-200">
                  {formatNaira(payoutSummary.totalFees)}
                </strong>
              </span>
            </div>
          )}

          {/* ── TABLE (DESKTOP) + CARDS (MOBILE) ────────────────────────────── */}
          {activeTab === "ledger" ? (
            filteredTransactions.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left">
                    <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
                      <tr>
                        <th className="px-5 py-3.5">Transaction</th>
                        <th className="px-5 py-3.5">Reference</th>
                        <th className="px-5 py-3.5">Date &amp; Time</th>
                        <th className="px-5 py-3.5 text-right">Amount</th>
                        <th className="px-5 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {filteredTransactions.map((txn) => {
                        const isCredit = txn.type === "credit";
                        const id = String(txn._id || txn.id || "");
                        return (
                          <tr
                            key={id}
                            onClick={() => {
                              setSelectedTransaction(txn);
                              setShowReceiptModal(true);
                            }}
                            className="group cursor-pointer transition hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    isCredit
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                      : "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                                  }`}
                                >
                                  {isCredit ? (
                                    <ArrowUpRight size={16} />
                                  ) : (
                                    <ArrowDownLeft size={16} />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-sm text-zinc-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                                    {txn.description || "Wallet Transaction"}
                                  </p>
                                  <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                                    {isCredit ? "Credit · Order / Settlement" : "Debit · Payout / Charge"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                #{id.slice(-8).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {formatDateTime(txn.date || txn.createdAt)}
                            </td>
                            <td
                              className={`px-5 py-3.5 text-right text-sm font-bold tabular-nums ${
                                isCredit
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-zinc-900 dark:text-white"
                              }`}
                            >
                              {isCredit ? "+" : "−"}
                              {formatNaira(txn.amount)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Completed
                                </span>
                                <ChevronRight
                                  size={15}
                                  className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="divide-y divide-zinc-100 md:hidden dark:divide-zinc-800">
                  {filteredTransactions.map((txn) => {
                    const isCredit = txn.type === "credit";
                    const id = String(txn._id || txn.id || "");
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedTransaction(txn);
                          setShowReceiptModal(true);
                        }}
                        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isCredit
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                              : "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight size={16} />
                          ) : (
                            <ArrowDownLeft size={16} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                              {txn.description || "Wallet Transaction"}
                            </p>
                            <span
                              className={`shrink-0 text-sm font-bold tabular-nums ${
                                isCredit
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-zinc-900 dark:text-white"
                              }`}
                            >
                              {isCredit ? "+" : "−"}
                              {formatNaira(txn.amount)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{formatDateTime(txn.date || txn.createdAt)}</span>
                            <span className="font-mono text-[11px]">
                              #{id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyLedgerState
                title={
                  hasActiveFilters
                    ? "No matching ledger entries"
                    : "No wallet transactions yet"
                }
                subtitle={
                  hasActiveFilters
                    ? "Try clearing your search or switching the month/type filter."
                    : "Completed orders and settled earnings will be recorded here automatically."
                }
                hasFilters={hasActiveFilters}
                onReset={resetFilters}
              />
            )
          ) : filteredWithdrawals.length > 0 ? (
            <>
              {/* Desktop Payouts Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
                    <tr>
                      <th className="px-5 py-3.5">Payout Reference</th>
                      <th className="px-5 py-3.5">Destination Bank</th>
                      <th className="px-5 py-3.5">Initiated</th>
                      <th className="px-5 py-3.5 text-right">Fee</th>
                      <th className="px-5 py-3.5 text-right">Net Payout</th>
                      <th className="px-5 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {filteredWithdrawals.map((w) => {
                      const meta = getWithdrawalStatusMeta(w.status);
                      const id = String(w._id || w.id || "");
                      return (
                        <tr
                          key={id}
                          onClick={() => {
                            setSelectedWithdrawal(w);
                            setShowPayoutModal(true);
                          }}
                          className="group cursor-pointer transition hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-mono text-xs font-bold text-zinc-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                              {w.paystackReference || "Pending reference"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              WD-{id.slice(-6).toUpperCase()}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                              {w.bankName || "Bank Transfer"}
                            </p>
                            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {w.accountNumber || "—"}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDateTime(w.initiatedAt || w.createdAt)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                            {formatNaira(w.transferFee ?? 0)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                            {formatNaira(w.netAmount)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex flex-col items-end">
                              <div className="inline-flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                                  {meta.label}
                                </span>
                                <ChevronRight
                                  size={15}
                                  className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600"
                                />
                              </div>
                              {meta.isFailed && w.failureReason && (
                                <p className="mt-1 max-w-[180px] truncate text-[11px] text-rose-600 dark:text-rose-400">
                                  {w.failureReason}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Payout Cards */}
              <div className="divide-y divide-zinc-100 md:hidden dark:divide-zinc-800">
                {filteredWithdrawals.map((w) => {
                  const meta = getWithdrawalStatusMeta(w.status);
                  const id = String(w._id || w.id || "");
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedWithdrawal(w);
                        setShowPayoutModal(true);
                      }}
                      className="flex w-full flex-col gap-2 p-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {w.bankName || "Bank Transfer"}
                          </p>
                          <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            {w.paystackReference || `WD-${id.slice(-6).toUpperCase()}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                          {formatNaira(w.netAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateTime(w.initiatedAt || w.createdAt)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyLedgerState
              title={
                hasActiveFilters
                  ? "No matching payouts found"
                  : "No bank payouts yet"
              }
              subtitle={
                hasActiveFilters
                  ? "Try clearing your search or status/month filter."
                  : "Automatic morning sweeps and manual withdrawals will appear here."
              }
              hasFilters={hasActiveFilters}
              onReset={resetFilters}
            />
          )}
        </section>
      </div>

      {/* Modals */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        availableBalance={availableBalance}
        pendingBalance={pendingBalance}
        payoutDetails={payoutDetails}
        onSuccess={() => {
          setShowWithdrawModal(false);
          fetchWallet(true);
        }}
      />

      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedTransaction(null);
        }}
        onDownloadReceipt={handleDownloadReceipt}
      />

      <PayoutDetailsModal
        withdrawal={selectedWithdrawal}
        isOpen={showPayoutModal}
        onClose={() => {
          setShowPayoutModal(false);
          setSelectedWithdrawal(null);
        }}
      />
    </div>
  );
}

function EmptyLedgerState({ title, subtitle, hasFilters, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
        <Receipt size={22} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
        {subtitle}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

function TransactionsSkeleton() {
  const pulse = "animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800";
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2.5">
          <div className={`h-5 w-32 rounded-full ${pulse}`} />
          <div className={`h-8 w-64 ${pulse}`} />
          <div className={`h-4 w-80 ${pulse}`} />
        </div>
        <div className="flex gap-3">
          <div className={`h-11 w-28 rounded-xl ${pulse}`} />
          <div className={`h-11 w-32 rounded-xl ${pulse}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`h-4 w-28 ${pulse}`} />
            <div className={`h-8 w-36 ${pulse}`} />
            <div className={`h-3.5 w-44 ${pulse}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-44 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`h-full w-full rounded-xl ${pulse}`} />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className={`h-10 w-64 rounded-xl ${pulse}`} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-14 w-full rounded-xl ${pulse}`} />
        ))}
      </div>
    </div>
  );
}
