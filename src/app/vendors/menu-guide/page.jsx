"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Layers3,
  Lightbulb,
  ListChecks,
  Package,
  Plus,
  Sparkles,
  Tag,
  UtensilsCrossed,
  X,
} from "lucide-react";

const FOOD_STEPS = [
  {
    number: "01",
    title: "Describe the dish",
    text: "Add a clear name, concise description, sharp photo, item type, dietary tag, prep time, and up to six search tags.",
    example:
      "Smoky Party Jollof — Party-style jollof rice cooked in a rich pepper and tomato base.",
  },
  {
    number: "02",
    title: "Place it correctly",
    text: "Pick the closest MelaChow category, then optionally organize it into your own store section like Rice Meals or Swallows.",
    example: "Category: Rice · Section: Rice Meals",
  },
  {
    number: "03",
    title: "Create clear portions",
    text: "Every dish needs at least one portion. Name sizes clearly and make your most popular size the default.",
    example: "Regular Pack — ₦2,500 · Large Pack — ₦3,800",
  },
  {
    number: "04",
    title: "Add useful choices",
    text: "Add choice groups only when the customer must decide (or wants extras). Set min/max limits accurately.",
    example: "Choose Protein: Chicken +₦1,500 · Beef +₦1,200 · Fish +₦1,400",
  },
  {
    number: "05",
    title: "Review & publish",
    text: "Double-check spelling, photo crop, prices, and selection rules before publishing live.",
    example: "Read the item once as if you were ordering it yourself.",
  },
];

const COMBO_STEPS = [
  {
    number: "01",
    title: "Name the bundle clearly",
    text: "Use a name that immediately communicates the deal, with a clear photo, description, prep time, and tags.",
    example:
      "Lunch for Two — Jollof rice, two chicken portions, plantain, and two drinks.",
  },
  {
    number: "02",
    title: "Choose its category",
    text: "Select the closest platform category and place it in a section like Family Deals or Lunch Specials.",
    example: "Category: Combo Deals · Section: Lunch Specials",
  },
  {
    number: "03",
    title: "Set one honest base price",
    text: "List everything included in the base price so the bundle feels simpler and better value than buying separately.",
    example: "2 jollof rice, 2 chicken, plantain, 2 drinks · ₦12,500",
  },
  {
    number: "04",
    title: "Add controlled upgrades",
    text: "Let diners swap or upgrade drinks/proteins without overwhelming them with too many choices.",
    example: "Choose Drinks: 2 Water (included) · 2 Malt +₦1,000",
  },
  {
    number: "05",
    title: "Preview the full deal",
    text: "Confirm the photo, included items, and total price all tell the same clear story before going live.",
    example: "A customer should understand the deal in under 10 seconds.",
  },
];

const FOOD_EXAMPLES = [
  { name: "Smoky Party Jollof", type: "Food", section: "Rice Meals", price: "₦2,500", prep: "20 min", tags: ["rice", "smoky", "bestseller"] },
  { name: "White Rice & Stew", type: "Food", section: "Rice Meals", price: "₦2,200", prep: "15 min", tags: ["rice", "stew", "classic"] },
  { name: "Amala & Ewedu", type: "Swallow", section: "Swallows", price: "₦2,800", prep: "15 min", tags: ["amala", "local"] },
  { name: "Pounded Yam & Egusi", type: "Swallow", section: "Swallows", price: "₦3,500", prep: "20 min", tags: ["egusi", "swallow"] },
  { name: "Ofada Rice & Ayamase", type: "Food", section: "Local Specials", price: "₦4,000", prep: "25 min", tags: ["ofada", "spicy"] },
  { name: "Peppered Chicken", type: "Protein", section: "Proteins", price: "₦1,800", prep: "12 min", tags: ["chicken", "protein"] },
  { name: "Moi Moi", type: "Side", section: "Sides", price: "₦900", prep: "10 min", tags: ["beans", "side"] },
  { name: "Zobo Drink", type: "Drink", section: "Drinks", price: "₦800", prep: "5 min", tags: ["zobo", "cold"] },
];

