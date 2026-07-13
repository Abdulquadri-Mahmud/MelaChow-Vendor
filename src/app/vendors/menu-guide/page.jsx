"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  Zap,
} from "lucide-react";

const FOOD_STEPS = [
  {
    number: "01",
    title: "Describe the dish",
    text: "Add a clear name, useful description, strong photo, item type, dietary type, preparation time, and up to six search tags.",
    example: "Smoky Party Jollof — Party-style jollof rice cooked in a rich pepper and tomato base.",
  },
  {
    number: "02",
    title: "Place it correctly",
    text: "Choose the closest MelaChow category, then optionally place it in your own section such as Rice Meals, Swallows, Soups, or Drinks.",
    example: "Platform category: Rice · Menu section: Rice Meals",
  },
  {
    number: "03",
    title: "Create portions",
    text: "Every food needs at least one portion. Use names customers immediately understand and make the most popular size the primary option.",
    example: "Regular Pack — ₦2,500 · Large Pack — ₦3,800",
  },
  {
    number: "04",
    title: "Offer useful choices",
    text: "Add choice groups only when the customer needs to decide. Set required rules and selection limits carefully.",
    example: "Choose Protein: Chicken +₦1,500 · Beef +₦1,200 · Fish +₦1,400",
  },
  {
    number: "05",
    title: "Review and publish",
    text: "Check spelling, photo crop, prices, selection rules, and availability before publishing to your live menu.",
    example: "Read the item once as if you were placing the order yourself.",
  },
];

const COMBO_STEPS = [
  {
    number: "01",
    title: "Give the bundle a purpose",
    text: "Use a name that tells customers what the deal is. Add a photo, description, dietary type, preparation time, and searchable tags.",
    example: "Lunch for Two — Jollof rice, two chicken portions, plantain, and two drinks.",
  },
  {
    number: "02",
    title: "Choose its category",
    text: "Select the closest platform category and, if useful, add it to a restaurant section such as Family Deals or Lunch Specials.",
    example: "Platform category: Combo Deals · Menu section: Lunch Specials",
  },
  {
    number: "03",
    title: "Set one clear price",
    text: "Enter the base combo price and list what is included. The deal should feel simpler and better-value than ordering each item separately.",
    example: "Included: 2 jollof rice, 2 chicken, plantain, 2 drinks · Combo price: ₦12,500",
  },
  {
    number: "04",
    title: "Add controlled upgrades",
    text: "Let customers swap or upgrade parts of the combo with choice groups, without making the bundle difficult to understand.",
    example: "Choose Drinks: 2 Water (included) · 2 Malt +₦1,000",
  },
  {
    number: "05",
    title: "Preview the complete deal",
    text: "Confirm the name, included items, final base price, choices, and photo all describe the same bundle before publishing.",
    example: "A customer should understand the entire deal in under ten seconds.",
  },
];

const FOOD_EXAMPLES = [
  { name: "Smoky Party Jollof", type: "Food", section: "Rice Meals", price: "₦2,500", prep: "20 min", tags: ["rice", "smoky", "bestseller"] },
  { name: "White Rice & Stew", type: "Food", section: "Rice Meals", price: "₦2,200", prep: "15 min", tags: ["rice", "stew", "classic"] },
  { name: "Amala & Ewedu", type: "Swallow", section: "Swallows", price: "₦2,800", prep: "15 min", tags: ["amala", "yoruba", "local"] },
  { name: "Pounded Yam & Egusi", type: "Swallow", section: "Swallows", price: "₦3,500", prep: "20 min", tags: ["egusi", "swallow", "popular"] },
  { name: "Ofada Rice & Ayamase", type: "Food", section: "Local Specials", price: "₦4,000", prep: "25 min", tags: ["ofada", "spicy", "local"] },
  { name: "Peppered Chicken", type: "Protein", section: "Proteins", price: "₦1,800", prep: "12 min", tags: ["chicken", "peppered", "protein"] },
  { name: "Moi Moi", type: "Side", section: "Sides", price: "₦900", prep: "10 min", tags: ["beans", "side", "steamed"] },
  { name: "Zobo Drink", type: "Drink", section: "Drinks", price: "₦800", prep: "5 min", tags: ["zobo", "cold", "refreshing"] },
];

