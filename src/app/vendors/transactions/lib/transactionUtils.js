export function formatNaira(value, { decimals = false } = {}) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "₦0";
  const hasFraction = Math.abs(num % 1) > 0.001;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: decimals || hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDateTime(dateInput) {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMonthKey(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === "all") return "All Time";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

/**
 * Computes next T+1 vendor sweep label in Africa/Lagos (WAT, UTC+1).
 * Backend cron runs daily at 06:30 UTC = 7:30 AM WAT.
 */
export function getNextSweepLabel() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .reduce((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
    const minutesNow = Number(parts.hour || 0) * 60 + Number(parts.minute || 0);
    const sweepMinutes = 7 * 60 + 30;
    return minutesNow >= sweepMinutes
      ? "Tomorrow · 7:30 AM WAT"
      : "Today · 7:30 AM WAT";
  } catch {
    return "Daily · 7:30 AM WAT";
  }
}

/**
 * Paystack Nigeria bank transfer fee preview (matches backend defaults):
 * <= ₦5,000 -> ₦10 | <= ₦50,000 -> ₦25 | > ₦50,000 -> ₦50
 * CBN Electronic Money Transfer Levy (stamp duty): ₦50 on >= ₦10,000
 */
export function calcPaystackFee(amount) {
  const amt = Number(amount || 0);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { transferFee: 0, stampDuty: 0, totalFee: 0, netAmount: 0 };
  }
  const transferFee = amt <= 5000 ? 10 : amt <= 50000 ? 25 : 50;
  const stampDuty = amt >= 10000 ? 50 : 0;
  const totalFee = transferFee + stampDuty;
  const netAmount = Math.max(0, amt - totalFee);
  return { transferFee, stampDuty, totalFee, netAmount };
}

export function getWithdrawalStatusMeta(rawStatus) {
  const st = String(rawStatus || "pending").toLowerCase();
  if (st === "completed" || st === "successful" || st === "success") {
    return {
      key: "completed",
      label: "Settled",
      step: 3,
      isCompleted: true,
      isFailed: false,
      isPending: false,
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
      dotClass: "bg-emerald-500",
    };
  }
  if (st === "failed" || st === "reversed") {
    return {
      key: "failed",
      label: st === "reversed" ? "Reversed" : "Failed",
      step: 0,
      isCompleted: false,
      isFailed: true,
      isPending: false,
      badgeClass:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
      dotClass: "bg-rose-500",
    };
  }
  if (st === "processing" || st === "queued" || st === "otp") {
    return {
      key: "processing",
      label: "Processing",
      step: 2,
      isCompleted: false,
      isFailed: false,
      isPending: false,
      badgeClass:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
      dotClass: "bg-sky-500",
    };
  }
  return {
    key: "pending",
    label: "Pending",
    step: 1,
    isCompleted: false,
    isFailed: false,
    isPending: true,
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
    dotClass: "bg-amber-500",
  };
}

function csvCell(value) {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function triggerCsvDownload(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  const csv = "\uFEFF" + lines.join("\r\n"); // UTF-8 BOM so Excel displays ₦ cleanly
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportLedgerCsv(transactions, monthKey) {
  const headers = [
    "Reference ID",
    "Description",
    "Type",
    "Amount (NGN)",
    "Date & Time",
    "Status",
  ];
  const rows = transactions.map((txn) => [
    String(txn._id || txn.id || ""),
    txn.description || "Wallet transaction",
    txn.type === "credit" ? "Credit" : "Debit",
    txn.type === "credit" ? Number(txn.amount || 0) : -Number(txn.amount || 0),
    formatDateTime(txn.date || txn.createdAt),
    "Completed",
  ]);
  triggerCsvDownload(
    `melachow_ledger_${monthKey === "all" ? "all_time" : monthKey}.csv`,
    headers,
    rows
  );
}

export function exportPayoutsCsv(withdrawals, monthKey) {
  const headers = [
    "Paystack Reference",
    "Internal ID",
    "Bank",
    "Account Number",
    "Requested (NGN)",
    "Transfer Fee (NGN)",
    "Net Payout (NGN)",
    "Status",
    "Initiated At",
  ];
  const rows = withdrawals.map((w) => [
    w.paystackReference || "Pending",
    String(w._id || w.id || ""),
    w.bankName || "",
    w.accountNumber || "",
    Number(w.requestedAmount || 0),
    Number(w.transferFee || 0),
    Number(w.netAmount || 0),
    getWithdrawalStatusMeta(w.status).label,
    formatDateTime(w.initiatedAt || w.createdAt),
  ]);
  triggerCsvDownload(
    `melachow_payouts_${monthKey === "all" ? "all_time" : monthKey}.csv`,
    headers,
    rows
  );
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printTransactionReceipt(transaction, storeName = "MelaChow Vendor") {
  if (!transaction) return false;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const refId = String(transaction._id || transaction.id || "N/A");
  const isCredit = transaction.type === "credit";
  const sign = isCredit ? "+" : "−";
  const formattedAmt = formatNaira(transaction.amount);
  const accent = isCredit ? "#059669" : "#ea580c";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MelaChow Receipt - ${escapeHtml(refId.slice(-8).toUpperCase())}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 36px; margin: 0; color: #18181b; background: #fff; }
    .box { border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; }
    .top { text-align: center; border-bottom: 1px dashed #d4d4d8; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; }
    .amount { font-size: 40px; font-weight: 800; margin: 12px 0 8px; color: ${accent}; font-variant-numeric: tabular-nums; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
    .label { color: #71717a; font-weight: 500; }
    .val { font-weight: 600; text-align: right; word-break: break-word; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
    .foot { margin-top: 28px; text-align: center; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="box">
    <div class="top">
      <div class="brand">${escapeHtml(storeName)} · Ledger Receipt</div>
      <div class="amount">${sign}${escapeHtml(formattedAmt)}</div>
      <span class="badge">Completed</span>
    </div>
    <div class="row"><span class="label">Description</span><span class="val">${escapeHtml(transaction.description || "Wallet Transaction")}</span></div>
    <div class="row"><span class="label">Classification</span><span class="val">${isCredit ? "Credit (Inflow)" : "Debit (Outflow)"}</span></div>
    <div class="row"><span class="label">Date &amp; Time</span><span class="val">${escapeHtml(formatDateTime(transaction.date || transaction.createdAt))}</span></div>
    <div class="row"><span class="label">Reference ID</span><span class="val mono">${escapeHtml(refId)}</span></div>
    <div class="foot">MelaChow Vendor Financial Ledger · Support Ref: #${escapeHtml(refId.slice(-8).toUpperCase())}</div>
  </div>
  <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 400); };</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
