"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Check,
  Copy,
  Edit3,
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
  options: [{ label: "", price_modifier_naira: 0, image_url: "", is_available: true, track_stock: false, stock_quantity: 0, low_stock_threshold: 5 }],
};

const templateToForm = (template) => ({
  name: template.name,
  is_required: template.is_required,
  min_selections: template.min_selections,
  max_selections: template.max_selections,
  options: template.options.map((option) => ({
    label: option.label,
    price_modifier_naira: option.price_modifier_naira || 0,
    image_url: option.image_url || null,
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
      toast.error(error?.response?.data?.message || "Could not load your options library");
    } finally {
      setLoading(false);
    }
  }, [archived, vendorId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      template.name.toLowerCase().includes(query)
      || template.options.some((option) => option.label.toLowerCase().includes(query))
    );
  }, [search, templates]);

  const openCreate = (starter = null) => {
    setEditingTemplate(null);
    setForm(starter ? {
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
    } : emptyForm);
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
      options: [...current.options, { label: "", price_modifier_naira: 0, image_url: "", is_available: true, track_stock: false, stock_quantity: 0, low_stock_threshold: 5 }],
    }));
  };

  const removeOption = (index) => {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  };

  const handleSave = async () => {
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
        stock_quantity: option.track_stock ? Math.max(0, Number(option.stock_quantity) || 0) : 0,
        low_stock_threshold: Math.max(0, Number(option.low_stock_threshold) || 0),
        sort_order: index,
      })),
    };

    if (!payload.name) return toast.error("Enter a template name");
    if (payload.options.some((option) => !option.label)) return toast.error("Every option needs a name");
    if (payload.options.length === 0) return toast.error("Add at least one option");
    if (payload.max_selections < payload.min_selections) {
      return toast.error("Maximum selections cannot be lower than minimum selections");
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        const result = await updateChoiceGroupTemplate(vendorId, editingTemplate._id, payload);
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
      toast.error(error?.response?.data?.message || "Could not save template");
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
      toast.error(error?.response?.data?.message || "Could not duplicate template");
    }
  };

  const handleArchive = async (template) => {
    try {
      const result = await archiveChoiceGroupTemplate(vendorId, template._id, !archived);
      toast.success(result.message);
      await loadTemplates();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update template");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-14 dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
        <section className="relative overflow-hidden rounded-[28px] bg-zinc-950 px-5 py-8 text-white shadow-2xl sm:px-8 lg:px-10">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orange-500/20 blur-[90px]" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">
                <Sparkles size={12} /> Reusable menu tools
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Options Library</h1>
              <p className="mt-3 text-sm font-medium leading-7 text-zinc-400">
                Create choice groups once and reuse them across foods and combos. Updates, availability, and stock stay in sync everywhere.
              </p>
            </div>
            <button onClick={() => openCreate()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 active:scale-[0.98]">
              <Plus size={15} /> New template
            </button>
          </div>
        </section>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex gap-3">
            <Copy size={17} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Copy-on-select protection</p>
              <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-600 dark:text-zinc-400">
                Changes to a template only apply when it is added to a new menu item. Existing foods and combos will not be updated.
              </p>
            </div>
          </div>
        </div>

        {!archived && templates.length === 0 && !loading && (
          <section className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Quick starters</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {STARTERS.map((starter) => (
                <button key={starter.name} onClick={() => openCreate(starter)} className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-xl dark:border-white/8 dark:bg-zinc-900/70 dark:hover:border-orange-500/30">
                  <SlidersHorizontal size={17} className="text-orange-600" />
                  <p className="mt-4 text-sm font-black text-zinc-950 dark:text-white">{starter.name}</p>
                  <p className="mt-2 text-[10px] font-medium leading-5 text-zinc-500">{starter.options.join(" · ")}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-white/8 dark:bg-zinc-900/70">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups or options..." className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-[11px] font-bold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/8 dark:bg-zinc-950 dark:text-white" />
            </div>
            <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
              <button onClick={() => setArchived(false)} className={`h-9 flex-1 rounded-lg px-4 text-[9px] font-black uppercase tracking-widest transition ${!archived ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white" : "text-zinc-500"}`}>Active</button>
              <button onClick={() => setArchived(true)} className={`h-9 flex-1 rounded-lg px-4 text-[9px] font-black uppercase tracking-widest transition ${archived ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white" : "text-zinc-500"}`}>Archived</button>
            </div>
            <button onClick={loadTemplates} className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 px-4 text-zinc-500 transition hover:text-orange-600 dark:border-white/8"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>
          ) : visibleTemplates.length === 0 ? (
            <div className="mt-4 flex min-h-72 flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-zinc-200 bg-white/50 px-6 text-center dark:border-white/8 dark:bg-zinc-900/30">
              <Layers3 size={34} className="text-zinc-300" strokeWidth={1.5} />
              <h2 className="mt-4 text-base font-black text-zinc-900 dark:text-white">{archived ? "No archived templates" : "Your library is ready for its first group"}</h2>
              <p className="mt-2 max-w-md text-[11px] font-medium leading-5 text-zinc-500">{archived ? "Templates you archive will appear here and can be restored." : "Create reusable proteins, swallows, drinks, sauces, toppings, and other customer choices."}</p>
              {!archived && <button onClick={() => openCreate()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-[9px] font-black uppercase tracking-widest text-white"><Plus size={13} /> Create template</button>}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template) => (
                <motion.article layout key={template._id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 dark:border-white/8 dark:bg-zinc-900/70 dark:hover:border-orange-500/30">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-[14px] font-black text-zinc-950 dark:text-white">{template.name}</h2>
                        <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-orange-600">{template.is_required ? "Required by default" : "Optional by default"} · Pick {template.min_selections}–{template.max_selections}</p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:bg-white/5">{template.options.length} options</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {template.options.slice(0, 6).map((option) => (
                        <span key={option._id || option.label} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[8px] font-bold text-zinc-600 dark:border-white/8 dark:bg-zinc-950 dark:text-zinc-400">
                          {option.label}{option.price_modifier_naira > 0 ? ` +₦${option.price_modifier_naira.toLocaleString()}` : ""}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-white/8">
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Used by {template.usage?.total || 0} items</p>
                      <div className="flex gap-1.5">
                        {!archived && <button title="Edit template" onClick={() => openEdit(template)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-orange-300 hover:text-orange-600 dark:border-white/8"><Edit3 size={13} /></button>}
                        {!archived && <button title="Duplicate template" onClick={() => handleDuplicate(template)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-orange-300 hover:text-orange-600 dark:border-white/8"><Copy size={13} /></button>}
                        <button title={archived ? "Restore template" : "Archive template"} onClick={() => handleArchive(template)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-white/8">{archived ? <RefreshCw size={13} /> : <Archive size={13} />}</button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEditor} className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 18 }} className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-950 px-5 py-4 text-white dark:border-white/8">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-400">Options Library</p>
                  <h2 className="mt-1 text-base font-black">{editingTemplate ? "Edit template" : "Create template"}</h2>
                </div>
                <button onClick={closeEditor} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"><X size={15} /></button>
              </div>

              <div className="overflow-y-auto p-5">
                {editingTemplate && (
                  <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300">
                    Editing this template will not update the {editingTemplate.usage?.total || 0} existing items that copied it.
                  </div>
                )}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Group name</label>
                  <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="e.g. Add Protein" className="mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[12px] font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/8 dark:bg-zinc-950 dark:text-white" />
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl bg-zinc-50 p-4 sm:grid-cols-3 dark:bg-zinc-950/70">
                  <label className="flex items-center justify-between gap-3 sm:col-span-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Required</span>
                    <input type="checkbox" checked={form.is_required} onChange={(event) => {
                      setField("is_required", event.target.checked);
                      if (event.target.checked && Number(form.min_selections) < 1) setField("min_selections", 1);
                    }} className="h-4 w-4 accent-orange-600" />
                  </label>
                  <label>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Minimum</span>
                    <input type="number" min="0" value={form.min_selections} onChange={(event) => setField("min_selections", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black dark:border-white/8 dark:bg-zinc-900 dark:text-white" />
                  </label>
                  <label>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Maximum</span>
                    <input type="number" min="1" value={form.max_selections} onChange={(event) => setField("max_selections", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black dark:border-white/8 dark:bg-zinc-900 dark:text-white" />
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Options</p>
                    <p className="mt-1 text-[9px] font-medium text-zinc-500">Set the default price. It can be edited after copying.</p>
                  </div>
                  <button onClick={addOption} className="inline-flex h-9 items-center gap-2 rounded-lg bg-orange-50 px-3 text-[8px] font-black uppercase tracking-widest text-orange-600 dark:bg-orange-500/10"><Plus size={12} /> Add option</button>
                </div>
                <div className="mt-3 space-y-2">
                  {form.options.map((option, index) => (
                    <div key={index} className="grid grid-cols-[1fr_110px_36px] gap-2 rounded-xl border border-zinc-200 p-2 dark:border-white/8">
                      <input value={option.label} onChange={(event) => updateOption(index, "label", event.target.value)} placeholder="Option name" className="h-10 min-w-0 rounded-lg bg-zinc-50 px-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-zinc-950 dark:text-white" />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-600">₦</span>
                        <input type="number" min="0" value={option.price_modifier_naira} onChange={(event) => updateOption(index, "price_modifier_naira", event.target.value)} className="h-10 w-full rounded-lg bg-zinc-50 pl-6 pr-2 text-[11px] font-black tabular-nums outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-zinc-950 dark:text-white" />
                      </div>
                      <button disabled={form.options.length === 1} onClick={() => removeOption(index)} className="flex h-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-500/10"><Trash2 size={14} /></button>
                      <input type="url" value={option.image_url || ""} onChange={(event) => updateOption(index, "image_url", event.target.value)} placeholder="Thumbnail URL (optional)" className="col-span-3 h-10 min-w-0 rounded-lg bg-zinc-50 px-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-zinc-950 dark:text-white" />
                      <label className="col-span-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-950"><input type="checkbox" checked={option.is_available !== false} onChange={(event) => updateOption(index, "is_available", event.target.checked)} className="accent-orange-600" /> Available to customers</label>
                      <label className="col-span-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-950"><input type="checkbox" checked={option.track_stock === true} onChange={(event) => updateOption(index, "track_stock", event.target.checked)} className="accent-orange-600" /> Set default stock when copied</label>
                      {option.track_stock && <div className="col-span-3 grid grid-cols-2 gap-2"><label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Available<input type="number" min="0" step="1" value={option.stock_quantity} onChange={(event) => updateOption(index, "stock_quantity", event.target.value)} className="mt-1 h-9 w-full rounded-lg bg-zinc-50 px-3 text-[11px] font-black outline-none dark:bg-zinc-950 dark:text-white" /></label><label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Low stock at<input type="number" min="0" step="1" value={option.low_stock_threshold} onChange={(event) => updateOption(index, "low_stock_threshold", event.target.value)} className="mt-1 h-9 w-full rounded-lg bg-zinc-50 px-3 text-[11px] font-black outline-none dark:bg-zinc-950 dark:text-white" /></label></div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-white p-4 dark:border-white/8 dark:bg-zinc-900">
                <p className="hidden text-[8px] font-black uppercase tracking-widest text-zinc-400 sm:block">Existing items remain unchanged</p>
                <div className="ml-auto flex gap-2">
                  <button onClick={closeEditor} disabled={saving} className="h-11 rounded-xl border border-zinc-200 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:border-white/8">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 disabled:opacity-60">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {editingTemplate ? "Save changes" : "Create template"}
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