const COMBO_EXAMPLES = [
  { name: "Solo Jollof Box", contents: "Jollof rice, chicken & plantain", price: "₦4,800", saving: "Quick lunch" },
  { name: "White Rice Comfort Box", contents: "White rice, stew, beef & moi moi", price: "₦5,200", saving: "Complete meal" },
  { name: "Swallow Lovers Deal", contents: "2 swallows, egusi, ewedu & assorted meat", price: "₦9,500", saving: "For two" },
  { name: "Family Rice Feast", contents: "4 rice portions, 4 proteins, plantain & drinks", price: "₦22,000", saving: "Family size" },
  { name: "Office Lunch Pack", contents: "10 rice packs, chicken & bottled water", price: "₦45,000", saving: "Group order" },
  { name: "Grill Night Bundle", contents: "Grilled fish, yam chips, slaw & 2 drinks", price: "₦13,500", saving: "Dinner deal" },
];

const FAQS = [
  {
    question: "What is the difference between a food item and a combo?",
    answer: "A food item is one sellable dish with one or more portions. A combo is a complete deal sold at one base price, usually containing multiple dishes, proteins, sides, or drinks.",
  },
  {
    question: "Should protein be included in the portion price?",
    answer: "Either approach can work, but the listing must be clear. If the displayed price is rice only, say so and make protein a required choice. If protein is included, identify the included protein in the name or description.",
  },
  {
    question: "How many choice groups should I add?",
    answer: "Use only the groups needed to complete the order. Most items need zero to three groups. Too many decisions slow customers down and increase ordering mistakes.",
  },
  {
    question: "Can I edit an item after publishing?",
    answer: "Yes. Open My Foods or My Combos, select the item, and edit it. Recheck live prices and availability whenever ingredients or packaging costs change.",
  },
];

