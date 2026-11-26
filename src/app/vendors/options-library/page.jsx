"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Check,
  Copy,
  Edit3,
  Info,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import {
  archiveChoiceGroupTemplate,
  createChoiceGroupTemplate,
  duplicateChoiceGroupTemplate,
  getChoiceGroupTemplates,
  updateChoiceGroupTemplate,
} from "@/app/lib/menuApi";

const STARTERS = [
  {
    name: "Add Protein",
    is_required: false,
    min_selections: 0,
    max_selections: 1,
    options: ["Chicken", "Beef", "Fish", "Goat Meat"],
  },
  {
    name: "Choose Swallow",
    is_required: true,
    min_selections: 1,
    max_selections: 1,
    options: ["Eba", "Amala", "Pounded Yam", "Semo"],
  },
  {
    name: "Spice Level",
    is_required: true,
    min_selections: 1,
    max_selections: 1,
    options: ["Mild", "Medium", "Hot"],
  },
];

const emptyForm = {
  name: "",
  is_required: false,
  min_selections: 0,
  max_selections: 1,
  options: [
    {
      label: "",
      price_modifier_naira: 0,
      image_url: "",
      is_available: true,
      track_stock: false,
      stock_quantity: 0,
      low_stock_threshold: 5,
    },
  ],
};

const templateToForm = (template) => ({
  name: template.name,
  is_required: template.is_required,
  min_selections: template.min_selections,
  max_selections: template.max_selections,
  options: template.options.map((option) => ({
    label: option.label,
    price_modifier_naira: option.price_modifier_naira || 0,
    image_url: option.image_url || "",
    is_available: option.is_available !== false,
    track_stock: option.track_stock === true,
    stock_quantity: option.stock_quantity ?? 0,
    low_stock_threshold: option.low_stock_threshold ?? 5,
  })),
});