const COMBO_EXAMPLES = [
  { name: "Solo Jollof Box", contents: "Jollof rice, chicken & plantain", price: "₦4,800", tag: "Quick lunch" },
  { name: "White Rice Comfort Box", contents: "White rice, stew, beef & moi moi", price: "₦5,200", tag: "Complete meal" },
  { name: "Swallow Lovers Deal", contents: "2 swallows, egusi, ewedu & assorted meat", price: "₦9,500", tag: "For two" },
  { name: "Family Rice Feast", contents: "4 rice portions, 4 proteins, plantain & drinks", price: "₦22,000", tag: "Family size" },
  { name: "Office Lunch Pack", contents: "10 rice packs, chicken & bottled water", price: "₦45,000", tag: "Group order" },
  { name: "Grill Night Bundle", contents: "Grilled fish, yam chips, slaw & 2 drinks", price: "₦13,500", tag: "Dinner deal" },
];

const QUALITY_CHECKS = [
  "The name clearly identifies the dish or deal.",
  "The description explains exactly what the customer receives.",
  "The photo matches the real dish and portion size.",
  "At least one valid portion or combo price is set.",
  "Required choices have sensible minimum and maximum limits.",
  "Preparation time is realistic during peak hours.",
  "Spelling, tags, category, and availability are accurate.",
];

const GUIDE_FAQS = [
  {
    question: "What is the difference between a food item and a combo?",
    answer:
      "A food item is a single sellable dish with one or more portion sizes. A combo is a complete deal sold at one base price, combining multiple dishes, proteins, sides, or drinks.",
  },
  {
    question: "Should protein be included in the portion price?",
    answer:
      "Either works as long as it is obvious. If the base price is rice only, state that clearly and make protein a required choice. If protein is included, mention it in the title or description and price it at ₦0 in choices.",
  },
  {
    question: "How many choice groups should I add?",
    answer:
      "Stick to 0–3 choice groups per dish. Asking only what the kitchen needs speeds up checkout and reduces order mistakes.",
  },
  {
    question: "Can I edit an item after publishing?",
    answer:
      "Yes. Open My Foods, click any dish, and update prices, portions, choices, or availability anytime.",
  },
];

