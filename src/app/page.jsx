import { redirect } from "next/navigation";

export default function VendorRootPage() {
  redirect("/vendors/dashboard");
}
