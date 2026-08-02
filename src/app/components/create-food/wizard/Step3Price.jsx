"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";

const toNumber = (value) => Math.max(0, Number(String(value).replace(/,/g, "")) || 0);

export default function Step3Price() {
    const store = useCreateFoodStore();
    const [showMoreSizes, setShowMoreSizes] = useState(false);
    const [sizeLabel, setSizeLabel] = useState("");
    const [sizePrice, setSizePrice] = useState("");
    const [sizeTracksStock, setSizeTracksStock] = useState(false);
    const [sizeStockQuantity, setSizeStockQuantity] = useState("");

    const primaryPortion = store.portions.find((portion) => portion.is_default) || store.portions[0];
    const extraPortions = store.portions.filter((portion) => portion.tempId !== primaryPortion?.tempId);

    const updatePrimary = (updates) => {
        const draft = {
            tempId: primaryPortion?.tempId || Date.now().toString(),
            label: primaryPortion?.label || "Regular",
            price_naira: primaryPortion?.price_naira || 0,
            max_quantity: primaryPortion?.max_quantity || null,
            track_stock: primaryPortion?.track_stock === true,
            stock_quantity: primaryPortion?.stock_quantity ?? 0,
            low_stock_threshold: primaryPortion?.low_stock_threshold ?? 5,
            is_default: true,
            sort_order: 0,
            ...updates,
        };
        if (primaryPortion) store.updatePortion(primaryPortion.tempId, draft);
        else store.addPortion(draft);
    };

    const addSize = () => {
        const price = toNumber(sizePrice);
        const stockQuantity = toNumber(sizeStockQuantity);
        if (!sizeLabel.trim()) return toast.error("Enter a size name");
        if (price <= 0) return toast.error("Enter a valid price");
        if (sizeTracksStock && sizeStockQuantity === "") return toast.error("Enter the available stock");

        store.addPortion({
            tempId: Date.now().toString(), label: sizeLabel.trim(), price_naira: price,
            max_quantity: null, track_stock: sizeTracksStock,
            stock_quantity: sizeTracksStock ? stockQuantity : 0, low_stock_threshold: 5,
            is_default: false, sort_order: store.portions.length,
        });
        setSizeLabel(""); setSizePrice(""); setSizeTracksStock(false); setSizeStockQuantity(""); setShowMoreSizes(false);
    };

    return <div className="space-y-6">
        <div><h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Price & stock</h3><p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">Set a price, then optionally track how many are available.</p></div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Price (Naira) <span className="text-orange-600">Required</span></label>
            <input autoFocus type="number" min="1" inputMode="numeric" value={primaryPortion?.price_naira || ""} onChange={(event) => updatePrimary({ price_naira: toNumber(event.target.value) })} placeholder="e.g. 2000" className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-base font-black text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
            <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"><span><span className="block text-sm font-bold text-zinc-900 dark:text-white">Track stock</span><span className="block text-[10px] text-zinc-500">Mark Regular sold out automatically when it reaches zero.</span></span><input type="checkbox" checked={primaryPortion?.track_stock === true} onChange={(event) => updatePrimary({ track_stock: event.target.checked, stock_quantity: event.target.checked ? (primaryPortion?.stock_quantity ?? 0) : 0 })} className="h-5 w-5 accent-orange-600" /></label>
            {primaryPortion?.track_stock === true && <input type="number" min="0" inputMode="numeric" value={primaryPortion?.stock_quantity ?? ""} onChange={(event) => updatePrimary({ stock_quantity: toNumber(event.target.value) })} placeholder="Available Regular portions" className="mt-3 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900" />}
        </div>

        <div className="rounded-xl border border-dashed border-zinc-200 p-4 dark:border-zinc-800">
            <button type="button" onClick={() => setShowMoreSizes((visible) => !visible)} className="flex w-full items-center justify-between text-left"><span><span className="block text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Need more than one size?</span><span className="mt-1 block text-[10px] text-zinc-500">Optional: add another size, price, and its own stock.</span></span><Plus size={16} className="text-orange-600" /></button>
            {showMoreSizes && <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"><input type="text" value={sizeLabel} onChange={(event) => setSizeLabel(event.target.value)} placeholder="Size name, e.g. Large" className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900" /><input type="number" min="1" value={sizePrice} onChange={(event) => setSizePrice(event.target.value)} placeholder="Price (Naira)" className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900" /><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={sizeTracksStock} onChange={(event) => setSizeTracksStock(event.target.checked)} className="h-4 w-4 accent-orange-600" /> Track stock for this size</label>{sizeTracksStock && <input type="number" min="0" value={sizeStockQuantity} onChange={(event) => setSizeStockQuantity(event.target.value)} placeholder="Available quantity" className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900" />}<button type="button" onClick={addSize} className="h-10 w-full rounded-lg bg-zinc-900 px-4 text-[10px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-zinc-900">Add size</button></div>}
            {extraPortions.length > 0 && <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">{extraPortions.map((portion) => <div key={portion.tempId} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900"><span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{portion.label} - N{Number(portion.price_naira).toLocaleString("en-NG")}{portion.track_stock ? ` (${portion.stock_quantity} left)` : ""}</span><button type="button" onClick={() => store.removePortion(portion.tempId)} aria-label={`Remove ${portion.label}`} className="text-rose-600"><Trash2 size={15} /></button></div>)}</div>}
        </div>
    </div>;
}