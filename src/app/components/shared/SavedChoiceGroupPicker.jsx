"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
    Check,
    Copy,
    Layers3,
    Library,
    Loader2,
    Plus,
    Search,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { getChoiceGroupTemplates } from "@/app/lib/menuApi";
import { templateToChoiceGroupSnapshot } from "@/app/lib/choiceGroupTemplates";

export default function SavedChoiceGroupPicker({ existingGroups = [], onAdd }) {
    const { vendorProfile } = useVendorProfile();
    const vendorId = vendorProfile?._id || vendorProfile?.id;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");

    const existingTemplateIds = useMemo(
        () => new Set(existingGroups.map((group) => String(group.source_template_id || "")).filter(Boolean)),
        [existingGroups]
    );

    const openPicker = async () => {
        setOpen(true);
        if (!vendorId) return;
        setLoading(true);
        try {
            const data = await getChoiceGroupTemplates(vendorId);
            setTemplates(data.templates || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Could not load saved groups");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return templates;
        return templates.filter((template) =>
            template.name.toLowerCase().includes(query)
            || template.options.some((option) => option.label.toLowerCase().includes(query))
        );
    }, [search, templates]);

    const toggleTemplate = (templateId) => {
        if (existingTemplateIds.has(String(templateId))) return;
        setSelected((current) =>
            current.includes(templateId)
                ? current.filter((id) => id !== templateId)
                : [...current, templateId]
        );
    };

    const close = () => {
        setOpen(false);
        setSelected([]);
        setSearch("");
    };

    const addSelected = () => {
        const chosen = templates.filter((template) => selected.includes(template._id));
        chosen.forEach((template, index) => onAdd(templateToChoiceGroupSnapshot(template, index)));
        toast.success(`${chosen.length} saved group${chosen.length === 1 ? "" : "s"} copied into this item`);
        close();
    };

    return (
        <>
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 shadow-sm dark:border-orange-500/20 dark:from-orange-500/10 dark:to-zinc-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
                            <Library size={17} />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Add from Options Library</p>
                            <p className="mt-1 text-[10px] font-medium leading-5 text-zinc-500 dark:text-zinc-400">
                                Select several saved groups at once, then customize their copied prices or rules here.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={openPicker} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-orange-600 dark:bg-white dark:text-zinc-950 dark:hover:bg-orange-500 dark:hover:text-white">
                        <Layers3 size={13} /> Browse saved groups
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 18 }} className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                            <div className="flex items-center justify-between bg-zinc-950 px-5 py-4 text-white">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-400">Copy-on-select</p>
                                    <h3 className="mt-1 text-base font-black">Choose saved groups</h3>
                                </div>
                                <button type="button" onClick={close} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={15} /></button>
                            </div>

                            <div className="border-b border-zinc-100 p-4 dark:border-white/8">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups or options..." className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-[11px] font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/8 dark:bg-zinc-950 dark:text-white" />
                                </div>
                                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[9px] font-bold leading-4 text-amber-800 dark:bg-amber-500/5 dark:text-amber-300">
                                    <Copy size={13} className="mt-0.5 shrink-0" />
                                    Future library edits will not change the copy added to this item.
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="flex min-h-56 items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                                        <Library size={30} className="text-zinc-300" strokeWidth={1.5} />
                                        <p className="mt-4 text-[12px] font-black text-zinc-900 dark:text-white">No saved groups found</p>
                                        <p className="mt-2 text-[10px] font-medium leading-5 text-zinc-500">Create reusable groups in your Options Library, then return here.</p>
                                        <Link href="/vendors/options-library" className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-orange-600 px-3 text-[8px] font-black uppercase tracking-widest text-white"><Plus size={12} /> Open library</Link>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {filtered.map((template) => {
                                            const alreadyAdded = existingTemplateIds.has(String(template._id));
                                            const isSelected = selected.includes(template._id);
                                            return (
                                                <button key={template._id} type="button" disabled={alreadyAdded} onClick={() => toggleTemplate(template._id)} className={`rounded-2xl border p-4 text-left transition ${alreadyAdded ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-55 dark:border-white/8 dark:bg-zinc-950" : isSelected ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500/10 dark:bg-orange-500/10" : "border-zinc-200 bg-white hover:border-orange-300 dark:border-white/8 dark:bg-zinc-950"}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[11px] font-black text-zinc-900 dark:text-white">{template.name}</p>
                                                            <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-zinc-400">{template.options.length} options · Pick {template.min_selections}–{template.max_selections}</p>
                                                        </div>
                                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected || alreadyAdded ? "border-orange-600 bg-orange-600 text-white" : "border-zinc-300 text-transparent"}`}><Check size={11} /></span>
                                                    </div>
                                                    <p className="mt-3 line-clamp-2 text-[9px] font-medium leading-4 text-zinc-500">{template.options.map((option) => option.label).join(" · ")}</p>
                                                    {alreadyAdded && <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-orange-600">Already added</p>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-white p-4 dark:border-white/8 dark:bg-zinc-900">
                                <Link href="/vendors/options-library" className="text-[8px] font-black uppercase tracking-widest text-zinc-500 hover:text-orange-600">Manage library</Link>
                                <button type="button" onClick={addSelected} disabled={selected.length === 0} className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40">
                                    <Plus size={13} /> Add {selected.length || ""} selected
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
