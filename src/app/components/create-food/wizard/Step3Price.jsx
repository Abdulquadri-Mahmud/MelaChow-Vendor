"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";

const toPrice = (value) => Number(String(value).replace(/,/g, "")) || 0;

export default function Step3Portions() {
    const store = useCreateFoodStore();
    const [showMoreSizes, setShowMoreSizes] = useState(false);
    const [sizeLabel, setSizeLabel] = useState("");
    const [sizePrice, setSizePrice] = useState("");

    const primaryPortion = store.portions.find((portion) => portion.is_default) || store.portions[0];
    const extraPortions = store.portions.filter((portion) => portion.tempId !== primaryPortion?.tempId);

    const updateBasePrice = (value) => {
        const price = toPrice(value);
        const draft = {
            tempId: primaryPortion?.tempId || Date.now().toString(),
            label: primaryPortion?.label || "Regular",
            price_naira: price,
            max_quantity: primaryPortion?.max_quantity || null,
            is_default: true,
            sort_order: 0,
        };

        if (primaryPortion) {
            store.updatePortion(primaryPortion.tempId, draft);
        } else {
            store.addPortion(draft);
        }
    };

    const addSize = () => {
        const price = toPrice(sizePrice);
        if (!sizeLabel.trim()) {
            toast.error("Enter a size name");
            return;
        }
        if (price <= 0) {
            toast.error("Enter a valid price");
            return;
        }

        store.addPortion({
            tempId: Date.now().toString(),
            label: sizeLabel.trim(),
            price_naira: price,
            max_quantity: null,
            is_default: false,
            sort_order: store.portions.length,
        });
        setSizeLabel("");
        setSizePrice("");
        setShowMoreSizes(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Price</h3>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                    Set the price customers will pay for this food.
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Price (₦) <span className="text-orange-600">Required</span>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-orange-600">₦</span>
                    <input
                        autoFocus
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={primaryPortion?.price_naira || ""}
                        onChange={(event) => updateBasePrice(event.target.value)}
                        placeholder="e.g. 2000"
                        className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-base font-black text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                </div>
                <p className="mt-3 text-[10px] font-medium leading-relaxed text-zinc-500">
                    Customers will see this as one regular food item. Quantity is selected by the customer in the menu and cart.
                </p>
            </div>

            <div className="rounded-xl border border-dashed border-zinc-200 p-4 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={() => setShowMoreSizes((visible) => !visible)}
                    className="flex w-full items-center justify-between text-left"
                >
                    <span>
                        <span className="block text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Need more than one size?</span>
                        <span className="mt-1 block text-[10px] text-zinc-500">Optional: add Small, Large, Family size, or another price.</span>
                    </span>
                    <Plus size={16} className="text-orange-600" />
                </button>

                {showMoreSizes && (
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-2">
                        <input
                            type="text"
                            value={sizeLabel}
                            onChange={(event) => setSizeLabel(event.target.value)}
                            placeholder="Size name, e.g. Large"
                            className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900"
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="1"
                                value={sizePrice}
                                onChange={(event) => setSizePrice(event.target.value)}
                                placeholder="Price (₦)"
                                className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900"
                            />
                            <button type="button" onClick={addSize} className="h-10 rounded-lg bg-zinc-900 px-4 text-[10px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-zinc-900">Add</button>
                        </div>
                    </div>
                )}

                {extraPortions.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        {extraPortions.map((portion) => (
                            <div key={portion.tempId} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{portion.label} — ₦{Number(portion.price_naira).toLocaleString("en-NG")}</span>
                                <button type="button" onClick={() => store.removePortion(portion.tempId)} aria-label={`Remove ${portion.label}`} className="text-rose-600"><Trash2 size={15} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}