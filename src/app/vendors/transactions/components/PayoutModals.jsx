"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  User,
  Hash,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import {
  getBankList,
  resolveBankAccount,
  saveVendorBankAccount,
} from "../../../lib/vendorApi";
import { formatNaira, getNextSweepLabel } from "../lib/transactionUtils";

export function ConfigureBankModal({
  isOpen,
  onClose,
  onSaved,
  existingDetails,
}) {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(
    existingDetails?.bankCode || ""
  );
  const [accountNumber, setAccountNumber] = useState(
    existingDetails?.accountNumber || ""
  );
  const [accountName, setAccountName] = useState(
    existingDetails?.accountName || ""
  );
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
      setSelectedBank(existingDetails?.bankCode || "");
      setAccountNumber(existingDetails?.accountNumber || "");
      setAccountName(existingDetails?.accountName || "");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchBanks = async () => {
    setIsLoadingBanks(true);
    try {
      const res = await getBankList();
      if (res.banks) {
        const uniqueBanks = [];
        const seenCodes = new Set();
        for (const bank of res.banks) {
          if (!seenCodes.has(bank.code)) {
            seenCodes.add(bank.code);
            uniqueBanks.push(bank);
          }
        }
        setBanks(uniqueBanks);
      }
    } catch (err) {
      console.error("Failed to fetch banks:", err);
      setError("Could not load bank list. Please try again.");
    } finally {
      setIsLoadingBanks(false);
    }
  };

  useEffect(() => {
    if (
      accountNumber.length !== 10 ||
      !selectedBank ||
      accountName ||
      isResolving
    ) {
      return;
    }

    const resolve = async () => {
      setIsResolving(true);
      setError("");
      try {
        const res = await resolveBankAccount(accountNumber, selectedBank);
        if (res.account_name) {
          setAccountName(res.account_name);
        }
      } catch {
        setError("Could not verify account. Please check details.");
        setAccountName("");
      } finally {
        setIsResolving(false);
      }
    };

    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, selectedBank]);

  const handleSave = async () => {
    if (!selectedBank || !accountNumber || !accountName) {
      setError("Please fill all fields and verify the account.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const bankObj = banks.find((b) => b.code === selectedBank);
      await saveVendorBankAccount({
        bank_name: bankObj?.name || existingDetails?.bankName || "",
        bank_code: selectedBank,
        account_number: accountNumber,
        account_name: accountName,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save bank account.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                Register Bank Account
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                One-time setup · contact support to update later
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                For security, bank details are locked after registration.
                Contact MelaChow support for any future payout account changes.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle size={15} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Bank
                </label>
                <div className="relative">
                  <Building2
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value);
                      setAccountName("");
                    }}
                    disabled={isLoadingBanks}
                    className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="">Choose a bank...</option>
                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  {isLoadingBanks && (
                    <Loader2
                      size={15}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-orange-500"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Account Number (10 digits)
                </label>
                <div className="relative">
                  <Hash
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAccountNumber(val);
                      if (val.length !== 10) setAccountName("");
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 font-mono text-sm font-semibold tracking-wider text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                  {isResolving && (
                    <Loader2
                      size={15}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-orange-500"
                    />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {accountName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <User size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          Verified Account Name
                        </p>
                        <p className="truncate text-sm font-bold text-emerald-900 dark:text-emerald-100">
                          {accountName}
                        </p>
                      </div>
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!accountName || isSaving}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Save Bank Details"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function PayoutScheduleInfo({ balance = 0, payoutDetails }) {
  const scheduledTime = getNextSweepLabel();
  const hasBank = Boolean(
    payoutDetails?.payoutEnabled && payoutDetails?.accountNumber
  );

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
              <CalendarClock size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Automatic T+1 Payout Schedule
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Daily morning sweep after Paystack settlement
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              hasBank
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasBank ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {hasBank ? "Active" : "Awaiting Bank"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Next Scheduled Sweep
            </p>
            <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
              {scheduledTime}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Queued Balance
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatNaira(balance)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {hasBank
          ? "Earnings from delivered orders settle into your available balance and pay out automatically at 7:30 AM WAT for any balance above ₦0."
          : "Once your settlement bank account is verified and linked, available funds pay out automatically every morning at 7:30 AM WAT."}
      </p>
    </div>
  );
}
