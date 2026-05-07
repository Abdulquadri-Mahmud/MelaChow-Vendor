import { 
    Search as SearchIcon, 
    Bell, 
    Menu, 
    Sun, 
    Moon, 
    UtensilsCrossed,
    LayoutDashboard,
    Wallet,
    ClipboardList,
    Package,
    PlusCircle,
    Star,
    User,
    HelpCircle,
    X,
    ChevronRight,
    Clock,
    Power,
    Save,
    Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import NotificationBell from "@/app/components/NotificationBell";
import { useTheme } from "@/app/context/ThemeContext";
import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { updateVendorTodayHours } from "@/app/lib/vendorProfileApi";
import { useVendorStorage } from "@/app/hooks/vendorStorage";

const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard",     href: "/vendors/dashboard" },
    { icon: Wallet,          label: "Transactions",  href: "/vendors/transactions" },
    { icon: ClipboardList,   label: "Orders",        href: "/vendors/order" },
    { icon: Bell,            label: "Notifications", href: "/vendors/notifications" },
    { icon: UtensilsCrossed, label: "My Foods",    href: "/vendors/my-foods" },
    { icon: Package,         label: "My Combos",   href: "/vendors/my-combos" },
    { icon: PlusCircle,      label: "Create Food", href: "/vendors/create-food" },
    { icon: Star,            label: "Reviews",     href: "/vendors/reviews" },
    { icon: User,            label: "Profile",     href: "/vendors/profile" },
    { icon: HelpCircle,      label: "Help & FAQs", href: "/vendors/faqs" },
];

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getLagosNowParts() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date()).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return {
        day: String(parts.weekday || "").toLowerCase(),
        time: `${parts.hour || "00"}:${parts.minute || "00"}`,
    };
}