export default function MenuGuidePage() {
  const [activeGuide, setActiveGuide] = useState("food");
  const [openFaq, setOpenFaq] = useState(0);
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1440px] pb-12 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-6">
        {/* ── 1. HERO CARD ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.18), transparent 68%)",
              }}
            />

            <div className="relative space-y-3 lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                <Sparkles size={13} />
                MelaChow Menu Academy
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl lg:text-4xl">
                Build a menu customers order from with confidence.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Follow our structured 5-step playbook for pricing portions,
                organizing choice groups, and photographing dishes so orders come
                in accurately every time.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/vendors/create-food"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
                >
                  <Plus size={16} />
                  <span>Create Food Item</span>
                </Link>
                <Link
                  href="/vendors/options-library"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <Layers3 size={16} />
                  <span>Options Library</span>
                </Link>
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-3 lg:col-span-5">
              {[
                { value: "5", label: "Wizard Steps", icon: ListChecks },
                { value: "14", label: "Real Examples", icon: BookOpen },
                { value: "1+", label: "Portion Required", icon: Layers3 },
                { value: "6 max", label: "Search Tags", icon: Tag },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
                >
                  <stat.icon size={16} className="text-orange-600 dark:text-orange-400" />
                  <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. STEP-BY-STEP WALKTHROUGH ── */}
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Step-by-step walkthrough
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Match the exact creation wizard flow
              </h2>
            </div>

            <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950 sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveGuide("food")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:flex-none ${
                  activeGuide === "food"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <UtensilsCrossed size={14} />
                <span>Food Item</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide("combo")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:flex-none ${
                  activeGuide === "combo"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <Package size={14} />
                <span>Combo Deal</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeGuide}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-5"
            >
              {(activeGuide === "food" ? FOOD_STEPS : COMBO_STEPS).map((step) => (
                <div
                  key={step.number}
                  className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-orange-600">
                      {step.number}
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {step.text}
                    </p>
                  </div>
                  <div className="mt-4 rounded-lg border border-orange-200/70 bg-orange-50/70 p-3 dark:border-orange-500/20 dark:bg-orange-500/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      Example
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {step.example}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-500/25 dark:bg-orange-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
              <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                <strong className="font-bold text-zinc-900 dark:text-white">
                  Drafts auto-save locally:
                </strong>{" "}
                the wizard saves your progress as you type, so you can review
                everything before going live.
              </p>
            </div>
            <Link
              href="/vendors/create-food"
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 dark:bg-white dark:text-zinc-900"
            >
              <span>Open Food Wizard</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        {/* ── 3. CHOICE GROUPS & INTERACTIVE QUALITY CHECKLIST ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Choice Groups */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                <Layers3 size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Choice Group Best Practices
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ask only the questions your kitchen needs
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { name: "Choose Protein", rule: "Required · Pick 1", options: "Chicken, beef, fish" },
                { name: "Add Extras", rule: "Optional · Up to 3", options: "Plantain, moi moi, coleslaw" },
                { name: "Choose Soup", rule: "Required · Pick 1", options: "Egusi, ewedu, ogbono" },
                { name: "Choose Drinks", rule: "Required · Pick 2", options: "Water, malt, soft drink" },
              ].map((g) => (
                <div
                  key={g.name}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {g.name}
                    </p>
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    {g.rule}
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {g.options}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <X size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <p className="leading-relaxed">
                <strong>Avoid duplicate charges:</strong> if chicken is already
                included in the base price, set its choice modifier to{" "}
                <strong>₦0</strong>.
              </p>
            </div>
          </div>

          {/* Interactive 60-Second Quality Check */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <ListChecks size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    60-Second Pre-Publish Checklist
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tap each item as you verify your dish
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {checkedCount}/{QUALITY_CHECKS.length}
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.round((checkedCount / QUALITY_CHECKS.length) * 100)}%`,
                }}
              />
            </div>

            <div className="mt-4 space-y-2">
              {QUALITY_CHECKS.map((check, idx) => {
                const done = Boolean(checkedItems[idx]);
                return (
                  <button
                    key={check}
                    type="button"
                    onClick={() => toggleCheck(idx)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition ${
                      done
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 line-through dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                        : "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        done
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                      }`}
                    >
                      {done && <Check size={11} />}
                    </span>
                    <span className="leading-relaxed">{check}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. PHOTO GUIDE & EXAMPLES ── */}
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <Camera size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Food Photography Guide
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Clear, honest photos convert significantly better
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Check size={14} /> Do This
              </p>
              <ul className="mt-3 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li>• Shoot in bright, natural daylight near a window.</li>
                <li>• Show the real portion size the customer receives.</li>
                <li>• Keep the background clean and uncluttered.</li>
                <li>• Use a sharp square or landscape photo.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/25 dark:bg-rose-500/10">
              <p className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                <X size={14} /> Avoid This
              </p>
              <ul className="mt-3 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li>• Dark, blurry, or heavily filtered images.</li>
                <li>• Photos copied from other restaurants.</li>
                <li>• Showing extras that are not included in the base price.</li>
                <li>• Phone numbers, watermarks, or overlaid text.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 5. EXAMPLE LIBRARY ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Menu Examples to Adapt
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Adjust prices for your kitchen costs
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FOOD_EXAMPLES.map((item) => (
              <div
                key={item.name}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                      {item.type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock3 size={12} /> {item.prep}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.section}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-base font-bold tabular-nums text-orange-600 dark:text-orange-400">
                    {item.price}
                  </span>
                  <div className="flex gap-1">
                    {item.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {COMBO_EXAMPLES.map((combo) => (
              <div
                key={combo.name}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      <Package size={14} className="text-orange-500" />
                      Combo Deal
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {combo.tag}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold text-zinc-900 dark:text-white">
                    {combo.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {combo.contents}
                  </p>
                </div>
                <p className="mt-4 border-t border-zinc-100 pt-3 text-base font-bold tabular-nums text-orange-600 dark:border-zinc-800 dark:text-orange-400">
                  {combo.price}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. QUICK FAQS ── */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {GUIDE_FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-orange-500 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <p className="border-t border-zinc-100 px-5 pb-5 pt-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
