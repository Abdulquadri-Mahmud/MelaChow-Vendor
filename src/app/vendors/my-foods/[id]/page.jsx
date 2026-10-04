"use client";

import "@/app/components/vendor-workspace/vendor-workspace.css";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getMenuItemDetail, getPlatformCategories, getVendorSections,
    updateMenuItem, addPortion, updatePortion, deleteMenuItemPortion,
    addChoiceGroup, updateChoiceGroup, deleteChoiceGroup,
    addChoiceOption, updateChoiceOption, deleteChoiceOption,
    toggleMenuItemAvailability, archiveMenuItem,
    addVariantSwapGroup, addVariantChoiceOption,
    updateVariant
} from "@/app/lib/menuApi";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { useParams, useRouter } from "next/navigation";
import { Plus, Tag, Clock, ChefHat, Leaf, FolderOpen, LayoutGrid, Edit2, Package, RefreshCw, Zap, Info, ChevronDown, ChevronUp, ImageIcon, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import BackButton from "@/app/components/BackButton";
import SavedChoiceGroupPicker from "@/app/components/shared/SavedChoiceGroupPicker";

const ITEM_TYPE_META = {
    FOOD:    { emoji: "🍽️", label: "Food" },
    DRINK:   { emoji: "🥤", label: "Drink" },
    SOUP:    { emoji: "🥘", label: "Soup" },
    SWALLOW: { emoji: "🫓", label: "Swallow" },
    PROTEIN: { emoji: "🍗", label: "Protein" },
    SIDE:    { emoji: "🍟", label: "Side" },
    DESSERT: { emoji: "🍰", label: "Dessert" },
    OTHER:   { emoji: "🍴", label: "Other" },
};

const GROUP_TITLE_PRESETS = {
    "Protein & Meat": ["Choose your protein", "Choose your meat cut", "Choose your fish type", "Choose your suya cut"],
    "Swallows & Soups": ["Choose your swallow", "Choose your soup", "Soup or stew?"],
    "Rice & Pasta": ["Choose your rice type", "Choose your pasta type"],
    "Sides": ["Choose your side", "Add a side dish", "Plantain or chips?"],
    "Sauce & Spice": ["Choose your sauce", "Spice level", "How spicy?"],
    "Drinks": ["Add a drink", "Choose your drink"],
    "Extras & Toppings": ["Add toppings", "Add proteins", "Add extras", "Add-ons"],
    "Packaging & Requests": ["Packaging preference", "Any special requests?"],
};

const DIETARY_COLORS = {
    veg: "bg-green-100  text-green-700 ",
    vegan: "bg-emerald-100  text-emerald-700 ",
    halal: "bg-teal-100  text-teal-700 ",
    kosher: "bg-blue-100  text-blue-700 ",
    "non-veg": "bg-red-100  text-red-700 ",
    mixed: "bg-zinc-100  text-zinc-500 ",
};

const DietaryBadge = ({ type }) => (
    <span className={`text-xs px-3 py-1 rounded-full font-semibold normal-case tracking-normal border ${DIETARY_COLORS[type] || DIETARY_COLORS.mixed} transition-all`}>
        {type || "mixed"}
    </span>
);

const SectionCard = ({ title, action, children, className = "" }) => (
    <div className={`mc-section bg-white  border border-zinc-200  rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md ${className}`}>
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-zinc-100  bg-zinc-50/50  backdrop-blur-sm">
            <h3 className="text-xs font-semibold normal-case tracking-normal text-zinc-500  font-sans">{title}</h3>
            <div className="flex items-center gap-2">
                {action}
            </div>
        </div>
        <div className="p-2">{children}</div>
    </div>
);

const ManagementModal = ({ isOpen, onClose, title, children, footer }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="mc-workspace mc-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-2">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    role="dialog" aria-modal="true" aria-label={title} className="mc-dialog relative w-full max-w-xl bg-white  rounded-3xl shadow-2xl border border-zinc-200  overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="px-8 py-6 border-b border-zinc-100  flex items-center justify-between bg-zinc-50/50 ">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900  tracking-tight">{title}</h2>
                            <div className="w-8 h-1 bg-orange-500 rounded-full mt-1" />
                        </div>
                        <button aria-label="Close editor" onClick={onClose} className="w-10 h-10 rounded-full bg-white  border border-zinc-200  flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-all active:scale-90">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
                        {children}
                    </div>
                    {footer && (
                        <div className="px-8 py-5 bg-zinc-50/80  border-t border-zinc-100  flex items-center justify-end gap-3 font-sans">
                            {footer}
                        </div>
                    )}
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const buildCategoryTree = (flatCategories) => {
    const roots = [];
    const childrenMap = {};
    flatCategories.forEach(cat => {
        const parentId = cat.parent?._id || null;
        if (!parentId) {
            roots.push({ ...cat, subCategories: [] });
        } else {
            if (!childrenMap[parentId]) childrenMap[parentId] = [];
            childrenMap[parentId].push(cat);
        }
    });
    return roots.map(root => ({
        ...root,
        subCategories: childrenMap[root._id] || [],
    })).filter(root => root.subCategories.length > 0);
};

const BasicInfoSection = ({ item, vendorId, itemId, queryClient }) => {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});
    const [tagInput, setTagInput] = useState("");

    const openEdit = () => {
        setForm({
            name: item.name, description: item.description || "", image_url: item.image_url || "",
            item_type: item.item_type || "FOOD", dietary_type: item.dietary_type || "mixed",
            prep_time_minutes: item.prep_time_minutes || "", tags: item.tags || [],
        });
        setTagInput("");
        setEditing(true);
    };

    const handleSave = async () => {
        if (!form.name?.trim()) return toast.error("Name is required");
        setSaving(true);
        try {
            await updateMenuItem(vendorId, itemId, {
                name: form.name.trim(), description: form.description.trim() || null,
                image_url: form.image_url.trim() || null, item_type: form.item_type,
                dietary_type: form.dietary_type, prep_time_minutes: form.prep_time_minutes ? Number(form.prep_time_minutes) : null,
                tags: form.tags,
            });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            queryClient.invalidateQueries({ queryKey: ["vendor-foods", vendorId] });
            setEditing(false);
            toast.success("Basic info updated");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Could not save");
        } finally {
            setSaving(false);
        }
    };

    const addTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (!t || form.tags.includes(t)) { setTagInput(""); return; }
        setForm({ ...form, tags: [...form.tags, t] });
        setTagInput("");
    };
    const removeTag = (t) => setForm({ ...form, tags: form.tags.filter(x => x !== t) });

    const typeMeta = ITEM_TYPE_META[item.item_type] || ITEM_TYPE_META.FOOD;

    const DIETARY_OPTIONS = ["mixed","veg","vegan","halal","kosher","non-veg"];
    const TYPE_OPTIONS = ["FOOD","DRINK","SIDE","PROTEIN","SWALLOW","SOUP","DESSERT","OTHER"];

    return (
        <>
            <SectionCard title="Basic Info" action={<button onClick={openEdit} className="h-9 px-5 rounded-xl border border-zinc-200  bg-white  text-sm font-semibold normal-case tracking-normal text-zinc-500 hover:text-orange-500 hover:border-orange-200 transition-all active:scale-95 shadow-sm">Edit Details</button>}>
                <div className="space-y-6">
                    {/* Image + description row */}
                    <div className="flex gap-5 items-start">
                        <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-zinc-100  border-2 border-white  shadow-lg group relative">
                            {item.image_url
                                ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-zinc-50 to-zinc-100  ">{typeMeta.emoji}</div>}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold normal-case tracking-normal text-zinc-500">Description</span>
                                <div className="h-px flex-1 bg-zinc-100  opacity-50" />
                            </div>
                            <p className="text-sm font-medium text-zinc-600  leading-relaxed italic line-clamp-3">
                                &ldquo;{item.description || "No public description provided. We recommend adding one to help customers decide."}&rdquo;
                            </p>
                        </div>
                    </div>

                    {/* Meta chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-zinc-50  rounded-xl border border-zinc-100  flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white  shadow-sm flex items-center justify-center text-orange-500">
                                <ChefHat size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold normal-case tracking-normal text-zinc-500 mb-0.5">Item type</p>
                                <p className="text-xs font-semibold text-zinc-800  normal-case">{typeMeta.label}</p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-zinc-50  rounded-xl border border-zinc-100  flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white  shadow-sm flex items-center justify-center text-emerald-500">
                                <Leaf size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold normal-case tracking-normal text-zinc-500 mb-1">Dietary preference</p>
                                <DietaryBadge type={item.dietary_type} />
                            </div>
                        </div>

                        {item.prep_time_minutes && (
                            <div className="p-3.5 bg-zinc-50  rounded-xl border border-zinc-100  flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white  shadow-sm flex items-center justify-center text-blue-500">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold normal-case tracking-normal text-zinc-500 mb-0.5">Preparation time</p>
                                    <p className="text-xs font-semibold text-zinc-800 ">{item.prep_time_minutes} MIN</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {item.tags?.length > 0 && (
                        <div className="pt-4 border-t border-zinc-100  flex flex-wrap gap-2">
                             {item.tags.map(t => (
                                <span key={t} className="px-3 py-1 rounded-lg bg-white  border border-zinc-200  text-sm font-semibold text-zinc-500  normal-case tracking-tight">#{t}</span>
                            ))}
                        </div>
                    )}
                </div>
            </SectionCard>

            <ManagementModal 
                isOpen={editing} 
                onClose={() => setEditing(false)} 
                title="Edit item details"
                footer={
                    <>
                        <button onClick={() => setEditing(false)} className="px-6 py-2.5 text-xs font-semibold text-zinc-500 normal-case tracking-normal hover:text-zinc-800 transition-colors">Discard</button>
                        <button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8 rounded-xl font-semibold text-sm normal-case tracking-normal flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} className="fill-current" />} Save changes
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-full">
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Item name</label>
                            <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-900  font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" placeholder="e.g. Jollof Rice" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Item type</label>
                            <select className="h-12 px-3 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold focus:border-orange-500 outline-none transition-all" value={form.item_type} onChange={e => setForm({ ...form, item_type: e.target.value })}>
                                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{ITEM_TYPE_META[t]?.emoji} {ITEM_TYPE_META[t]?.label || t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Dietary preference</label>
                            <select className="h-12 px-3 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold focus:border-orange-500 outline-none transition-all" value={form.dietary_type} onChange={e => setForm({ ...form, dietary_type: e.target.value })}>
                                {DIETARY_OPTIONS.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Photo URL (optional)</label>
                        <div className="flex gap-3">
                            <input className="h-12 px-4 flex-1 rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-700  text-sm font-medium focus:border-orange-500 outline-none transition-all" placeholder="https://..." value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                            {form.image_url && <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200  bg-white"><img alt="Item photo preview" src={form.image_url} className="w-full h-full object-cover" /></div>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Description</label>
                        <textarea rows={4} className="p-2 w-full rounded-2xl border bg-zinc-50  border-zinc-200  text-zinc-700  font-medium leading-relaxed focus:border-orange-500 outline-none transition-all resize-none" placeholder="Details for customers..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-5 items-end">
                        <div>
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Prep Threshold (Min)</label>
                            <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold focus:border-orange-500 outline-none transition-all" type="number" value={form.prep_time_minutes} onChange={e => setForm({ ...form, prep_time_minutes: e.target.value })} />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Search Keywords</label>
                             <div className="flex gap-2">
                                <input className="h-12 px-4 flex-1 rounded-xl border bg-zinc-50  border-zinc-200  text-sm font-bold focus:border-orange-500 outline-none" placeholder="Press Enter" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                                <button onClick={addTag} className="w-12 h-12 rounded-xl bg-zinc-200  flex items-center justify-center text-zinc-600 "><Plus size={18}/></button>
                             </div>
                        </div>
                    </div>
                    {form.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {form.tags.map(t => (
                                <span key={t} className="flex items-center gap-1.5 h-8 px-4 rounded-full bg-zinc-100  text-sm font-semibold text-zinc-600  border border-zinc-200  normal-case tracking-tight">
                                    {t} <X size={12} onClick={() => removeTag(t)} className="cursor-pointer hover:text-orange-500" />
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </ManagementModal>
        </>
    );
};

const CategorySection = ({ item, vendorId, itemId, queryClient, allSections }) => {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});
    const [categoryTree, setCategoryTree] = useState([]);
    const [editSections, setEditSections] = useState([]);

    useEffect(() => {
        if (!editing) return;
        getPlatformCategories().then(r => setCategoryTree(buildCategoryTree(r.categories || [])));
        getVendorSections(vendorId).then(r => setEditSections(r.sections || []));
    }, [editing, vendorId]);

    const catId = item.platform_category?.id || item.platform_category?._id || item.platform_category_id;
    const sectionId = item.vendor_section_id;
    const sectionName = allSections.find(s => s._id === sectionId)?.name;

    const openEdit = () => {
        setForm({
            platform_category_id: catId || null,
            platform_category_label: item.platform_category?.name || null,
            vendor_section_id: sectionId || null,
            activeRootId: null
        });
        setEditing(true);
    };

    const handleSave = async () => {
        if (!form.platform_category_id) return toast.error("Please select a food category");
        setSaving(true);
        try {
            await updateMenuItem(vendorId, itemId, { platform_category_id: form.platform_category_id, vendor_section_id: form.vendor_section_id || null });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            queryClient.invalidateQueries({ queryKey: ["vendor-foods", vendorId] });
            setEditing(false);
            toast.success("Category updated");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Could not save");
        } finally {
            setSaving(false);
        }
    };

    const cat = item.platform_category;

    return (
        <>
            <SectionCard title="Category & Section" action={<button onClick={openEdit} className="h-9 px-5 rounded-xl border border-zinc-200  bg-white  text-sm font-semibold normal-case tracking-normal text-zinc-500 hover:text-orange-500 hover:border-orange-200 transition-all active:scale-95 shadow-sm">Change Section</button>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    <div className="p-2 bg-zinc-50  rounded-xl border border-zinc-100  group hover:border-orange-200 transition-colors">
                        <div className="text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 flex items-center gap-2"><div className="w-1 h-3 bg-orange-500 rounded-full" /> App Category</div>
                        {cat ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {cat.parent && (
                                    <span className="text-sm font-semibold text-zinc-500 normal-case tracking-normal">{cat.parent.name} /</span>
                                )}
                                <span className="text-sm font-semibold text-zinc-800 ">{cat.name}</span>
                            </div>
                        ) : <p className="text-xs font-medium text-zinc-500 italic">No app category assigned.</p>}
                    </div>

                    <div className="p-2 bg-zinc-50  rounded-xl border border-zinc-100  group hover:border-emerald-200 transition-colors">
                        <div className="text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 flex items-center gap-2"><div className="w-1 h-3 bg-emerald-500 rounded-full" /> Stock Section</div>
                        {sectionName ? (
                            <div className="flex items-center gap-2">
                                <FolderOpen size={16} className="text-emerald-500" />
                                <span className="text-sm font-semibold text-zinc-800  normal-case tracking-tight">{sectionName}</span>
                            </div>
                        ) : <p className="text-xs font-medium text-zinc-500 italic">No store section assigned.</p>}
                    </div>
                </div>
            </SectionCard>

            <ManagementModal 
                isOpen={editing} 
                onClose={() => setEditing(false)} 
                title="Categorization"
                footer={
                    <>
                        <button onClick={() => setEditing(false)} className="px-6 py-2.5 text-xs font-semibold text-zinc-500 normal-case tracking-normal hover:text-zinc-800 transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8 rounded-xl font-semibold text-sm normal-case tracking-normal flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-orange-500/20">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Update Placement
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 ml-1">Platform Item type</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                            {categoryTree.map(root => (
                                <div key={root._id} className="space-y-2 mb-3">
                                    <p className="text-xs font-semibold text-zinc-500 normal-case tracking-normal border-b border-zinc-100  pb-1">{root.name}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {root.subCategories.map(sub => (
                                            <button 
                                                key={sub._id} 
                                                onClick={() => setForm({ ...form, platform_category_id: sub._id, platform_category_label: sub.name })}
                                                className={`p-3 rounded-xl border text-sm font-semibold text-left transition-all ${form.platform_category_id === sub._id ? "border-orange-500 bg-orange-50 text-orange-600 " : "border-zinc-100  bg-white  text-zinc-600 hover:border-orange-200"}`}
                                            >
                                                {sub.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-zinc-100 ">
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 ml-1">In-Store Section</label>
                        <div className="grid grid-cols-2 gap-2">
                            {editSections.map(s => (
                                <button 
                                    key={s._id} 
                                    onClick={() => setForm({ ...form, vendor_section_id: s._id })}
                                    className={`p-3 rounded-xl border text-sm font-semibold text-left transition-all ${form.vendor_section_id === s._id ? "border-emerald-500 bg-emerald-50 text-emerald-600 " : "border-zinc-100  bg-white  text-zinc-600 hover:border-emerald-200"}`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </ManagementModal>
        </>
    );
};

const PortionsSection = ({ item, vendorId, itemId, queryClient }) => {
    const [editingPortionId, setEditingPortionId] = useState(null);
    const [portionForm, setPortionForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPortion, setSelectedPortion] = useState(null);

    const openEdit = (p) => {
        setSelectedPortion(p);
        setPortionForm({ label: p.label, price_naira: p.price_naira, is_default: p.is_default, max_quantity: p.max_quantity || "", track_stock: p.track_stock === true, stock_quantity: p.stock_quantity ?? 0, low_stock_threshold: p.low_stock_threshold ?? 5 });
        setIsEditModalOpen(true);
    };

    const handleSave = async () => {
        if (!portionForm.price_naira || Number(portionForm.price_naira) <= 0) return toast.error("Price must be > 0");
        setSaving(true);
        try {
            await updatePortion(vendorId, itemId, selectedPortion._id, { label: portionForm.label.trim(), price: Math.round(Number(portionForm.price_naira) * 100), is_default: portionForm.is_default, max_quantity: portionForm.max_quantity ? parseInt(portionForm.max_quantity, 10) : null, track_stock: portionForm.track_stock === true, stock_quantity: portionForm.track_stock ? Math.max(0, Number(portionForm.stock_quantity) || 0) : 0, low_stock_threshold: Math.max(0, Number(portionForm.low_stock_threshold) || 0) });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            setIsEditModalOpen(false);
            toast.success("Size updated");
        } catch (err) { toast.error(err?.response?.data?.message || "Error saving"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (pId) => {
        if (item.portions.length <= 1) return toast.error("Cannot delete the only size.");
        try {
            await deleteMenuItemPortion(vendorId, itemId, pId);
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            toast.success("Size removed");
        } catch (err) { toast.error(err?.response?.data?.message || "Error deleting"); }
    };

    const [showAdd, setShowAdd] = useState(false);
    const [newPortion, setNewPortion] = useState({ label: "", price_naira: "", max_quantity: "" });

    const handleAdd = async () => {
        if (!newPortion.label.trim()) return toast.error("Label required");
        if (!newPortion.price_naira || Number(newPortion.price_naira) <= 0) return toast.error("Price must be > 0");
        setAdding(true);
        try {
            await addPortion(vendorId, itemId, { label: newPortion.label.trim(), price: Math.round(Number(newPortion.price_naira) * 100), is_default: item.portions.length === 0, sort_order: item.portions.length, max_quantity: newPortion.max_quantity ? parseInt(newPortion.max_quantity, 10) : null });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            setShowAdd(false); setNewPortion({ label: "", price_naira: "", max_quantity: "" });
            toast.success("Size added");
        } catch (err) { toast.error(err?.response?.data?.message || "Error adding"); }
        finally { setAdding(false); }
    };

    return (
        <>
            <SectionCard title="Portions & Pricing" action={<button onClick={() => setShowAdd(true)} className="h-9 px-4 rounded-xl border border-zinc-200  bg-white  text-sm font-semibold normal-case tracking-normal text-orange-500 hover:text-orange-600 transition-colors active:scale-95 shadow-sm">+ Add Size</button>}>
                <div className="space-y-3 mt-1">
                    {item.portions?.map(p => (
                        <div key={p._id} className="p-2 bg-zinc-50  rounded-2xl border border-zinc-100  flex items-center justify-between gap-2 group transition-all hover:border-orange-200 hover:bg-white ">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-0.5">Size/Portion</span>
                                    <span className="text-sm font-semibold text-zinc-800  leading-tight">{p.label}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-0.5">Price</span>
                                    <span className="text-base font-semibold text-orange-600 ">₦{p.price_naira?.toLocaleString()}</span>
                                </div>                                 {p.track_stock && <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold normal-case tracking-normal px-2 py-0.5 rounded-xl">{p.stock_quantity ?? 0} left</span>}
                                 {p.is_default && (
                                     <span className="text-xs bg-indigo-500 text-white font-semibold normal-case tracking-normal px-2 py-0.5 rounded-xl">Primary</span>
                                 )}
                            </div>
                            <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => openEdit(p)} className="h-8 px-4 rounded-lg bg-white  border border-zinc-200  text-sm font-semibold normal-case text-zinc-500 hover:text-orange-500 hover:border-orange-200">Manage</button>
                                <button onClick={() => handleDelete(p._id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50"><X size={14} strokeWidth={3}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* EDIT SIZE MODAL */}
            <ManagementModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                title={`Manage Size: ${selectedPortion?.label}`}
                footer={
                    <>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-xs font-semibold text-zinc-500 normal-case tracking-normal">Discard</button>
                        <button onClick={handleSave} disabled={saving} className="bg-zinc-900  text-white  h-11 px-8 rounded-xl font-semibold text-sm normal-case tracking-normal flex items-center justify-center gap-2">
                             {saving && <Loader2 size={14} className="animate-spin" />} Apply Changes
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-full">
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Size Label</label>
                            <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-900  font-bold outline-none focus:border-orange-500" value={portionForm.label} onChange={e => setPortionForm({ ...portionForm, label: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Price (₦)</label>
                            <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-900  font-semibold text-orange-600 outline-none focus:border-orange-500" type="number" value={portionForm.price_naira} onChange={e => setPortionForm({ ...portionForm, price_naira: e.target.value })} />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Daily Cap (Qty)</label>
                             <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold outline-none focus:border-orange-500" type="number" value={portionForm.max_quantity} onChange={e => setPortionForm({ ...portionForm, max_quantity: e.target.value })} />
                        </div>
                    </div>
                    <label className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50  border border-zinc-100  cursor-pointer">
                        <span>
                            <span className="block text-xs font-semibold text-zinc-800 ">Track stock</span>
                            <span className="block text-sm font-medium text-zinc-500">Stop selling this size when it reaches zero.</span>
                        </span>
                        <input
                            type="checkbox"
                            className="w-5 h-5 accent-orange-500"
                            checked={portionForm.track_stock === true}
                            onChange={e => setPortionForm({ ...portionForm, track_stock: e.target.checked, stock_quantity: e.target.checked ? (portionForm.stock_quantity ?? 0) : 0 })}
                        />
                    </label>
                    {portionForm.track_stock && (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500">
                                Available quantity
                                <input min="0" type="number" className="mt-2 h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold outline-none focus:border-orange-500" value={portionForm.stock_quantity ?? ""} onChange={e => setPortionForm({ ...portionForm, stock_quantity: e.target.value })} />
                            </label>
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500">
                                Low stock at
                                <input min="0" type="number" className="mt-2 h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold outline-none focus:border-orange-500" value={portionForm.low_stock_threshold ?? ""} onChange={e => setPortionForm({ ...portionForm, low_stock_threshold: e.target.value })} />
                            </label>
                        </div>
                    )}
                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50  border border-zinc-100  cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded-lg border-zinc-300 text-orange-500 focus:ring-orange-500" checked={portionForm.is_default} onChange={e => setPortionForm({ ...portionForm, is_default: e.target.checked })} />
                        <div>
                            <p className="text-xs font-semibold text-zinc-800  normal-case tracking-tight">Primary Operational Default</p>
                            <p className="text-sm font-medium text-zinc-500">This size will be pre-selected for customers on the storefront.</p>
                        </div>
                    </label>
                </div>
            </ManagementModal>

            {/* ADD SIZE MODAL */}
            <ManagementModal 
                isOpen={showAdd} 
                onClose={() => setShowAdd(false)} 
                title="Add New Size/Portion"
                footer={
                    <button onClick={handleAdd} disabled={adding} className="bg-orange-500 text-white h-11 px-8 rounded-xl font-semibold text-sm normal-case tracking-normal shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                        {adding ? <Loader2 size={14} className="animate-spin" /> : "Create Size"}
                    </button>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Size Name</label>
                        <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-900  font-bold outline-none focus:border-orange-500" placeholder="e.g. Regular, Mega, 2L Tub" value={newPortion.label} onChange={e => setNewPortion({ ...newPortion, label: e.target.value })} autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Price (₦)</label>
                            <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-900  font-semibold text-orange-600 outline-none focus:border-orange-500" type="number" value={newPortion.price_naira} onChange={e => setNewPortion({ ...newPortion, price_naira: e.target.value })} />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Daily Cap</label>
                             <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  text-zinc-800  font-bold outline-none focus:border-orange-500" type="number" placeholder="Optional" value={portionForm.max_quantity} onChange={e => setPortionForm({ ...portionForm, max_quantity: e.target.value })} />
                        </div>
                    </div>
                </div>
            </ManagementModal>
        </>
    );
};

const AddOnsSection = ({ item, vendorId, itemId, queryClient }) => {
    // Group naming mode: preset vs custom
    const [isAddingCustomTitle, setIsAddingCustomTitle] = useState(false);
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: "", is_required: false, min_selections: 0, max_selections: 1 });
    const [groupForm, setGroupForm] = useState({});
    const [optionForm, setOptionForm] = useState({});

    // MODAL STATE
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isEditOption, setIsEditOption] = useState(false);

    const openAddGroup = () => {
        setNewGroup({ name: "", is_required: false, min_selections: 0, max_selections: 1 });
        setShowAddGroup(true);
    };

    const openEditGroup = (group) => {
        setSelectedGroup(group);
        setGroupForm({ name: group.name, is_required: group.is_required, min_selections: group.min_selections, max_selections: group.max_selections });
        setIsGroupModalOpen(true);
    };

    const openOptionModal = (group, option = null) => {
        setSelectedGroup(group);
        if (option) {
            setIsEditOption(true);
            setSelectedOption(option);
            setOptionForm({ label: option.label, price_modifier_naira: option.price_modifier_naira, image_url: option.image_url || "", is_available: option.is_available !== false, track_stock: option.track_stock === true, stock_quantity: option.stock_quantity ?? 0, low_stock_threshold: option.low_stock_threshold ?? 5 });
        } else {
            setIsEditOption(false);
            setOptionForm({ label: "", price_modifier_naira: "", image_url: "", is_available: true, track_stock: false, stock_quantity: 0, low_stock_threshold: 5 });
        }
        setIsAddOptionModalOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!groupForm.name?.trim()) return toast.error("Name required");
        const min = Number(groupForm.min_selections || 0);
        const max = Number(groupForm.max_selections || 1);
        if (min > max) return toast.error("Min picks cannot be greater than Max picks");
        const isRequired = min > 0;
        try {
            await updateChoiceGroup(vendorId, itemId, selectedGroup._id, { 
                name: groupForm.name.trim(), 
                is_required: isRequired, 
                min_selections: min, 
                max_selections: max 
            });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            setIsGroupModalOpen(false);
            toast.success("Group updated");
        } catch (err) { toast.error("Error saving group"); }
    };

    const handleAddGroup = async () => {
        if (!newGroup.name?.trim()) return toast.error("Name required");
        try {
            await addChoiceGroup(vendorId, itemId, { name: newGroup.name.trim(), is_required: newGroup.is_required, min_selections: newGroup.is_required ? 1 : 0, max_selections: 5, sort_order: item.choice_groups?.length || 0 });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            setShowAddGroup(false); setNewGroup({ name: "", is_required: false });
            toast.success("Add-on group created");
        } catch (err) { toast.error("Error adding group"); }
    };

    const handleAddSavedGroup = async (group, selectionIndex = 0) => {
        const result = await addChoiceGroup(vendorId, itemId, {
            source_template_id: group.source_template_id,
            name: group.name,
            is_required: group.is_required,
            min_selections: group.min_selections,
            max_selections: group.max_selections,
            sort_order: (item.choice_groups?.length || 0) + selectionIndex,
        });
        const groupId = result?.group?._id || result?.choiceGroup?._id || result?.id;
        if (!groupId) throw new Error("Choice group was created without an ID");
        try {
            await Promise.all((group.options || []).map((option, index) => addChoiceOption(groupId, {
                label: option.label,
                source_template_option_id: option.source_template_option_id,
                price_modifier_naira: Number(option.price_modifier_naira) || 0,
                image_url: option.image_url || null,
                is_available: option.is_available !== false,
                track_stock: option.track_stock === true,
                stock_quantity: option.track_stock ? Math.max(0, Number(option.stock_quantity) || 0) : 0,
                low_stock_threshold: Math.max(0, Number(option.low_stock_threshold) || 0),
                sort_order: index,
            })));
        } catch (error) {
            await deleteChoiceGroup(vendorId, itemId, groupId).catch(() => {});
            throw error;
        }
        await queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
    };

    const handleSaveOption = async () => {
        if (!optionForm.label?.trim()) return toast.error("Label required");
        try {
            if (isEditOption) {
                await updateChoiceOption(selectedGroup._id, selectedOption._id, { label: optionForm.label.trim(), price_modifier_naira: Number(optionForm.price_modifier_naira) || 0, image_url: optionForm.image_url?.trim() || null, is_available: optionForm.is_available !== false, track_stock: optionForm.track_stock === true, stock_quantity: optionForm.track_stock ? Math.max(0, Number(optionForm.stock_quantity) || 0) : 0, low_stock_threshold: Math.max(0, Number(optionForm.low_stock_threshold) || 0) });
                toast.success("Option updated");
            } else {
                await addChoiceOption(selectedGroup._id, { label: optionForm.label.trim(), price_modifier_naira: Number(optionForm.price_modifier_naira) || 0, image_url: optionForm.image_url?.trim() || null, is_available: optionForm.is_available !== false, track_stock: optionForm.track_stock === true, stock_quantity: optionForm.track_stock ? Math.max(0, Number(optionForm.stock_quantity) || 0) : 0, low_stock_threshold: Math.max(0, Number(optionForm.low_stock_threshold) || 0) });
                toast.success("Option added");
            }
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            setIsAddOptionModalOpen(false);
        } catch (err) { toast.error("Error saving option"); }
    };

    const handleDeleteGroup = (gId, name) => {
        toast(t => (
            <div className="flex flex-col gap-3 min-w-[240px]">
                <p className="text-sm font-semibold text-zinc-900 ">Delete &ldquo;{name}&rdquo; and all its options?</p>
                <div className="flex gap-2">
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 h-10 rounded-xl border text-xs font-bold font-sans">Cancel</button>
                    <button onClick={async () => { toast.dismiss(t.id); try { await deleteChoiceGroup(vendorId, itemId, gId); queryClient.invalidateQueries({ queryKey: ["food-item", itemId] }); toast.success("Group removed"); } catch (err) { toast.error("Error deleting group"); } }} className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-xs font-semibold normal-case tracking-normal font-sans">Delete</button>
                </div>
            </div>
        ), { duration: 6000 });
    };

    const handleDeleteOption = async (gId, optId) => {
        try {
            await deleteChoiceOption(gId, optId);
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            toast.success("Option deleted");
        } catch (err) { toast.error("Error deleting option"); }
    };

    return (
        <>
            <SectionCard title="Add-on Groups" action={<button onClick={openAddGroup} className="h-9 px-4 rounded-xl border border-zinc-200  bg-white  text-sm font-semibold normal-case tracking-normal text-orange-500 hover:text-orange-600 active:scale-95 transition-all shadow-sm">+ Add Group</button>}>
                <div className="space-y-4">
                    <SavedChoiceGroupPicker existingGroups={item.choice_groups || []} onAdd={handleAddSavedGroup} />
                    {!item.choice_groups?.length && <div className="py-10 text-center border-2 border-dashed border-zinc-100  rounded-3xl"><p className="text-sm font-medium text-zinc-500">No add-ons configured yet.</p></div>}
                    
                    {item.choice_groups?.map(g => (
                        <div key={g._id} className="p-1 rounded-[2rem] bg-white  border border-zinc-100  hover:shadow-xl transition-all duration-300">
                             <div className="flex items-center justify-between p-5 border-b border-zinc-50 ">
                                <div className="flex items-center gap-2">
                                     <div className="w-10 h-10 rounded-2xl bg-orange-50  flex items-center justify-center text-orange-500"><LayoutGrid size={20} /></div>
                                     <div>
                                         <h4 className="text-sm font-semibold text-zinc-800  normal-case tracking-tight">{g.name}</h4>
                                         <div className="flex items-center gap-2 mt-0.5">
                                             <span className={`text-xs font-semibold normal-case tracking-normal px-2 py-0.5 rounded ${g.is_required ? "bg-orange-500 text-white" : "bg-zinc-100  text-zinc-500"}`}>{g.is_required ? "Selection Required" : "Optional Addition"}</span>
                                             <span className="text-xs font-bold text-zinc-500">· {g.options?.length || 0} Options</span>
                                         </div>
                                     </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button onClick={() => openEditGroup(g)} className="h-8 px-4 rounded-lg text-xs font-semibold normal-case tracking-normal border border-zinc-200  text-zinc-500 hover:text-orange-500 hover:border-orange-200 transition-all">Rename</button>
                                     <button onClick={() => handleDeleteGroup(g._id, g.name)} className="h-8 w-8 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 transition-all"><X size={14} /></button>
                                </div>
                             </div>

                             <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {g.options?.map(opt => (
                                    <div key={opt._id} className="p-3 bg-zinc-50 hover:bg-white   rounded-2xl border border-zinc-100  flex items-center justify-between group/opt transition-all">
                                        <div className="flex items-center gap-3">
                                            {opt.image_url && <div className="w-8 h-8 rounded-lg overflow-hidden border border-white  shadow-sm"><img src={opt.image_url} className="w-full h-full object-cover" /></div>}
                                            <div>
                                                <p className="text-xs font-semibold text-zinc-700  normal-case tracking-tight">{opt.label}</p>
                                                <p className="text-sm font-bold text-orange-500">+{opt.price_modifier_naira?.toLocaleString()} ₦</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover/opt:opacity-100 transition-all">
                                            <button onClick={() => openOptionModal(g, opt)} className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-orange-500 hover:bg-orange-50"><Edit2 size={12}/></button>
                                            <button onClick={() => handleDeleteOption(g._id, opt._id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50"><X size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => openOptionModal(g)} className="p-3 rounded-2xl border-2 border-dashed border-zinc-100  flex items-center justify-center gap-2 text-sm font-semibold normal-case text-zinc-500 hover:border-orange-500/30 hover:text-orange-500 transition-all">
                                     <Plus size={14} /> Add Option
                                </button>
                             </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* ADD GROUP MODAL */}
            <ManagementModal 
                isOpen={showAddGroup} 
                onClose={() => setShowAddGroup(false)} 
                title="New Choice Group"
                footer={
                    <button onClick={handleAddGroup} className="bg-orange-500 text-white h-11 px-10 rounded-xl font-semibold text-sm normal-case tracking-normal shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Create Group</button>
                }
            >
                <div className="space-y-6">
                    <div>
                         <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Group Name (e.g. Choose Protein)</label>
                         {!isAddingCustomTitle ? (
                             <div className="grid grid-cols-2 gap-2">
                                 {["Choose your protein", "Spice level", "Add a drink", "Extra toppings", "Soup selection", "Swallow choice"].map(p => (
                                     <button key={p} onClick={() => setNewGroup({ ...newGroup, name: p })} className={`p-3 rounded-xl border text-sm font-semibold text-left transition-all ${newGroup.name === p ? "border-orange-500 bg-orange-50 text-orange-600" : "bg-white  border-zinc-100  text-zinc-600 hover:border-orange-100"}`}>{p}</button>
                                 ))}
                                 <button onClick={() => setIsAddingCustomTitle(true)} className="p-3 rounded-xl border-2 border-dashed border-zinc-200 text-xs font-bold text-zinc-500">Custom name...</button>
                             </div>
                         ) : (
                             <div className="flex gap-2">
                                <input className="h-12 px-4 flex-1 rounded-xl border bg-zinc-50  border-zinc-200  font-bold outline-none" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} autoFocus />
                                <button onClick={() => setIsAddingCustomTitle(false)} className="text-sm font-semibold normal-case text-orange-500">Back</button>
                             </div>
                         )}
                    </div>
                    <label className="flex items-center gap-3 p-2 rounded-2xl bg-zinc-50  border-border cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded-xl text-orange-500" checked={newGroup.is_required} onChange={e => setNewGroup({ ...newGroup, is_required: e.target.checked })} />
                        <span className="text-xs font-semibold normal-case tracking-tight">Requirement: Mandatory selection</span>
                    </label>
                </div>
            </ManagementModal>

            {/* EDIT GROUP MODAL */}
            <ManagementModal 
                isOpen={isGroupModalOpen} 
                onClose={() => setIsGroupModalOpen(false)} 
                title={`Configure: ${selectedGroup?.name}`}
                footer={
                    <button onClick={handleSaveGroup} className="bg-zinc-900  text-white  h-11 px-10 rounded-xl font-semibold text-sm normal-case tracking-normal">Done</button>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2">Group Name</label>
                        <input className="h-12 px-4 w-full rounded-xl border bg-zinc-100  border-zinc-200  font-bold" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2">Min Select</label>
                             <input type="number" className="h-12 px-4 w-full rounded-xl border font-bold" value={groupForm.min_selections} onChange={e => setGroupForm({ ...groupForm, min_selections: e.target.value })} />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2">Max Select</label>
                             <input type="number" className="h-12 px-4 w-full rounded-xl border font-bold" value={groupForm.max_selections} onChange={e => setGroupForm({ ...groupForm, max_selections: e.target.value })} />
                        </div>
                    </div>
                </div>
            </ManagementModal>

            {/* OPTION MODAL (Add/Edit) */}
            <ManagementModal 
                isOpen={isAddOptionModalOpen} 
                onClose={() => setIsAddOptionModalOpen(false)} 
                title={isEditOption ? `Edit: ${selectedOption?.label}` : `Add to ${selectedGroup?.name}`}
                footer={
                    <button onClick={handleSaveOption} className="bg-orange-500 text-white h-11 px-10 rounded-xl font-semibold text-sm normal-case tracking-normal">{isEditOption ? "Save Changes" : "Create Option"}</button>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Option Label</label>
                        <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  font-bold outline-none focus:border-orange-500" value={optionForm.label} onChange={e => setOptionForm({ ...optionForm, label: e.target.value })} placeholder="e.g. Extra Beef" />
                    </div>
                    <div>
                         <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Additional Price (₦)</label>
                         <input type="number" className="h-12 px-4 w-full rounded-xl border font-semibold text-orange-600 outline-none focus:border-orange-500" value={optionForm.price_modifier_naira} onChange={e => setOptionForm({ ...optionForm, price_modifier_naira: e.target.value })} />
                    </div>
                    <div>
                         <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Thumbnail URL</label>
                         <input className="h-12 px-4 w-full rounded-xl border text-xs outline-none focus:border-orange-500" value={optionForm.image_url} onChange={e => setOptionForm({ ...optionForm, image_url: e.target.value })} placeholder="Optional image..." />
                    </div>
                    <label className="flex items-center justify-between rounded-xl border border-zinc-200  p-3"><span className="text-sm font-semibold normal-case tracking-normal">Available to customers</span><input type="checkbox" checked={optionForm.is_available !== false} onChange={e => setOptionForm({ ...optionForm, is_available: e.target.checked })} className="h-5 w-5 accent-orange-500" /></label>
                    <label className="flex items-center justify-between rounded-xl border border-zinc-200  p-3"><span className="text-sm font-semibold normal-case tracking-normal">Track stock</span><input type="checkbox" checked={optionForm.track_stock === true} onChange={e => setOptionForm({ ...optionForm, track_stock: e.target.checked })} className="h-5 w-5 accent-orange-500" /></label>
                    {optionForm.track_stock && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold normal-case text-zinc-500">Available<input type="number" min="0" value={optionForm.stock_quantity} onChange={e => setOptionForm({ ...optionForm, stock_quantity: e.target.value })} className="mt-2 h-11 w-full rounded-xl border px-3 font-bold " /></label><label className="text-xs font-semibold normal-case text-zinc-500">Low stock at<input type="number" min="0" value={optionForm.low_stock_threshold} onChange={e => setOptionForm({ ...optionForm, low_stock_threshold: e.target.value })} className="mt-2 h-11 w-full rounded-xl border px-3 font-bold " /></label></div>}
                </div>
            </ManagementModal>
        </>
    );
};

export default function FoodManagementPage() {
    const { id: itemId } = useParams();
    const router = useRouter();
    const { vendorProfile } = useVendorProfile();
    const vendorId = vendorProfile?._id || vendorProfile?.id;
    const queryClient = useQueryClient();
    const [allSections, setAllSections] = useState([]);
    useEffect(() => {
        if (!vendorId) return;
        getVendorSections(vendorId).then(r => setAllSections(r.sections || [])).catch(() => {});
    }, [vendorId]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["food-item", itemId],
        queryFn: () => getMenuItemDetail(vendorId, itemId),
        enabled: !!vendorId && !!itemId,
        staleTime: 1000 * 60 * 5,
    });

    const item = data?.item ? { ...data.item, portions: data.portions || data.item.portions || [], choice_groups: data.choice_groups || data.item.choice_groups || [] } : null;

    const handleToggleAvailability = async () => {
        try {
            await toggleMenuItemAvailability(vendorId, itemId);
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            queryClient.invalidateQueries({ queryKey: ["vendor-foods", vendorId] });
            toast.success(item.is_available ? "Food is now hidden from customers" : "Food is now live on your menu");
        } catch (err) { toast.error(err?.response?.data?.message || "Could not update availability"); }
    };

    const handleArchiveToggle = async () => {
        const archiving = !item.is_archived;
        try {
            await archiveMenuItem(vendorId, itemId, archiving);
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            queryClient.invalidateQueries({ queryKey: ["vendor-foods", vendorId] });
            toast.success(archiving ? "Food archived" : "Food restored");
        } catch (err) {
            const msg = err?.response?.data?.message;
            toast.error(msg || "Could not archive food", { duration: msg?.includes("combo") ? 6000 : 4000 });
        }
    };

const CombosSection = ({ item, vendorId, itemId, queryClient }) => {
    const [editingComboId, setEditingComboId] = useState(null);
    const [comboForm, setComboForm] = useState({});
    const [savingCombo, setSavingCombo] = useState(false);

    // Swap Editor State
    const [swapEditorComboId, setSwapEditorComboId] = useState(null);
    const [newSwapGroupForm, setNewSwapGroupForm] = useState({});
    const [showAddSwapGroup, setShowAddSwapGroup] = useState({});
    const [newSwapOptionForm, setNewSwapOptionForm] = useState({});
    const [showAddSwapOption, setShowAddSwapOption] = useState({});
    const [addingSwapGroup, setAddingSwapGroup] = useState(false);
    const [addingSwapOption, setAddingSwapOption] = useState(null); // groupId

    const openComboEdit = (combo) => {
        setComboForm({
            name: combo.name,
            description: combo.description || "",
            image_url: combo.image_url || "",
            price_naira: combo.price_naira,
            prep_time_minutes: combo.prep_time_minutes || "",
        });
        setEditingComboId(combo._id);
    };

    const handleSaveCombo = async () => {
        if (!comboForm.name?.trim()) return toast.error("Combo name is required");
        if (!comboForm.price_naira || Number(comboForm.price_naira) <= 0) return toast.error("Price must be > 0");
        
        setSavingCombo(true);
        try {
            await updateVariant(vendorId, editingComboId, {
                name: comboForm.name.trim(),
                description: comboForm.description.trim() || null,
                image_url: comboForm.image_url.trim() || null,
                price_naira: Number(comboForm.price_naira),
                prep_time_minutes: comboForm.prep_time_minutes ? Number(comboForm.prep_time_minutes) : null,
            });
            queryClient.invalidateQueries({ queryKey: ["food-item", itemId] });
            setEditingComboId(null);
            toast.success("Bundle updated");
        } catch (err) { toast.error("Error updating bundle"); }
        finally { setSavingCombo(false); }
    };

    if (!item.combos?.length) return null;

    return (
        <>
            <SectionCard title="Active Bundles (Combos)" action={<div className="flex items-center gap-2 px-3 py-1 bg-orange-50  rounded-full border border-orange-100 "><span className="text-sm font-semibold text-orange-500 normal-case tracking-normal">{item.combos.length} Combos</span></div>}>
                <div className="space-y-4">
                    {item.combos.map(combo => (
                        <div key={combo._id} className="p-2 bg-zinc-50  rounded-3xl border border-zinc-100  transition-all hover:bg-white  group">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-14 h-14 rounded-2xl bg-white  border border-zinc-200  flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                        {combo.image_url ? <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" /> : <Package size={20} className="text-zinc-500" />}
                                    </div>
                                    <div className="min-w-0 overflow-hidden">
                                        <h4 className="font-semibold text-sm text-zinc-800  truncate normal-case tracking-tight leading-none mb-1">{combo.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-orange-600 ">₦{combo.price_naira?.toLocaleString()}</span>
                                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                                            <span className={`text-xs font-semibold normal-case tracking-normal ${combo.is_available ? 'text-emerald-500' : 'text-zinc-500'}`}>{combo.is_available ? "Active" : "Hidden"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openComboEdit(combo)} className="h-9 px-4 rounded-xl border border-zinc-200  text-sm font-semibold normal-case tracking-normal text-zinc-500 hover:text-orange-500 hover:border-orange-200 transition-all">Manage Bundle</button>
                                    <button onClick={() => setSwapEditorComboId(combo._id)} className="h-9 w-9 rounded-xl flex items-center justify-center bg-white  border border-zinc-200  text-zinc-500 hover:text-orange-500 transition-all"><RefreshCw size={14} strokeWidth={3} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* EDIT BUNDLE MODAL */}
            <ManagementModal 
                isOpen={!!editingComboId} 
                onClose={() => setEditingComboId(null)} 
                title="Bundle Configuration"
                footer={
                    <button onClick={handleSaveCombo} disabled={savingCombo} className="bg-zinc-900  text-white  h-11 px-10 rounded-xl font-semibold text-sm normal-case tracking-normal flex items-center gap-2">
                        {savingCombo && <Loader2 size={14} className="animate-spin" />} Save Bundle Details
                    </button>
                }
            >
                <div className="space-y-6">
                    <div>
                         <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Bundle Marketing Title</label>
                         <input className="h-12 px-4 w-full rounded-xl border bg-zinc-50  border-zinc-200  font-bold outline-none focus:border-orange-500" value={comboForm.name} onChange={e => setComboForm({ ...comboForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Bundle Price (₦)</label>
                             <input type="number" className="h-12 px-4 w-full rounded-xl border font-semibold text-orange-600 outline-none" value={comboForm.price_naira} onChange={e => setComboForm({ ...comboForm, price_naira: e.target.value })} />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Est. Prep (min)</label>
                             <input type="number" className="h-12 px-4 w-full rounded-xl border font-bold" value={comboForm.prep_time_minutes} onChange={e => setComboForm({ ...comboForm, prep_time_minutes: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold normal-case tracking-normal text-zinc-500 mb-2 ml-1">Description</label>
                        <textarea className="w-full px-4 py-3 rounded-xl border bg-zinc-50  border-zinc-200  text-sm font-medium outline-none focus:border-orange-500" rows={3} value={comboForm.description} onChange={e => setComboForm({ ...comboForm, description: e.target.value })} placeholder="What's included in this bundle?" />
                    </div>
                </div>
            </ManagementModal>

            {/* SWAP CONFIGURATION MODAL */}
            <ManagementModal
                isOpen={!!swapEditorComboId}
                onClose={() => setSwapEditorComboId(null)}
                title="Swap Configurations"
                footer={<button onClick={() => setSwapEditorComboId(null)} className="h-11 px-8 bg-zinc-900 text-white rounded-xl text-xs font-semibold normal-case tracking-normal">Done</button>}
            >
                <div className="space-y-8">
                     <p className="text-sm font-medium text-zinc-500 leading-relaxed bg-orange-50 p-2 rounded-2xl border border-orange-100">Swap groups allow customers to personalize this bundle by choosing alternative items (e.g., swapping Fries for Jollof Rice).</p>
                     
                     <div className="space-y-4">
                         {item.combos?.find(c => c._id === swapEditorComboId)?.swap_groups?.map(group => (
                             <div key={group._id} className="p-5 rounded-3xl bg-zinc-50 border border-zinc-100 space-y-4">
                                 <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                         <h4 className="text-xs font-semibold normal-case tracking-tight text-zinc-800">{group.name}</h4>
                                         {group.is_required && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded font-semibold tracking-normal">Required</span>}
                                     </div>
                                 </div>
                                 <div className="flex flex-wrap gap-2">
                                     {group.options?.map(opt => (
                                         <div key={opt._id} className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-sm font-bold text-zinc-600 flex items-center gap-2">
                                             {opt.label || opt.name}
                                             <span className="text-orange-500 font-semibold">+{opt.price_modifier_naira || 0}₦</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))}
                         
                         <div className="p-3 border-2 border-dashed border-zinc-200 rounded-3xl text-center">
                              <p className="text-xs font-bold text-zinc-500 mb-1">More advanced swap editing?</p>
                              <p className="text-sm text-zinc-500">Use the primary bundle editor for complex configuration changes.</p>
                         </div>
                     </div>
                </div>
            </ManagementModal>
        </>
    );
};


    if (isError) return <div className="mc-workspace mc-empty"><h1>Couldn’t load this item</h1><p>Try refreshing, or return to your menu.</p><button className="mc-button" onClick={() => router.push('/vendors/my-foods')}>Back to menu</button></div>;
    if (isLoading || !item) return <div className="mc-workspace mc-empty" role="status"><Loader2 className="animate-spin"/>Loading your menu item…</div>;
    const defaultPortion = item.portions.find(p => p.is_default) || item.portions[0];
    return <div className="mc-workspace mc-food-details">
      <div className="mc-toolbar"><BackButton label="My foods" href="/vendors/my-foods"/><button className="mc-button" onClick={() => router.push('/vendors/my-foods/'+itemId+'/edit')}><Edit2 size={17}/> Edit menu item</button></div>
      <header className="mc-food-overview">
        <div className="mc-food-photo">{item.image_url ? <img src={item.image_url} alt={item.name}/> : <><ImageIcon size={38}/><span>Add a photo in item details</span></>}</div>
        <div className="mc-food-summary"><p className="mc-eyebrow">Your menu · {ITEM_TYPE_META[item.item_type]?.label || 'Food'}</p><h1>{item.name}</h1><p>{item.description || 'Add a short description to help customers choose.'}</p>
          <div className="mc-summary-tags"><span className="mc-badge">{item.is_available ? 'Available to order' : 'Hidden from customers'}</span>{item.prep_time_minutes && <span><Clock size={15}/>{item.prep_time_minutes} min preparation</span>}<span>{item.portions.length} portion{item.portions.length === 1 ? '' : 's'}</span><span>{item.choice_groups.length} choice group{item.choice_groups.length === 1 ? '' : 's'}</span></div>
          {defaultPortion && <div className="mc-food-price">₦{Number(defaultPortion.price_naira ?? defaultPortion.price/100).toLocaleString('en-NG')}<small>{defaultPortion.label} · default portion</small></div>}
          <div className="mc-inline-actions"><button className="mc-button secondary" onClick={handleToggleAvailability}>{item.is_available ? 'Hide item' : 'Make available'}</button><button className="mc-button quiet" onClick={() => { if(item.is_archived || window.confirm('Archive this item? It will be removed from your active menu.')) handleArchiveToggle(); }}>{item.is_archived ? 'Restore item' : 'Archive item'}</button></div>
        </div>
      </header>
      <nav className="mc-anchor-nav" aria-label="Item sections"><a href="#food-basics">Details</a><a href="#food-portions">Portions & prices</a><a href="#food-choices">Choice groups</a><a href="#food-category">Category</a></nav>
      <div className="mc-food-grid"><div className="mc-food-main">
        <div id="food-basics"><BasicInfoSection item={item} vendorId={vendorId} itemId={itemId} queryClient={queryClient}/></div>
        <div id="food-portions"><PortionsSection item={item} vendorId={vendorId} itemId={itemId} queryClient={queryClient}/></div>
        <div id="food-choices"><AddOnsSection item={item} vendorId={vendorId} itemId={itemId} queryClient={queryClient}/></div>
      </div><aside className="mc-food-aside"><div id="food-category"><CategorySection item={item} vendorId={vendorId} itemId={itemId} queryClient={queryClient} allSections={allSections}/></div><CombosSection item={item} vendorId={vendorId} itemId={itemId} queryClient={queryClient}/><div className="mc-tip"><ChefHat size={20}/><div><strong>Keep your menu ready</strong><p>Check portion prices and available choices before accepting new orders.</p></div></div></aside></div>
    </div>;
}
