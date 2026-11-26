"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Camera,
  ChevronDown,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Star,
  Store,
  Utensils,
  Vibrate,
  Volume2,
  X,
} from "lucide-react";

import { updateVendor } from "@/app/lib/vendorProfileApi";
import PermanentInstallButton from "@/app/components/PermanentInstallButton";
import { useApi } from "@/app/context/ApiContext";
import {
  getVendorAlertSettings,
  playVendorAlertPreview,
  saveVendorAlertSettings,
} from "@/app/lib/vendorAlertSettings";
import VendorLocationNotice from "@/app/components/vendors_component/location/VendorLocationNotice";

const CLOUDINARY_PRESET = "GrubDash";
const CLOUDINARY_HOST =
  "https://api.cloudinary.com/v1_1/dypn7gna0/image/upload";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  try {
    const res = await fetch(CLOUDINARY_HOST, { method: "POST", body: formData });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        `Cloudinary upload failed: ${res.status} ${errorData.error?.message || ""}`
      );
    }
    const data = await res.json();
    return data.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    toast.error(`Image upload failed: ${err.message}`);
    return null;
  }
};

function ProfileSection({ title, subtitle, icon: Icon, isOpen, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={Boolean(isOpen)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 transition-transform dark:bg-zinc-800 dark:text-zinc-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={17} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-zinc-100 p-5 dark:border-zinc-800">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function InputField({ label, icon: Icon, ...props }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {Icon && <Icon size={13} className="text-zinc-400" />}
        {label}
      </span>
      <input
        className={`w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm font-medium text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 ${
          props.disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
        {...props}
      />
    </label>
  );
}

export default function VendorProfilePage({ vendor }) {
  const [basicInfo, setBasicInfo] = useState({
    storeName: "",
    phone: "",
    email: "",
    storeDescription: "",
    password: "",
  });
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [cuisineTypes, setCuisineTypes] = useState([]);
  const [openingHours, setOpeningHours] = useState({});
  const [logo, setLogo] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [platformCategories, setPlatformCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [openSections, setOpenSections] = useState({ basicInfo: true });
  const [alertSettings, setAlertSettings] = useState(() =>
    getVendorAlertSettings()
  );
  const [loadingSection, setLoadingSection] = useState("");

  const { baseUrl } = useApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!vendor) return;
    setBasicInfo({
      storeName: vendor.storeName || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      storeDescription: vendor.storeDescription || "",
      password: "",
    });
    setAddress({
      street: vendor.address?.street || "",
      city: vendor.address?.city || "",
      state: vendor.address?.state || "",
      postalCode: vendor.address?.postalCode || "",
    });
    setSelectedStateId(vendor.stateId?._id || vendor.stateId || "");
    setSelectedCityId(vendor.cityId?._id || vendor.cityId || "");
    setCuisineTypes(vendor.cuisineTypes || []);
    setOpeningHours(vendor.openingHours || {});
    setLogo(vendor.logo || "");
    setCoverImage(vendor.coverImage || "");
  }, [vendor]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const res = await axios.get(`${baseUrl}/categories/platform-categories`);
        if (res.data?.success) setPlatformCategories(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch platform categories:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [baseUrl]);

  const updateAlertSettings = (changes) => {
    const next = saveVendorAlertSettings({ ...alertSettings, ...changes });
    setAlertSettings(next);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateSection = async (section, data) => {
    setLoadingSection(section);
    try {
      let payload = {};
      if (section === "basicInfo") {
        payload = {
          storeName: data.storeName,
          phone: data.phone,
          email: data.email,
          storeDescription: data.storeDescription,
        };
        if (data.password) payload.password = data.password;
      } else if (section === "address") {
        payload = {
          address: { ...data },
          stateId: selectedStateId,
          cityId: selectedCityId,
        };
      } else if (section === "cuisineTypes") {
        payload = { cuisineTypes: data };
      } else if (section === "openingHours") {
        payload = { openingHours: data };
      } else if (section === "logo") {
        payload = { logo: data };
      } else if (section === "coverImage") {
        payload = { coverImage: data };
      }

      const response = await updateVendor({ id: vendor._id, data: payload });
      const updatedVendor = response?.data || response?.vendor || response || {};
      const nextVendor = { ...vendor, ...payload, ...updatedVendor };

      queryClient.setQueryData(["vendors"], (old) => ({
        ...(old || vendor || {}),
        ...payload,
        ...updatedVendor,
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "melachow_vendor_cache",
          JSON.stringify(nextVendor)
        );
      }

      toast.success(
        `${section.replace(/([A-Z])/g, " $1").trim()} updated successfully`
      );
    } catch (err) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Failed to update ${section}`;
      toast.error(errorMessage);
    } finally {
      setLoadingSection("");
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Uploading logo...");
    const url = await uploadToCloudinary(file);
    if (url) {
      setLogo(url);
      await updateSection("logo", url);
      toast.success("Logo updated", { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Uploading cover image...");
    const url = await uploadToCloudinary(file);
    if (url) {
      setCoverImage(url);
      await updateSection("coverImage", url);
      toast.success("Cover image updated", { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  };

  const toggleCuisine = (value) => {
    setCuisineTypes((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleOpeningHoursChange = (day, key, value) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] || {}), [key]: value },
    }));
  };

  if (!vendor) return null;

  const successfulStatuses = new Set(["completed", "delivered"]);
  const vendorOrders = Array.isArray(vendor.vendorOrders)
    ? vendor.vendorOrders
    : null;
  const totalSales = vendorOrders
    ? vendorOrders
        .filter((order) =>
          successfulStatuses.has(String(order.orderStatus || "").toLowerCase())
        )
        .reduce((total, order) => {
          const amt = Number(order.vendorTotal || 0);
          return total + (order.moneyUnit === "kobo" ? amt / 100 : amt);
        }, 0)
    : Number(vendor.totalSales || 0) / (vendor.moneyUnit === "kobo" ? 100 : 1);

  const formattedTotalSales = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(totalSales);

  const ratingValue = Number(vendor.rating ?? vendor.ratings ?? 0);

  return (
    <div className="mx-auto max-w-[1200px] pb-12 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. STORE PROFILE HERO ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative h-36 w-full overflow-hidden bg-zinc-900 sm:h-44">
            <img
              src={coverImage || logo || "/placeholder.jpg"}
              alt="Store cover"
              className="h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <label className="absolute bottom-3.5 right-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-black/45 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/65">
              <Camera size={14} />
              <span>Update Cover</span>
              <input
                type="file"
                className="hidden"
                onChange={handleCoverChange}
                accept="image/*"
              />
            </label>
          </div>

          <div className="relative px-5 pb-6 sm:px-6">
            <div className="-mt-11 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative shrink-0">
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-zinc-100 shadow-md dark:border-zinc-900 dark:bg-zinc-800">
                    <img
                      src={logo || "/placeholder.jpg"}
                      alt="Store logo"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <label
                    title="Change store logo"
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md transition hover:bg-orange-600"
                  >
                    <Camera size={14} />
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleLogoChange}
                      accept="image/*"
                    />
                  </label>
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                      {basicInfo.storeName || "My Store"}
                    </h1>
                    {vendor.verified && (
                      <BadgeCheck size={18} className="shrink-0 text-orange-500" />
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <MapPin size={13} className="text-orange-500" />
                    <span>
                      {[address.city, address.state].filter(Boolean).join(", ") ||
                        "Location not set"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    vendor.isLive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      vendor.isLive ? "bg-emerald-500" : "bg-zinc-400"
                    }`}
                  />
                  {vendor.isLive ? "Store Live" : "Store Paused"}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    vendor.isActive
                      ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                  }`}
                >
                  {vendor.isActive ? "Account Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Total Sales
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formattedTotalSales}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Store Rating
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                  <span>{ratingValue > 0 ? ratingValue.toFixed(1) : "New"}</span>
                  <Star
                    size={15}
                    className="text-amber-500"
                    fill="currentColor"
                  />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Partner Since
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                  {vendor.createdAt
                    ? new Date(vendor.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. GENERAL INFORMATION ── */}
        <ProfileSection
          title="General Information"
          subtitle="Store name, contact phone, bio, and password"
          icon={Store}
          isOpen={openSections.basicInfo}
          onToggle={() => toggleSection("basicInfo")}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Store Name"
              name="storeName"
              icon={Store}
              value={basicInfo.storeName}
              onChange={(e) =>
                setBasicInfo({ ...basicInfo, storeName: e.target.value })
              }
            />
            <InputField
              label="Phone Number"
              name="phone"
              icon={Phone}
              value={basicInfo.phone}
              onChange={(e) =>
                setBasicInfo({ ...basicInfo, phone: e.target.value })
              }
            />
            <InputField
              label="Email Address"
              icon={Mail}
              value={basicInfo.email}
              disabled
            />
            <InputField
              label="New Password (Optional)"
              type="password"
              icon={Lock}
              placeholder="Leave blank to keep current password"
              value={basicInfo.password}
              onChange={(e) =>
                setBasicInfo({ ...basicInfo, password: e.target.value })
              }
            />
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <FileText size={13} className="text-zinc-400" />
                Store Description
              </label>
              <textarea
                rows={3}
                value={basicInfo.storeDescription}
                onChange={(e) =>
                  setBasicInfo({
                    ...basicInfo,
                    storeDescription: e.target.value,
                  })
                }
                placeholder="Tell customers about your specialty dishes..."
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => updateSection("basicInfo", basicInfo)}
              disabled={loadingSection === "basicInfo"}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-55"
            >
              {loadingSection === "basicInfo" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>
                {loadingSection === "basicInfo" ? "Saving..." : "Save Changes"}
              </span>
            </button>
          </div>
        </ProfileSection>

        {/* ── 3. LOCATION & GPS ── */}
        <ProfileSection
          title="Location & GPS Pickup Pin"
          subtitle="Accurate GPS ensures correct distance delivery fees"
          icon={MapPin}
          isOpen={openSections.address}
          onToggle={() => toggleSection("address")}
        >
          <VendorLocationNotice
            vendor={{ ...vendor, address }}
            profile
            always
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["vendors"] })}
          />
        </ProfileSection>

        {/* ── 4. CUISINES & TAGS ── */}
        <ProfileSection
          title="Cuisines & Categories"
          subtitle={`${cuisineTypes.length} selected`}
          icon={Utensils}
          isOpen={openSections.cuisineTypes}
          onToggle={() => toggleSection("cuisineTypes")}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {cuisineTypes.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No cuisine categories selected yet.
                </p>
              ) : (
                cuisineTypes.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {cuisine}
                    <button
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      aria-label={`Remove ${cuisine}`}
                      className="rounded-full p-0.5 hover:bg-white/20"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {isLoadingCategories ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
                <Loader2 size={18} className="animate-spin text-orange-500" />
                <span>Loading categories...</span>
              </div>
            ) : (
              <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {platformCategories.map((group) => {
                  const isSelected = cuisineTypes.includes(group.name);
                  return (
                    <button
                      key={group._id}
                      type="button"
                      onClick={() => toggleCuisine(group.name)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                        isSelected
                          ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                          : "border-zinc-200 bg-zinc-50/70 text-zinc-700 hover:border-orange-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                      } ${!group.isActive ? "opacity-50 grayscale" : ""}`}
                    >
                      {group.image && (
                        <img
                          alt={group.name}
                          src={group.image}
                          className="h-11 w-11 rounded-full bg-white object-contain p-1"
                        />
                      )}
                      <span className="text-xs font-bold">{group.name}</span>
                      {group.description && (
                        <p
                          className={`line-clamp-2 text-[11px] ${
                            isSelected
                              ? "text-orange-100"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {group.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => updateSection("cuisineTypes", cuisineTypes)}
                disabled={loadingSection === "cuisineTypes"}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-55"
              >
                {loadingSection === "cuisineTypes" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>
                  {loadingSection === "cuisineTypes"
                    ? "Saving..."
                    : "Update Cuisines"}
                </span>
              </button>
            </div>
          </div>
        </ProfileSection>

        {/* ── 5. OPERATING HOURS ── */}
        <ProfileSection
          title="Operating Hours"
          subtitle="Weekly open and close schedule (Africa/Lagos WAT)"
          icon={Clock}
          isOpen={openSections.openingHours}
          onToggle={() => toggleSection("openingHours")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DAYS.map((day) => {
              const closed = Boolean(openingHours[day]?.closed);
              return (
                <div
                  key={day}
                  className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold capitalize text-zinc-900 dark:text-white">
                      {day}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={closed}
                        onChange={(e) =>
                          handleOpeningHoursChange(
                            day,
                            "closed",
                            e.target.checked
                          )
                        }
                        className="accent-orange-600"
                      />
                      <span>Closed</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      Open
                      <input
                        type="time"
                        disabled={closed}
                        value={openingHours[day]?.open || ""}
                        onChange={(e) =>
                          handleOpeningHoursChange(day, "open", e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-orange-500 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      Close
                      <input
                        type="time"
                        disabled={closed}
                        value={openingHours[day]?.close || ""}
                        onChange={(e) =>
                          handleOpeningHoursChange(day, "close", e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-orange-500 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => updateSection("openingHours", openingHours)}
              disabled={loadingSection === "openingHours"}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-55"
            >
              {loadingSection === "openingHours" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>
                {loadingSection === "openingHours"
                  ? "Saving..."
                  : "Update Hours"}
              </span>
            </button>
          </div>
        </ProfileSection>

        {/* ── 6. INCOMING ORDER ALERTS ── */}
        <ProfileSection
          title="Incoming Order Alerts"
          subtitle="Configure kitchen alarm sound & vibration on this device"
          icon={Bell}
          isOpen={openSections.alerts}
          onToggle={() => toggleSection("alerts")}
        >
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Choose how this device alerts you when a new order arrives.
            </p>

            <button
              type="button"
              onClick={() =>
                updateAlertSettings({ alarmEnabled: !alertSettings.alarmEnabled })
              }
              className="flex w-full items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-left dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <Volume2 size={18} className="shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Loud order alarm
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Repeats until pending orders are accepted.
                </p>
              </div>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  alertSettings.alarmEnabled
                    ? "bg-orange-600"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    alertSettings.alarmEnabled ? "left-6" : "left-1"
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateAlertSettings({
                  vibrationEnabled: !alertSettings.vibrationEnabled,
                })
              }
              className="flex w-full items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-left dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <Vibrate size={18} className="shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Device vibration
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Vibrates phones &amp; tablets that support haptic alerts.
                </p>
              </div>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  alertSettings.vibrationEnabled
                    ? "bg-orange-600"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    alertSettings.vibrationEnabled ? "left-6" : "left-1"
                  }`}
                />
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Repeat interval
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Frequency while incoming orders wait.
                  </p>
                </div>
              </div>
              <select
                value={alertSettings.intervalSeconds}
                onChange={(e) =>
                  updateAlertSettings({
                    intervalSeconds: Number(e.target.value),
                  })
                }
                className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              >
                <option value={6}>Every 6 sec</option>
                <option value={10}>Every 10 sec</option>
                <option value={15}>Every 15 sec</option>
              </select>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  playVendorAlertPreview({
                    vibrationEnabled: alertSettings.vibrationEnabled,
                  });
                  toast.success("Alarm test played");
                }}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                <Volume2 size={15} />
                <span>Test Alarm</span>
              </button>
            </div>
          </div>
        </ProfileSection>

        {/* ── 7. FINANCE & PAYOUT ACCOUNT ── */}
        <ProfileSection
          title="Settlement & Payout Account"
          subtitle="Paystack-verified bank details & T+1 schedule"
          icon={CreditCard}
          isOpen={openSections.payoutDetails}
          onToggle={() => toggleSection("payoutDetails")}
        >
          <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/40 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Managed via Paystack Verification
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <Lock size={10} /> Locked
                </span>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Payout bank accounts are locked after onboarding for your
                protection. Contact support@melachow.com to request a change, or
                view your ledger and T+1 payout history anytime.
              </p>
            </div>
            <Link
              href="/vendors/transactions"
              className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <span>Open Transactions</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </ProfileSection>

        {/* PWA Install */}
        <div className="pt-2">
          <PermanentInstallButton />
        </div>
      </div>
    </div>
  );
}
