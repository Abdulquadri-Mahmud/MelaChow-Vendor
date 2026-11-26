"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, TicketPercent } from "lucide-react";

export default function VendorCouponsPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center py-6">
      <div className="w-full rounded-2xl border border-zinc-200/90 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
          <TicketPercent size={26} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <ShieldCheck size={14} />
          Platform-managed promotions
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Coupons Are Admin Managed
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Coupon creation, updates, activation, and usage limits are managed centrally by the MelaChow team so promotions stay fair and consistent across the marketplace.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/vendors/dashboard"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
