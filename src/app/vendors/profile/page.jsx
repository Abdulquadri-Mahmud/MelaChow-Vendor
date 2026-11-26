"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import VendorProfilePage from "@/app/components/vendors_component/profile/profile";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import VendorProfileSkeleton from "@/app/skeleton/VendorProfileSkeleton";

export default function ProfilePage() {
  const { vendorProfile: vendor, isLoading, error } = useVendorProfile();

  if (isLoading && !vendor) {
    return <VendorProfileSkeleton />;
  }

  if (error || !vendor) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="flex flex-col items-center rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-500/30 dark:bg-zinc-900">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <AlertCircle size={22} />
          </span>
          <h1 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
            Could not load store profile
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Your session may have expired. Please sign in again to continue.
          </p>
          <Link
            href="/vendors/auth/login"
            className="mt-5 inline-flex min-h-[42px] items-center rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return <VendorProfilePage vendor={vendor} />;
}
