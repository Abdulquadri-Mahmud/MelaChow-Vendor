"use client";

import VendorProfilePage from "@/app/components/vendors_component/profile/profile";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import VendorProfileSkeleton from "@/app/skeleton/VendorProfileSkeleton";

export default function ProfilePage() {
  const { vendorProfile: vendor, isLoading, error } = useVendorProfile();
  // 'vendors' variable holds the data from getVendors, which is now the single vendor profile

  // Loading state (only show skeleton if we have NO data yet)
  if (isLoading && !vendor) {
    return <VendorProfileSkeleton />;
  }

  // If error or no vendor, maybe redirect? Access control should be handled by middleware or api error
  if (error || !vendor) {
    // Optional: Redirect to login or show error
    // router.push("/vendors/auth/login");
    return <div>Error loading profile. Please log in again.</div>;
  }

  return (
    <div>
      <VendorProfilePage vendor={vendor} />
    </div>
  );
}