function formatTime(value) {
    if (!value) return "--:--";
    const [rawHour, rawMinute = "00"] = String(value).split(":");
    let hour = Number(rawHour);
    const minute = Number(rawMinute);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
    const suffix = hour >= 12 ? "PM" : "AM";
    hour %= 12;
    return `${hour || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function TodayHoursControl({ vendor }) {
    const { updateVendor: updateCachedVendor } = useVendorStorage();
    const [clock, setClock] = useState(getLagosNowParts());
    const today = dayKeys.includes(clock.day) ? clock.day : dayKeys[new Date().getDay()];
    const todayHours = vendor?.openingHours?.[today] || {};
    const [closeTime, setCloseTime] = useState(todayHours.close || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => setClock(getLagosNowParts()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        setCloseTime(todayHours.close || "");
    }, [todayHours.close, today]);

    const isClosedToday = !!todayHours.closed;
    const isReady = !!vendor?._id && !!today;

    const applyTodayHours = async (payload) => {
        if (!isReady) return;
        try {
            setIsSaving(true);
            const response = await updateVendorTodayHours(payload);
            const updatedVendor = response?.data;
            if (updatedVendor) {
                updateCachedVendor(updatedVendor);
            }
            toast.success(response?.message || "Today's hours updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || "Failed to update today's hours");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="hidden xl:flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 border-r border-zinc-200 pr-2 dark:border-zinc-800">
                <div className={`h-2.5 w-2.5 rounded-full ${isClosedToday ? "bg-red-500" : "bg-emerald-500"}`} />
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        {today.slice(0, 3)} {clock.time} WAT
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-tight text-zinc-700 dark:text-zinc-200">
                        {isClosedToday ? "Closed today" : `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`}
                    </p>
                </div>
            </div>

            <label className="flex items-center gap-1">
                <Clock size={13} className="text-orange-500" />
                <input
                    type="time"
                    value={closeTime}
                    disabled={isSaving || isClosedToday}
                    onChange={(event) => setCloseTime(event.target.value)}
                    className="w-[82px] rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-black text-zinc-800 outline-none focus:border-orange-500 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    title="Today's closing time"
                />
            </label>

            <button
                type="button"
                onClick={() => applyTodayHours({ closed: false, close: closeTime || todayHours.close, open: todayHours.open })}
                disabled={isSaving || !closeTime}
                className="rounded-md bg-orange-600 p-2 text-white transition hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                title="Update today's closing time"
            >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            </button>

            <button
                type="button"
                onClick={() => applyTodayHours({ closed: !isClosedToday, close: closeTime || todayHours.close, open: todayHours.open })}
                disabled={isSaving}
                className={`rounded-md p-2 transition active:scale-95 disabled:opacity-50 ${
                    isClosedToday
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"
                }`}
                title={isClosedToday ? "Reopen today" : "Close for today"}
            >
                <Power size={13} />
            </button>
        </div>
    );
}

// ── Global Page Search Component ──────────────────────────────────────────────
function GlobalSearch({ items, router }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const { theme } = useTheme();

    const filteredItems = useMemo(() => {
        if (!query.trim()) return [];
        return items.filter(item => 
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.href.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 6);
    }, [query, items]);

    // Keyboard shortcut (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="relative">
            {/* Search Trigger (Input lookalike) */}
            <div 
                onClick={() => setIsOpen(true)}
                className="hidden lg:flex items-center gap-3 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-800/50 rounded-md text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all cursor-pointer w-64 xl:w-80 ml-4 group"
            >
                <SearchIcon size={16} className="shrink-0 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                <span className="text-sm font-medium flex-1">Quick search...</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-sm opacity-60">⌘K</span>
            </div>

            {/* Mobile Search Icon (Standard mobile view) */}
            <button 
                onClick={() => setIsOpen(true)}
                className="lg:hidden p-2.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
                <SearchIcon size={18} />
            </button>

            {/* Search Overlay/Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                        >
                            <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                <SearchIcon size={20} className="text-orange-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search vendor modules..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-white text-sm font-bold placeholder:text-zinc-500"
                                />
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto p-2">
                                {query && filteredItems.length > 0 ? (
                                    <div className="space-y-1">
                                        <p className="px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Results</p>
                                        {filteredItems.map((item) => (
                                            <button
                                                key={item.href}
                                                onClick={() => {
                                                    router.push(item.href);
                                                    setIsOpen(false);
                                                    setQuery("");
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-orange-500/5 group transition-all text-left border border-transparent hover:border-orange-500/10"
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-all">
                                                    <item.icon size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight group-hover:text-orange-500">
                                                        {item.label}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-400 font-bold truncate tracking-widest uppercase opacity-60">
                                                        {item.href.split("/").pop().replace(/-/g, " ")}
                                                    </p>
                                                </div>
                                                <ChevronRight size={16} className="text-zinc-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </button>
                                        ))}
                                    </div>
                                ) : query ? (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <SearchIcon size={24} className="text-zinc-300" />
                                        </div>
                                        <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">No results found</p>
                                        <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">Try &quot;Orders&quot;, &quot;Menu&quot;, or &quot;Profile&quot;</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 p-2">
                                        <p className="px-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Popular Shortcuts</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {items.slice(0, 4).map((item) => (
                                                <button
                                                    key={item.href}
                                                    onClick={() => {
                                                        router.push(item.href);
                                                        setIsOpen(false);
                                                    }}
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all text-left group"
                                                >
                                                    <item.icon size={16} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[11px] font-black uppercase tracking-tight text-zinc-700 dark:text-zinc-300 group-hover:text-orange-500">{item.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">MelaChow <span className="text-orange-500">Navigator</span></p>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">ESC TO EXIT</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function VendorDashboardHeader({ vendor, onMenuClick }) {
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all">
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile Toggle (Visible on small screens) */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        >
          <Menu size={18} />
        </button>

        <div className="flex flex-col">
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-tight">
            {vendor?.storeName || "Vendor Dashboard"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Welcome back, {vendor?.name?.split(" ")[0] || "Partner"}
          </p>
        </div>

        <GlobalSearch items={navigationItems} router={router} />
      </div>

      <div className="flex items-center gap-2">
        <TodayHoursControl vendor={vendor} />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md hover:border-orange-500/30 hover:text-orange-500 transition-all font-bold"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1 hidden md:block"></div> */}

        {/* Notification Bell */}
        <NotificationBell
          restaurantId={vendor?._id}
          role="vendor"
          href="/vendors/notifications"
        />


        <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="relative">
            <div
              className={`size-10 rounded-full border-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-white'} shadow-sm bg-zinc-200 bg-cover bg-center`}
              style={{ backgroundImage: `url('${vendor?.logo || "/placeholder-logo.png"}')` }}
            />
            {/* Notification Subscription Badge (Matches User Flow) */}
            {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
              <motion.div
                className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm z-10"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                title="Enable notifications for order updates"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