export default function OptionsLibraryPage() {
  const { vendorProfile } = useVendorProfile();
  const vendorId = vendorProfile?._id || vendorProfile?.id;
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadTemplates = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const data = await getChoiceGroupTemplates(vendorId, { archived });
      setTemplates(data.templates || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not load your options library"
      );
    } finally {
      setLoading(false);
    }
  }, [archived, vendorId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!showEditor) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEditor, saving]);

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.options.some((option) =>
          option.label.toLowerCase().includes(query)
        )
    );
  }, [search, templates]);

  const openCreate = (starter = null) => {
    setEditingTemplate(null);
    setForm(
      starter
        ? {
            name: starter.name,
            is_required: starter.is_required,
            min_selections: starter.min_selections,
            max_selections: starter.max_selections,
            options: starter.options.map((label) => ({
              label,
              price_modifier_naira: 0,
              image_url: "",
              is_available: true,
              track_stock: false,
              stock_quantity: 0,
              low_stock_threshold: 5,
            })),
          }
        : emptyForm
    );
    setShowEditor(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm(templateToForm(template));
    setShowEditor(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setShowEditor(false);
    setEditingTemplate(null);
    setForm(emptyForm);
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateOption = (index, field, value) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      ),
    }));
  };

  const addOption = () => {
    setForm((current) => ({
      ...current,
      options: [
        ...current.options,
        {
          label: "",
          price_modifier_naira: 0,
          image_url: "",
          is_available: true,
          track_stock: false,
          stock_quantity: 0,
          low_stock_threshold: 5,
        },
      ],
    }));
  };

  const removeOption = (index) => {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (saving) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      min_selections: Number(form.min_selections),
      max_selections: Number(form.max_selections),
      is_required: form.is_required || Number(form.min_selections) > 0,
      options: form.options.map((option, index) => ({
        ...option,
        label: option.label.trim(),
        price_modifier_naira: Number(option.price_modifier_naira) || 0,
        track_stock: option.track_stock === true,
        stock_quantity: option.track_stock
          ? Math.max(0, Number(option.stock_quantity) || 0)
          : 0,
        low_stock_threshold: Math.max(0, Number(option.low_stock_threshold) || 0),
        sort_order: index,
      })),
    };

    if (!payload.name) return toast.error("Enter a template name");
    if (payload.options.some((o) => !o.label))
      return toast.error("Every option needs a name");
    if (payload.options.length === 0)
      return toast.error("Add at least one option");
    if (
      payload.options.some(
        (o) => !Number.isFinite(o.price_modifier_naira) || o.price_modifier_naira < 0
      )
    )
      return toast.error("Extra prices must be zero or more");
    if (
      !Number.isInteger(payload.min_selections) ||
      !Number.isInteger(payload.max_selections) ||
      payload.min_selections < 0 ||
      payload.max_selections < 1 ||
      payload.min_selections >
        payload.options.filter((o) => o.is_available !== false).length ||
      payload.max_selections < payload.min_selections
    ) {
      return toast.error(
        "Maximum selections cannot be lower than minimum selections"
      );
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        const result = await updateChoiceGroupTemplate(
          vendorId,
          editingTemplate._id,
          payload
        );
        toast.success(result.message || "Template updated");
      } else {
        await createChoiceGroupTemplate(vendorId, payload);
        toast.success("Template added to your library");
      }
      setShowEditor(false);
      setEditingTemplate(null);
      setForm(emptyForm);
      await loadTemplates();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not save template"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (template) => {
    try {
      await duplicateChoiceGroupTemplate(vendorId, template._id);
      toast.success("Template duplicated");
      await loadTemplates();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not duplicate template"
      );
    }
  };

  const handleArchive = async (template) => {
    try {
      const result = await archiveChoiceGroupTemplate(
        vendorId,
        template._id,
        !archived
      );
      toast.success(result.message || "Template updated");
      await loadTemplates();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not update template"
      );
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] pb-12 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. HEADER CARD ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.16), transparent 68%)",
              }}
            />

            <div className="relative max-w-2xl space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                <Sparkles size={12} />
                Reusable Menu Tools
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Options Library
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Create choice groups once (proteins, swallows, drinks, spice
                levels) and reuse them across any new dish or combo.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={loadTemplates}
                disabled={loading}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              >
                <Plus size={16} />
                <span>New Template</span>
              </button>
            </div>
          </div>
        </section>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/75 px-4 py-3.5 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <strong className="font-semibold">How saved templates work:</strong>{" "}
            edits apply whenever you attach the template to a new food item.
            Existing menu items keep their own copied prices and options.
          </p>
        </div>

        {/* Quick Starters */}
        {!archived && templates.length === 0 && !loading && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Quick-Start Templates
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {STARTERS.map((starter) => (
                <button
                  key={starter.name}
                  type="button"
                  onClick={() => openCreate(starter)}
                  className="flex flex-col items-start rounded-2xl border border-zinc-200/90 bg-white p-5 text-left shadow-sm transition hover:border-orange-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                    <SlidersHorizontal size={17} />
                  </span>
                  <p className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">
                    {starter.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {starter.options.join(" · ")}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter Bar */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setArchived(false)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                !archived
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setArchived(true)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                archived
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Archived
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups or options..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        {/* Template Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : visibleTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
              <Layers3 size={22} />
            </div>
            <h2 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
              {archived
                ? "No archived templates"
                : search
                  ? "No templates match your search"
                  : "Create your first reusable group"}
            </h2>
            <p className="mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
              {archived
                ? "Archived templates can be restored anytime."
                : "Save common proteins, swallows, drinks, or sauces once and reuse them across dishes."}
            </p>
            {!archived && (
              <button
                type="button"
                onClick={() => openCreate()}
                className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-700"
              >
                <Plus size={15} />
                <span>Create Template</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTemplates.map((template) => (
              <article
                key={template._id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm transition hover:border-orange-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-zinc-900 dark:text-white">
                        {template.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {template.is_required ? "Required" : "Optional"} · Pick{" "}
                        {template.min_selections}–{template.max_selections}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {template.options.length} options
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {template.options.slice(0, 8).map((option) => (
                      <span
                        key={option._id || option.label}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {option.label}
                        {option.price_modifier_naira > 0
                          ? ` +₦${Number(option.price_modifier_naira).toLocaleString("en-NG")}`
                          : ""}
                      </span>
                    ))}
                    {template.options.length > 8 && (
                      <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        +{template.options.length - 8} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Used by{" "}
                    <strong className="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                      {template.usage?.total || 0}
                    </strong>{" "}
                    item{(template.usage?.total || 0) === 1 ? "" : "s"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!archived && (
                      <button
                        type="button"
                        title="Edit template"
                        onClick={() => openEdit(template)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    {!archived && (
                      <button
                        type="button"
                        title="Duplicate template"
                        onClick={() => handleDuplicate(template)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      title={archived ? "Restore template" : "Archive template"}
                      onClick={() => handleArchive(template)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {archived ? <RefreshCw size={14} /> : <Archive size={14} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Template Modal */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEditor}
              className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 14 }}
              role="dialog"
              aria-modal="true"
              aria-label={editingTemplate ? "Edit template" : "Create template"}
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                <div>
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    Options Library
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-zinc-900 dark:text-white">
                    {editingTemplate ? "Edit Template" : "Create Template"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {editingTemplate && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Editing this template will not modify the{" "}
                    {editingTemplate.usage?.total || 0} existing items that
                    previously copied it.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Group Name
                  </label>
                  <input
                    aria-label="Group name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Add Protein"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:grid-cols-3">
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <span>Required</span>
                    <input
                      type="checkbox"
                      checked={form.is_required}
                      onChange={(e) => {
                        setField("is_required", e.target.checked);
                        if (e.target.checked && Number(form.min_selections) < 1) {
                          setField("min_selections", 1);
                        }
                      }}
                      className="h-4 w-4 accent-orange-600"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Minimum
                    <input
                      type="number"
                      min="0"
                      value={form.min_selections}
                      onChange={(e) => setField("min_selections", e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Maximum
                    <input
                      type="number"
                      min="1"
                      value={form.max_selections}
                      onChange={(e) => setField("max_selections", e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        Options
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Set default extra prices in Naira.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addOption}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300"
                    >
                      <Plus size={14} />
                      <span>Add Option</span>
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {form.options.map((option, index) => (
                      <div
                        key={index}
                        className="space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_130px_40px]">
                          <input
                            value={option.label}
                            onChange={(e) =>
                              updateOption(index, "label", e.target.value)
                            }
                            placeholder="Option name (e.g. Grilled Chicken)"
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                          />
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-600">
                              ₦
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={option.price_modifier_naira}
                              onChange={(e) =>
                                updateOption(
                                  index,
                                  "price_modifier_naira",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-2.5 text-sm font-semibold tabular-nums text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={form.options.length === 1}
                            onClick={() => removeOption(index)}
                            aria-label={`Remove option ${index + 1}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <input
                          type="url"
                          value={option.image_url || ""}
                          onChange={(e) =>
                            updateOption(index, "image_url", e.target.value)
                          }
                          placeholder="Thumbnail URL (optional)"
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        />

                        <div className="flex flex-wrap gap-4 pt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={option.is_available !== false}
                              onChange={(e) =>
                                updateOption(
                                  index,
                                  "is_available",
                                  e.target.checked
                                )
                              }
                              className="accent-orange-600"
                            />
                            <span>Available to customers</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={option.track_stock === true}
                              onChange={(e) =>
                                updateOption(
                                  index,
                                  "track_stock",
                                  e.target.checked
                                )
                              }
                              className="accent-orange-600"
                            />
                            <span>Track stock when copied</span>
                          </label>
                        </div>

                        {option.track_stock && (
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <label className="block text-xs text-zinc-500 dark:text-zinc-400">
                              Available Qty
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={option.stock_quantity}
                                onChange={(e) =>
                                  updateOption(
                                    index,
                                    "stock_quantity",
                                    e.target.value
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                              />
                            </label>
                            <label className="block text-xs text-zinc-500 dark:text-zinc-400">
                              Low Stock Alert
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={option.low_stock_threshold}
                                onChange={(e) =>
                                  updateOption(
                                    index,
                                    "low_stock_threshold",
                                    e.target.value
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
                  Existing items remain unchanged
                </span>
                <div className="ml-auto flex gap-2.5">
                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving}
                    className="min-h-[42px] rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-55"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    <span>
                      {editingTemplate ? "Save Changes" : "Create Template"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
