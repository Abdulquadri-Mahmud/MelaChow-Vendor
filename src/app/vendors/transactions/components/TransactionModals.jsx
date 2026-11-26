"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  Share2,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { initiateWithdrawal } from "@/app/lib/vendorApi";
import {
  calcPaystackFee,
  formatDateTime,
  formatNaira,
  getWithdrawalStatusMeta,
} from "../lib/transactionUtils";

const MAX_WITHDRAWAL_NAIRA = 1_000_000;

export function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  onDownloadReceipt,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!transaction) return null;

  const isCredit = transaction.type === "credit";
  const refId = String(transaction._id || transaction.id || "");

  const handleCopy = () => {
    if (!refId) return;
    navigator.clipboard.writeText(refId);
    setCopied(true);
    toast.success("Reference ID copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction receipt"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Header */}
            <div
              className={`relative px-6 py-6 text-white ${
                isCredit
                  ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                  : "bg-gradient-to-br from-orange-600 to-amber-700"
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close receipt"
                className="absolute right-4 top-4 rounded-lg bg-black/15 p-1.5 text-white transition hover:bg-black/25"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  {isCredit ? (
                    <ArrowUpRight size={22} />
                  ) : (
                    <ArrowDownLeft size={22} />
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold text-white/80">
                  {isCredit ? "Wallet Credit Receipt" : "Wallet Debit Receipt"}
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {isCredit ? "+" : "−"}
                  {formatNaira(transaction.amount)}
                </h2>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <Check size={12} />
                  Completed · {formatDateTime(transaction.date || transaction.createdAt)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 p-6">
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-zinc-50/80 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <FileText size={14} />
                    Description
                  </span>
                  <span className="text-right font-semibold text-zinc-900 dark:text-white">
                    {transaction.description || "Wallet Transaction"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Wallet size={14} />
                    Classification
                  </span>
                  <span className="font-semibold capitalize text-zinc-900 dark:text-white">
                    {isCredit ? "Credit (Inflow)" : "Debit (Outflow)"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Clock size={14} />
                    Recorded At
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {formatDateTime(transaction.date || transaction.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                    Reference ID
                  </span>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {refId || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 transition hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      title="Copy reference ID"
                    >
                      {copied ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied ? "Copied" : "Copy Ref"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadReceipt(transaction)}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  <Download size={15} />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function WithdrawModal({
  isOpen,
  onClose,
  availableBalance,
  pendingBalance = 0,
  payoutDetails,
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const guardRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setError("");
      setSuccess(false);
      guardRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isPending, onClose]);

  const safeBalance = Math.max(0, Number(availableBalance || 0));
  const parsedAmount = Number(amount.replace(/,/g, ""));
  const feeBreakdown = calcPaystackFee(parsedAmount);

  const exceedsBalance = parsedAmount > safeBalance;
  const exceedsMax = parsedAmount > MAX_WITHDRAWAL_NAIRA;
  const tooSmallAfterFee =
    parsedAmount > 0 && !exceedsBalance && !exceedsMax && feeBreakdown.netAmount <= 0;

  const isValid =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !exceedsBalance &&
    !exceedsMax &&
    feeBreakdown.netAmount > 0;

  const handleWithdraw = async () => {
    if (guardRef.current || !isValid) return;
    guardRef.current = true;
    setIsPending(true);
    setError("");
    try {
      await initiateWithdrawal(parsedAmount);
      setSuccess(true);
      toast.success("Withdrawal initiated successfully");
      setTimeout(() => onSuccess(), 1600);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Withdrawal failed. Please try again.";
      setError(msg);
      guardRef.current = false;
    } finally {
      setIsPending(false);
    }
  };

  if (!isOpen) return null;

  const maxAllowed = Math.min(safeBalance, MAX_WITHDRAWAL_NAIRA);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Withdraw funds"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isPending && onClose()}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Withdraw Funds
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  Available to withdraw:{" "}
                  <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatNaira(safeBalance)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                aria-label="Close withdrawal modal"
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {success ? (
                <div className="space-y-3 py-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckCircle2 size={30} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Withdrawal Initiated
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Estimated net payout of{" "}
                    <strong className="font-semibold text-zinc-900 dark:text-white tabular-nums">
                      {formatNaira(feeBreakdown.netAmount)}
                    </strong>{" "}
                    is being transferred to{" "}
                    <strong className="font-semibold text-zinc-900 dark:text-white">
                      {payoutDetails?.bankName || "your bank account"}
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <>
                  {/* Destination Bank Summary */}
                  {payoutDetails?.accountNumber && (
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          Destination Account
                        </p>
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {payoutDetails.bankName} · {payoutDetails.accountNumber}
                        </p>
                        {payoutDetails.accountName && (
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {payoutDetails.accountName}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label
                      htmlFor="withdraw-amount-input"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Withdrawal Amount (NGN)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-400">
                        ₦
                      </span>
                      <input
                        id="withdraw-amount-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setAmount(raw ? Number(raw).toLocaleString("en-NG") : "");
                          setError("");
                        }}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-9 pr-4 text-lg font-bold tabular-nums text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
                      />
                    </div>

                    {/* Quick fraction chips */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { frac: 0.25, label: "25%" },
                        { frac: 0.5, label: "50%" },
                        { frac: 0.75, label: "75%" },
                        { frac: 1, label: "Max" },
                      ].map((chip) => {
                        const val = Math.floor(maxAllowed * chip.frac);
                        return (
                          <button
                            key={chip.label}
                            type="button"
                            disabled={val <= 0}
                            onClick={() => {
                              setAmount(val.toLocaleString("en-NG"));
                              setError("");
                            }}
                            className="rounded-lg border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-600 transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-orange-500"
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    {exceedsBalance && (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Amount exceeds your available balance ({formatNaira(safeBalance)}).
                      </p>
                    )}
                    {!exceedsBalance && exceedsMax && (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Maximum single withdrawal is {formatNaira(MAX_WITHDRAWAL_NAIRA)}.
                      </p>
                    )}
                    {tooSmallAfterFee && (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Amount must be greater than the transfer fee ({formatNaira(feeBreakdown.totalFee)}).
                      </p>
                    )}
                  </div>

                  {/* Fee Breakdown */}
                  {isValid && (
                    <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                      <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                        <span>Requested Amount</span>
                        <span className="font-semibold tabular-nums">
                          {formatNaira(parsedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Estimated Transfer Fee</span>
                        <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          −{formatNaira(feeBreakdown.transferFee)}
                        </span>
                      </div>
                      {feeBreakdown.stampDuty > 0 && (
                        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                          <span>CBN Stamp Duty (≥ ₦10,000)</span>
                          <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                            −{formatNaira(feeBreakdown.stampDuty)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-amber-200 pt-2.5 text-sm font-bold text-zinc-900 dark:border-amber-500/30 dark:text-white">
                        <span>Estimated Net Payout</span>
                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatNaira(feeBreakdown.netAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {pendingBalance > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      <strong className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                        {formatNaira(pendingBalance)}
                      </strong>{" "}
                      is currently held in escrow for active orders and releases automatically upon delivery.
                    </p>
                  )}
                </>
              )}
            </div>

            {!success && (
              <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="min-h-[42px] flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={!isValid || isPending}
                  className="inline-flex min-h-[42px] flex-[2] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <ArrowDownToLine size={16} />
                      <span>Confirm Withdrawal</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function PayoutDetailsModal({ withdrawal, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!withdrawal) return null;

  const meta = getWithdrawalStatusMeta(withdrawal.status);
  const progressWidth = meta.isFailed
    ? "0%"
    : meta.step === 1
      ? "33%"
      : meta.step === 2
        ? "66%"
        : "100%";

  const handleCopyRef = () => {
    if (!withdrawal.paystackReference) return;
    navigator.clipboard.writeText(withdrawal.paystackReference);
    toast.success("Paystack reference copied");
  };

  const handleShare = () => {
    const summary = `MelaChow Payout · Ref: ${
      withdrawal.paystackReference || withdrawal._id
    } · Net: ${formatNaira(withdrawal.netAmount)} · Status: ${meta.label}`;
    navigator.clipboard.writeText(summary);
    toast.success("Payout summary copied");
  };

  const steps = [
    { num: 1, label: "Initiated" },
    { num: 2, label: "Processing" },
    { num: 3, label: "Settled" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payout details"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                Payout Receipt
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close payout details"
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Top Amount & Status */}
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Vendor Bank Transfer
                </span>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                  {formatNaira(withdrawal.netAmount, { decimals: true })}
                </p>
                <span
                  className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                  {meta.label}
                </span>
              </div>

              {/* 3-Step Settlement Stepper */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="relative flex items-start justify-between">
                  <div className="absolute left-[14%] right-[14%] top-3 h-0.5 bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        meta.isFailed ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{ width: progressWidth }}
                    />
                  </div>
                  {steps.map((s) => {
                    const reached = !meta.isFailed && meta.step >= s.num;
                    const failedFirst = meta.isFailed && s.num === 1;
                    return (
                      <div
                        key={s.num}
                        className="relative z-10 flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            failedFirst
                              ? "bg-rose-600 text-white"
                              : reached
                                ? "bg-emerald-500 text-white"
                                : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {failedFirst ? "!" : reached ? <Check size={12} /> : s.num}
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transfer Details */}
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-zinc-50/70 text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="px-4 py-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Recipient Bank Account
                  </p>
                  <p className="mt-0.5 font-semibold text-zinc-900 dark:text-white">
                    {withdrawal.bankName || "—"}
                    {withdrawal.accountName ? ` · ${withdrawal.accountName}` : ""}
                    {withdrawal.accountNumber
                      ? ` · ••••${String(withdrawal.accountNumber).slice(-4)}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Paystack Reference
                    </p>
                    <p className="mt-0.5 break-all font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                      {withdrawal.paystackReference || "Pending reference"}
                    </p>
                  </div>
                  {withdrawal.paystackReference && (
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="shrink-0 rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 transition hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      title="Copy reference"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>

                <div className="space-y-2 px-4 py-3 text-xs">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Requested Amount</span>
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                      {formatNaira(withdrawal.requestedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Transfer Fee</span>
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      −{formatNaira(withdrawal.transferFee ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-bold dark:border-zinc-800">
                    <span className="text-zinc-900 dark:text-white">Net Payout</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatNaira(withdrawal.netAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between px-4 py-3 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Initiated</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {formatDateTime(withdrawal.initiatedAt || withdrawal.createdAt)}
                  </span>
                </div>
              </div>

              {meta.isFailed && withdrawal.failureReason && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-bold">Failure Reason</p>
                    <p className="mt-0.5 leading-relaxed">{withdrawal.failureReason}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    toast(
                      "Contact support@melachow.com with your Paystack reference for payout help."
                    )
                  }
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Report Issue
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Share2 size={15} />
                  <span>Copy Summary</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