function StepCard({ step }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 dark:border-white/8 dark:bg-zinc-900/70 dark:hover:border-orange-500/30">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-500/5 blur-2xl transition-colors group-hover:bg-orange-500/10" />
      <div className="relative flex gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-[11px] font-black text-white shadow-lg dark:bg-white dark:text-zinc-950">
          {step.number}
        </span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-zinc-950 dark:text-white">{step.title}</h3>
          <p className="mt-2 text-[12px] font-medium leading-6 text-zinc-600 dark:text-zinc-400">{step.text}</p>
          <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/70 p-3 dark:border-orange-500/15 dark:bg-orange-500/5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-600">Example</p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-zinc-700 dark:text-zinc-300">{step.example}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl dark:text-white">{title}</h2>
      <p className="mt-3 text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-zinc-900/70">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span className="text-[12px] font-black text-zinc-900 dark:text-white">{item.question}</span>
        <ChevronDown size={17} className={`shrink-0 text-orange-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p className="px-5 pb-5 text-[12px] font-medium leading-6 text-zinc-600 dark:text-zinc-400">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MenuGuidePage() {
  const [activeGuide, setActiveGuide] = useState("food");
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen bg-zinc-50 pb-16 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 px-5 py-8 shadow-2xl sm:px-8 md:py-10 lg:px-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-[90px]" />
          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-amber-400/10 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">
                <Sparkles size={12} /> MelaChow Menu Academy
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                Build a menu customers can order from with confidence.
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-zinc-400">
                Learn how to create clear food listings and valuable combo deals, with practical examples you can adapt for your restaurant.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/vendors/create-food" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 active:scale-[0.98]">
                  <Plus size={15} /> Create a food item
                </Link>
                <Link href="/vendors/my-combos/create" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur transition hover:bg-white/10 active:scale-[0.98]">
                  <Package size={15} /> Create a combo
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "5", label: "Simple steps", icon: ListChecks },
                { value: "14", label: "Real examples", icon: BookOpen },
                { value: "1+", label: "Portion required", icon: Layers3 },
                { value: "6", label: "Tags maximum", icon: Tag },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-md">
                  <stat.icon size={16} className="text-orange-400" />
                  <p className="mt-4 text-2xl font-black text-white">{stat.value}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <button
            onClick={() => {
              setActiveGuide("food");
              document.getElementById("walkthrough")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 dark:border-white/8 dark:bg-zinc-900/70 dark:hover:border-orange-500/30"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
                <UtensilsCrossed size={19} />
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:bg-white/5">Individual listing</span>
            </div>
            <h2 className="mt-5 text-lg font-black tracking-tight text-zinc-950 dark:text-white">Create a food item</h2>
            <p className="mt-2 text-[12px] font-medium leading-6 text-zinc-600 dark:text-zinc-400">
              Best for one dish, drink, protein, soup, swallow, side, or dessert. A food item can have several portion sizes.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-orange-600">
              Read food guide <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          <button
            onClick={() => {
              setActiveGuide("combo");
              document.getElementById("walkthrough")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 dark:border-white/8 dark:bg-zinc-900/70 dark:hover:border-amber-500/30"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950">
                <Package size={19} />
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:bg-white/5">Bundle deal</span>
            </div>
            <h2 className="mt-5 text-lg font-black tracking-tight text-zinc-950 dark:text-white">Create a combo item</h2>
            <p className="mt-2 text-[12px] font-medium leading-6 text-zinc-600 dark:text-zinc-400">
              Best for a complete meal deal, meal for two, family pack, office order, or any group of items sold at one base price.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-orange-600">
              Read combo guide <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </section>

        <section id="walkthrough" className="scroll-mt-5 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Step-by-step walkthrough"
              title="Follow the same flow as the creation wizard."
              description="Use this guide beside the form. Each step below explains what to enter and shows a strong example."
            />
            <div className="inline-flex w-full rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm sm:w-auto dark:border-white/8 dark:bg-zinc-900">
              <button
                onClick={() => setActiveGuide("food")}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[9px] font-black uppercase tracking-widest transition sm:flex-none ${activeGuide === "food" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
              >
                <UtensilsCrossed size={14} /> Food item
              </button>
              <button
                onClick={() => setActiveGuide("combo")}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[9px] font-black uppercase tracking-widest transition sm:flex-none ${activeGuide === "combo" ? "bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
              >
                <Package size={14} /> Combo
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeGuide}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            >
              {(activeGuide === "food" ? FOOD_STEPS : COMBO_STEPS).map((step) => <StepCard key={step.number} step={step} />)}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center dark:border-orange-500/20 dark:bg-orange-500/5">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 shrink-0 text-orange-600" size={19} />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Ready to practise?</p>
                <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-600 dark:text-zinc-400">
                  The wizard saves your progress while you work. You can review everything before publishing.
                </p>
              </div>
            </div>
            <Link
              href={activeGuide === "food" ? "/vendors/create-food" : "/vendors/my-combos/create"}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-orange-600 dark:bg-white dark:text-zinc-950 dark:hover:bg-orange-500 dark:hover:text-white"
            >
              Open {activeGuide === "food" ? "food" : "combo"} wizard <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[28px] bg-zinc-950 p-6 text-white shadow-2xl sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 shadow-lg shadow-orange-600/25">
              <Layers3 size={19} />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">Choice groups made simple</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Ask only the questions needed to prepare the order.</h2>
            <p className="mt-4 text-[12px] font-medium leading-6 text-zinc-400">
              A choice group contains a customer decision and its options. Mark it required only when the kitchen cannot complete the order without an answer.
            </p>

            <div className="mt-7 space-y-3">
              {[
                ["Group name", "Choose Protein"],
                ["Required", "Yes — customer must pick"],
                ["Selection rule", "Minimum 1 · Maximum 1"],
                ["Options", "Chicken +₦1,500 · Beef +₦1,200 · Fish +₦1,400"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.045] p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
                  <p className="mt-1.5 text-[11px] font-bold leading-5 text-zinc-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/8 dark:bg-zinc-900/70">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">Good group patterns</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { name: "Choose Protein", rule: "Required · Pick 1", options: "Chicken, beef, fish" },
                { name: "Add Extras", rule: "Optional · Pick up to 3", options: "Plantain, moi moi, coleslaw" },
                { name: "Choose Soup", rule: "Required · Pick 1", options: "Egusi, ewedu, ogbono" },
                { name: "Choose Drinks", rule: "Required · Pick 2", options: "Water, malt, soft drink" },
              ].map((group) => (
                <div key={group.name} className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-white/8 dark:bg-zinc-950/60">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black text-zinc-900 dark:text-white">{group.name}</p>
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                  </div>
                  <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-orange-600">{group.rule}</p>
                  <p className="mt-3 text-[11px] font-medium leading-5 text-zinc-500">{group.options}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 dark:border-rose-500/15 dark:bg-rose-500/5">
              <div className="flex gap-3">
                <X size={17} className="mt-0.5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Avoid duplicate charges</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-600 dark:text-zinc-400">
                    Do not charge for an option twice. If chicken is already included in the base price, its modifier should be ₦0.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <SectionHeading
            eyebrow="Example library"
            title="Adapt these examples to your kitchen."
            description="Use the structure, not necessarily the exact price. Your own ingredient, packaging, portion, and operating costs should determine pricing."
          />

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-zinc-950 dark:text-white">
                <UtensilsCrossed size={16} className="text-orange-600" /> Food item examples
              </h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{FOOD_EXAMPLES.length} ideas</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FOOD_EXAMPLES.map((item, index) => (
                <div key={item.name} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/8 dark:bg-zinc-900/70">
                  <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${index % 3 === 0 ? "from-orange-600 to-amber-400" : index % 3 === 1 ? "from-zinc-900 to-zinc-700" : "from-emerald-700 to-lime-500"}`}>
                    <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full border-[14px] border-white/10" />
                    <UtensilsCrossed className="absolute bottom-4 left-4 text-white/90" size={22} />
                    <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/15 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-white backdrop-blur">{item.type}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-[13px] font-black text-zinc-950 dark:text-white">{item.name}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400">{item.section}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <span className="text-lg font-black tabular-nums text-orange-600">{item.price}</span>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-500"><Clock3 size={11} /> {item.prep}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.map((tag) => <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[7px] font-black uppercase tracking-wide text-zinc-500 dark:bg-white/5">{tag}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-zinc-950 dark:text-white">
                <Package size={16} className="text-orange-600" /> Combo examples
              </h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{COMBO_EXAMPLES.length} ideas</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {COMBO_EXAMPLES.map((combo) => (
                <div key={combo.name} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 dark:border-white/8 dark:bg-zinc-900/70 dark:hover:border-orange-500/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"><Package size={17} /></div>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600 dark:bg-orange-500/10">{combo.saving}</span>
                  </div>
                  <p className="mt-5 text-[14px] font-black text-zinc-950 dark:text-white">{combo.name}</p>
                  <p className="mt-2 min-h-10 text-[11px] font-medium leading-5 text-zinc-500 dark:text-zinc-400">{combo.contents}</p>
                  <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-white/8">
                    <span className="text-xl font-black tabular-nums text-orange-600">{combo.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/8 dark:bg-zinc-900/70">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20"><Camera size={19} /></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600">Photo guide</p>
                <h2 className="mt-1 text-xl font-black tracking-tight">Make the food easy to see.</h2>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/5">
                <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-600"><Check size={14} /> Do this</p>
                <ul className="mt-4 space-y-3 text-[11px] font-medium leading-5 text-zinc-600 dark:text-zinc-400">
                  <li>Use bright, natural light.</li>
                  <li>Show the actual portion customers receive.</li>
                  <li>Keep the background clean.</li>
                  <li>Use a sharp landscape or square photo.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-500/15 dark:bg-rose-500/5">
                <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rose-600"><X size={14} /> Avoid this</p>
                <ul className="mt-4 space-y-3 text-[11px] font-medium leading-5 text-zinc-600 dark:text-zinc-400">
                  <li>Dark, blurry, or heavily filtered images.</li>
                  <li>Photos downloaded from another restaurant.</li>
                  <li>Items in the photo that are not included.</li>
                  <li>Text, phone numbers, or watermarks.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/8 dark:bg-zinc-900/70">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950"><ListChecks size={19} /></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600">Before publishing</p>
                <h2 className="mt-1 text-xl font-black tracking-tight">Run the 60-second quality check.</h2>
              </div>
            </div>
            <div className="mt-7 grid gap-2">
              {[
                "The name clearly identifies the dish or deal.",
                "The description says what the customer receives.",
                "The photo matches the item and portion.",
                "At least one valid portion or combo price is set.",
                "Required choices have sensible minimum and maximum limits.",
                "Preparation time is realistic for a busy period.",
                "Spelling, tags, category, and availability are correct.",
              ].map((check) => (
                <div key={check} className="flex items-start gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-950/60">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-[11px] font-bold leading-5 text-zinc-600 dark:text-zinc-400">{check}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <SectionHeading
            eyebrow="Common questions"
            title="A few answers before you publish."
            description="These are the decisions that most often affect menu clarity and customer satisfaction."
          />
          <div className="mt-8 grid gap-3 lg:grid-cols-2">
            {FAQS.map((item, index) => (
              <FaqItem key={item.question} item={item} open={openFaq === index} onToggle={() => setOpenFaq(openFaq === index ? -1 : index)} />
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-600 to-orange-500 p-6 text-white shadow-2xl shadow-orange-600/15 sm:p-8 lg:p-10">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[36px] border-white/10" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-orange-100"><Zap size={13} /> Your next action</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Start with one bestseller, then build from there.</h2>
              <p className="mt-3 text-[12px] font-medium leading-6 text-orange-50/90">Create the item customers ask for most, preview it carefully, and use the same structure for the rest of your menu.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/vendors/create-food" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[9px] font-black uppercase tracking-widest text-orange-600 shadow-lg transition hover:bg-zinc-950 hover:text-white">
                Create food <ArrowRight size={14} />
              </Link>
              <Link href="/vendors/my-combos/create" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur transition hover:bg-white/20">
                Create combo <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
