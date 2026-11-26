"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Mail, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendorStorage } from "@/app/hooks/vendorStorage";

export default function PendingApproval() {
  const { vendorDetails, hasCheckedSession } = useVendorStorage();
  const router = useRouter();

  useEffect(() => {
    if (hasCheckedSession && vendorDetails?.vendor?.isApproved) {
      router.replace("/vendors/dashboard");
    }
  }, [hasCheckedSession, vendorDetails, router]);

  return (
    <div className="flex min-h-[85vh] w-full items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-zinc-200/90 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="relative mx-auto mb-6 h-24 w-24">
          <div className="flex h-full w-full items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400">
            <Store size={40} />
          </div>
          <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <Clock size={18} />
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <ShieldCheck size={14} />
          Application Under Review
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
          Your Store Is Pending Approval
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your vendor account is verified and currently being reviewed by our onboarding team. Once approved, you&apos;ll unlock full access to your store dashboard.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-xs dark:bg-zinc-900 dark:text-orange-400">
              <Clock size={18} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Review Timeline</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Reviews typically take 24–48 hours during business days.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-xs dark:bg-zinc-900 dark:text-orange-400">
              <Mail size={18} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Email Notification</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              We&apos;ll send an email to your registered address as soon as you&apos;re approved.
            </p>
          </div>
        </div>

        <div className="mt-7 flex justify-center">
          <Link
            href="/vendors/auth/login"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>

        <p className="mt-6 text-xs font-medium text-zinc-400 dark:text-zinc-500">
          MelaChow Partner Network
        </p>
      </motion.div>
    </div>
  );
}
