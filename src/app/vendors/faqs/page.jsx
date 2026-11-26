"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import ChatWidget from "@/components/vendor/Support/ChatWidget";

const FAQ_DATA = [
  {
    category: "account",
    question: "How do I get my vendor account approved?",
    answer:
      "After verifying your email and setting your password, your account enters Pending Approval while our team reviews your store details, location, and menu readiness. Approval typically takes less than 24 hours, and you'll be notified by email once your store is active.",
  },
  {
    category: "account",
    question: "How do I update my payout bank account?",
    answer:
      "For security, payout bank accounts are locked after initial Paystack verification and cannot be overwritten directly from the dashboard. Contact support@melachow.com with your store name and verified account details to request a secure update.",
  },
  {
    category: "finance",
    question: "How do Escrow payments and T+1 automatic payouts work?",
    answer:
      "When a customer pays for an order, funds are safely held in Escrow until delivery is confirmed. Once delivered, your food revenue moves into your Available Balance.\n\nEvery morning at 7:30 AM WAT (T+1, after Paystack overnight settlement), any available balance above ₦0 is swept automatically to your verified bank account. You can also request a manual withdrawal anytime from the Transactions page.",
  },
  {
    category: "finance",
    question: "When is my money released from Escrow?",
    answer:
      "The moment the assigned rider marks an order as Delivered, your vendor earnings are released from Escrow directly into your Available Balance.",
  },
  {
    category: "finance",
    question: "What happens if an order is cancelled?",
    answer:
      "If an order is cancelled before delivery, the escrowed amount is refunded directly to the customer. Because those funds were still in escrow, your settled wallet balance is never hit with surprise clawbacks.",
  },
  {
    category: "orders",
    question: "How do I know when a new order arrives?",
    answer:
      "Keep your Vendor Portal open and enable notifications. Incoming orders trigger real-time WebSocket updates, optional audio/vibration alerts (configurable in Profile → Incoming Order Alerts), and jump straight to the Incoming queue on your Order Desk.",
  },
  {
    category: "orders",
    question: "Why can't I mark an order as Delivered myself?",
    answer:
      "Platform deliveries are handled by centralized logistics riders. Once you pack the order and mark it Ready for Pickup, share your Rider Pickup Code upon handoff — the rider then updates Out for Delivery and Delivered.",
  },
  {
    category: "orders",
    question: "What does each order status mean?",
    answer:
      "• Incoming (Pending): Customer paid and the order is awaiting your acceptance (accept within 5 minutes).\n• Accepted: You confirmed the order and notified the customer.\n• Preparing: Your kitchen is cooking and packing the items.\n• Ready for Pickup: Packed and waiting at your counter — rider pickup code is available.\n• Rider Assigned / Out for Delivery: Rider has picked up the order and is heading to the customer.\n• Delivered / Completed: Delivery confirmed — escrowed earnings release to your Available Balance.\n• Cancelled: Order was stopped and the customer is refunded automatically.",
  },
  {
    category: "menu",
    question: "How do I add, price, or pause menu items?",
    answer:
      "Use Add Food to publish a new dish with photos, portions, and optional choice groups. Use My Foods anytime to edit prices, toggle availability on/off when an item sells out, or archive old dishes.",
  },
  {
    category: "menu",
    question: "What is the Options Library for?",
    answer:
      "Options Library lets you create reusable choice groups (such as Choose Protein, Choose Swallow, or Spice Level) once and copy them into any new food item or combo in one click.",
  },
  {
    category: "analytics",
    question: "What insights can I track in Business Analytics?",
    answer:
      "Open Analytics from the sidebar (or the Kitchen & Sales Pulse strip on your Dashboard) to track Daily, Weekly (7D), Monthly (30D), and All-Time sales, Total Completed Orders, Average Order Value (AOV), Order Acceptance Rate, Cancelled Orders, Average Preparation Time, Customer Ratings breakdown (5★–1★), and both Best-Selling and Least-Selling meals. You can also switch timeframes (Today, 7D, 30D, 90D, All) and export a CSV report.",
  },
  {
    category: "analytics",
    question: "How are Average Preparation Time and Order Acceptance Rate calculated?",
    answer:
      "• Average Preparation Time measures the actual time between when your kitchen accepts/starts an order and when you mark it Ready for Pickup, compared against your target prep time.\n• Order Acceptance Rate measures the percentage of incoming orders your store accepted rather than missed or cancelled before acceptance.\n\nKeeping your prep time realistic and using Busy Mode or timed Order Pause during rushes helps protect both metrics.",
  },
  {
    category: "analytics",
    question: "What does Least-Selling Meals show and how should I use it?",
    answer:
      "Least-Selling Meals cross-references your completed orders against every active item on your menu — including dishes with zero sales in the selected period. Use it to spot slow movers and improve their photos, descriptions, pricing, or temporarily hide items that aren't selling.",
  },
  {
    category: "availability",
    question: "How do Busy Mode and Estimated Preparation Time adjustment work?",
    answer:
      "Go to Availability in the sidebar to set your standard Base Preparation Time (5–90 min). During lunch or dinner rushes, turn on Busy Mode to add an extra prep buffer (+10, +15, +20, +30, or +45 min) with an optional auto-expiry timer (30 min, 1 hr, 2 hrs, or manual).\n\nYour store stays open and keeps taking orders while customers automatically see your updated prep ETA (for example, 'Open now · Busy (~40 min prep)').",
  },
  {
    category: "availability",
    question: "What is the difference between Pause Incoming Orders and Temporary Closure?",
    answer:
      "• Pause Incoming Orders (15 min, 30 min, 1 hr, or manual): Gives your kitchen a short breather by holding new customer checkouts while letting you finish active orders. Orders resume automatically when the timer ends.\n• Temporary Closure (2 hrs, Rest of Today, Tomorrow 9 AM, or custom date/time): Closes your store for restocking, maintenance, or holidays, displays your optional reason and reopen time to customers, and reopens automatically when scheduled.",
  },
  {
    category: "availability",
    question: "How does automatic closure based on operating hours work?",
    answer:
      "In Availability → Weekly Open / Closed Schedule, set your daily opening and closing times (Africa/Lagos WAT) and keep 'Automatic Closure by Operating Hours' switched on. MelaChow automatically blocks new checkouts outside your scheduled hours and displays your next opening time to customers. You can also adjust only Today's hours in one click without changing your regular weekly schedule.",
  },
  {
    category: "availability",
    question: "What does an Admin Override banner mean on my Availability page?",
    answer:
      "A MelaChow super-admin can override a store's live status (Force Open or Force Closed) when needed for platform operations or support incidents. Admin Override takes top priority over your weekly schedule, pauses, and temporary closures. If you see an Admin Override banner and need normal automatic scheduling restored, contact support@melachow.com.",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Topics", icon: ShieldCheck },
  { id: "analytics", label: "Analytics & Insights", icon: BarChart3 },
  { id: "availability", label: "Store Availability", icon: SlidersHorizontal },
  { id: "account", label: "Account & Setup", icon: Store },
  { id: "finance", label: "Escrow & Payouts", icon: Wallet },
  { id: "orders", label: "Orders & Delivery", icon: ClipboardList },
  { id: "menu", label: "Menu & Catalog", icon: UtensilsCrossed },
];

export default function VendorFAQs() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState(0);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (q) {
        return (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-[1160px] pb-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. HEADER CARD ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.16), transparent 68%)",
              }}
            />

            <div className="relative max-w-xl space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                <HelpCircle size={13} />
                Vendor Help Center
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Answers &amp; Operations Guide
              </h1>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Everything you need to run your store smoothly — order
                workflows, Escrow protection, T+1 payouts, and menu tools.
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. CATEGORY PILLS ── */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setOpenIndex(0);
                }}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 3. ACCORDION LIST ── */}
        <div className="space-y-3">
          {filteredData.length > 0 ? (
            filteredData.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.question}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-zinc-900 ${
                    isOpen
                      ? "border-orange-300 ring-1 ring-orange-500/20 dark:border-orange-500/40"
                      : "border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="text-sm font-bold text-zinc-900 dark:text-white sm:text-[15px]">
                      {item.question}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                        isOpen
                          ? "rotate-180 bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      <ChevronDown size={16} />
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
                        <div className="border-t border-zinc-100 px-5 pb-5 pt-4 dark:border-zinc-800">
                          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {item.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <Search size={24} className="text-zinc-400" />
              <p className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                No FAQs matched &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>

        {/* ── 4. SUPPORT CONTACT BANNER ── */}
        <section className="flex flex-col gap-5 rounded-2xl border border-zinc-200/90 bg-zinc-900 p-6 text-white shadow-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-400 sm:flex">
              <MessageCircle size={22} />
            </span>
            <div>
              <h2 className="text-base font-bold">Need direct assistance?</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Our vendor partner support team can help with payouts, menu
                approvals, or active delivery issues.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <a
              href="mailto:support@melachow.com"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              <Mail size={15} />
              <span>Email Support</span>
            </a>
            <Link
              href="/vendors/menu-guide"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              <span>Menu Guide</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
      <ChatWidget />
    </div>
  );
}
