"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  PlusCircle,
  ClipboardList,
  Star,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TicketPercent,
  Bell,
  Bike,
  HelpCircle,
  BookOpen,
  SlidersHorizontal,
  Package,
  Store,
  X,
  Loader2
} from "lucide-react";
import { useApi } from "@/app/context/ApiContext";
import PermanentInstallButton from "@/app/components/PermanentInstallButton";
import { useVendorStorage } from "@/app/hooks/vendorStorage";
import { useSocket } from "@/app/context/SocketContext";
import { getVendorOrders } from "@/app/lib/vendorApi";

const navigation = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",     href: "/vendors/dashboard" },
      { icon: Wallet,          label: "Transactions",  href: "/vendors/transactions" },
      { icon: ClipboardList,   label: "Orders",        href: "/vendors/order" },
      { icon: Bell,            label: "Notifications", href: "/vendors/notifications" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { icon: UtensilsCrossed, label: "My Foods",    href: "/vendors/my-foods" },
      { icon: Package,         label: "My Combos",   href: "/vendors/my-combos" },
      { icon: PlusCircle,      label: "Create Food", href: "/vendors/create-food" },
      { icon: SlidersHorizontal, label: "Options Library", href: "/vendors/options-library" },
      { icon: BookOpen,        label: "Menu Guide",  href: "/vendors/menu-guide" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { icon: Star, label: "Reviews", href: "/vendors/reviews" },
    ],
  },
  {
    title: "Settings",
    items: [
      { icon: User,       label: "Profile",     href: "/vendors/profile" },
      { icon: HelpCircle, label: "Help & FAQs", href: "/vendors/faqs" },
    ],
  },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useVendorStorage();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { unreadCount } = useSocket();
  const [ordersCount, setOrdersCount] = useState(0);

  // Check active path
  const isSegmentActive = (href) => pathname === href || pathname?.startsWith(href + '/');

  const fetchOrdersCount = async () => {
    try {
      const res = await getVendorOrders();
      const raw = res?.vendorOrders || res?.orders || res?.data || (Array.isArray(res) ? res : []);
      const activeStatuses = ["pending", "accepted", "preparing", "ready", "ready_for_pickup"];
      const activeCount = raw.filter(o => {
        const st = (o.orderStatus || o.status || "").toLowerCase();
        return activeStatuses.includes(st);
      }).length;
      setOrdersCount(activeCount);
    } catch (err) {
      console.error("Sidebar fetchOrdersCount error:", err);
    }
  };

  useEffect(() => {
    fetchOrdersCount();

    const handleNewOrder = () => {
      setOrdersCount(prev => prev + 1);
      fetchOrdersCount();
    };

    const handleOrdersUpdated = () => {
      fetchOrdersCount();
    };

    window.addEventListener("vendor:new-order", handleNewOrder);
    window.addEventListener("notifications:updated", handleOrdersUpdated);
    window.addEventListener("vendor:orders-updated", handleOrdersUpdated);

    return () => {
      window.removeEventListener("vendor:new-order", handleNewOrder);
      window.removeEventListener("notifications:updated", handleOrdersUpdated);
      window.removeEventListener("vendor:orders-updated", handleOrdersUpdated);
    };
  }, []);

  // Handle Resize for Mobile Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      router.push("/vendors/auth/login");
      setShowLogoutModal(false);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const sidebarBg = { background: "linear-gradient(180deg, #1c0e05 0%, #101828 55%, #080f1a 100%)" };
  const sidebarWidth = 280;
  const collapsedWidth = 80;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={isMobile
          ? { x: mobileOpen ? 0 : "-100%", width: sidebarWidth }
          : { x: 0, width: open ? sidebarWidth : collapsedWidth }
        }
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed md:sticky top-0 left-0 h-screen flex flex-col z-[60] border-r border-white/[0.06] overflow-hidden"
        style={sidebarBg}
      >
        {/* Brand Edge Accent */}
        <div className="absolute inset-y-0 left-0 w-0.5 bg-orange-500/30 pointer-events-none" />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06] shrink-0 relative">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <Store size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence mode="wait">
            {(open || isMobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="font-bold text-white text-sm leading-tight tracking-tight whitespace-nowrap">MelaChow</span>
                <span className="text-[9px] font-black text-orange-500 tracking-widest uppercase">Vendor Command</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isMobile && (
            <button
              onClick={() => setOpen(!open)}
              className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={16} className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`} />
            </button>
          )}

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-6 scrollbar-hide custom-scrollbar">
          {navigation.map((section) => (
            <div key={section.title} className="space-y-1">
              <AnimatePresence mode="wait">
                {(open || isMobile) && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                  >
                    {section.title}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = isSegmentActive(item.href);
                  const Icon = item.icon;

                  let badgeCount = 0;
                  if (item.href === "/vendors/order") {
                    badgeCount = ordersCount;
                  } else if (item.href === "/vendors/notifications") {
                    badgeCount = unreadCount;
                  }

                  return (
                    <button
                      key={item.href}
                      onClick={() => { router.push(item.href); isMobile && setMobileOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold
                        transition-all duration-300 relative group overflow-hidden
                        ${isActive
                          ? "text-white shadow-[0_8px_20px_-6px_rgba(249,115,22,0.3)]"
                          : "text-slate-400 hover:text-slate-200"
                        }
                      `}
                      style={isActive ? {
                        background: "rgba(249, 115, 22, 0.1)",
                        border: "1px solid rgba(249, 115, 22, 0.2)",
                        backdropFilter: "blur(10px)"
                      } : {
                        border: "1px solid transparent"
                      }}
                    >
                      {/* Active background highlight */}
                      {isActive && (
                        <motion.div
                          layoutId="vendor-active-pill"
                          className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent pointer-events-none"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      {/* Active glow bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-gradient-to-b from-orange-400 to-amber-500 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.9)]" />
                      )}

                      <div className="relative shrink-0 z-10">
                        <Icon
                          size={open || isMobile ? 16 : 20}
                          strokeWidth={isActive ? 2.5 : 2}
                          className={`${isActive ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"} transition-colors`}
                        />
                        {!open && !isMobile && badgeCount > 0 && (
                          <span className={`absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[8px] font-black flex items-center justify-center text-white z-20 shadow-md ${
                            item.href === "/vendors/order" ? "bg-orange-500 animate-pulse" : "bg-rose-500"
                          }`}>
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                      </div>

                      <AnimatePresence>
                        {(open || isMobile) && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="relative z-10 uppercase tracking-wide text-[11px] whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {(open || isMobile) && badgeCount > 0 ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`ml-auto px-2 py-0.5 text-[10px] font-black rounded-full text-white shadow-md relative z-10 shrink-0 ${
                            item.href === "/vendors/order"
                              ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30 animate-pulse"
                              : "bg-rose-500 shadow-rose-500/30"
                          }`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </motion.span>
                      ) : (
                        isActive && (open || isMobile) && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] shrink-0 relative z-10"
                          />
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-white/[0.06] px-3 pt-2 pb-4 space-y-2 bg-black/20">
          {(open || isMobile) && <PermanentInstallButton />}

          <button
            onClick={() => setShowLogoutModal(true)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium
              transition-all border border-transparent
              ${open || isMobile
                ? "text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
                : "justify-center text-slate-500 hover:text-rose-500"
              }
            `}
          >
            <LogOut size={open || isMobile ? 15 : 20} className="shrink-0" />
            {(open || isMobile) && <span className="uppercase tracking-wide text-[11px] font-bold">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Logout Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
              <div className="p-6 text-center">
                <div className="w-11 h-11 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut size={18} className="text-red-500" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1 uppercase tracking-tight">Sign out?</h3>
                <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 max-w-[220px] mx-auto uppercase tracking-widest leading-relaxed">
                  You'll need to log back in to access the vendor portal.
                </p>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => !logoutLoading && setShowLogoutModal(false)}
                    disabled={logoutLoading}
                    className="flex-1 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="flex-1 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                  >
                    {logoutLoading ? <Loader2 size={14} className="animate-spin" /> : "Sign Out"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
