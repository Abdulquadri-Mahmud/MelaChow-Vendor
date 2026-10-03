"use client";

import { Plus, Trash2, Package } from "lucide-react";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";

export default function MenuPricing() {
  const store = useCreateFoodStore();
  const portions = store.portions.length
    ? store.portions
    : [
        {
          tempId: "regular",
          label: "Regular",
          price_naira: "",
          is_default: true,
          track_stock: false,
          stock_quantity: 0,
          low_stock_threshold: 5,
          sort_order: 0,
        },
      ];
  const update = (id, changes) => {
    if (!store.portions.length)
      store.addPortion({ ...portions[0], ...changes });
    else store.updatePortion(id, changes);
  };
  const add = () => {
    if (!store.portions.length) store.addPortion({ ...portions[0] });
    store.addPortion({
      tempId: crypto.randomUUID(),
      label: "",
      price_naira: "",
      is_default: false,
      track_stock: false,
      stock_quantity: 0,
      low_stock_threshold: 5,
      sort_order: portions.length,
    });
  };
  return (
    <div className="menu-fields">
      <div className="menu-note">
        <Package size={21} />
        <p>
          One price is enough to get started. Add another size only if you sell
          this item in different portions.
        </p>
      </div>
      {portions.map((portion, index) => (
        <section key={portion.tempId} className="menu-size-card">
          <div className="menu-card-title">
            <h3>{index === 0 ? "Main size" : `Size ${index + 1}`}</h3>
            {portion.is_default && <span className="menu-chip">Default</span>}
            {index > 0 && (
              <button
                type="button"
                className="menu-icon-button danger"
                aria-label={`Remove ${portion.label || "size " + (index + 1)}`}
                onClick={() => { store.removePortion(portion.tempId); if (portion.is_default) store.setDefaultPortion(portions[0].tempId); }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <div className="menu-two-cols">
            <label className="menu-field">
              Size name
              <input
                value={portion.label}
                maxLength={60}
                onChange={(event) =>
                  update(portion.tempId, { label: event.target.value })
                }
                placeholder="e.g. Regular or Large"
              />
            </label>
            <label className="menu-field">
              Price <span className="menu-optional">Naira</span>
              <div className="menu-money-input">
                <span>₦</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={portion.price_naira}
                  onChange={(event) =>
                    update(portion.tempId, { price_naira: event.target.value })
                  }
                  placeholder="2,000"
                />
              </div>
            </label>
          </div>
          {portions.length > 1 && (
            <label className="menu-check-row">
              <input
                type="radio"
                name="default-portion"
                checked={portion.is_default}
                onChange={() => store.setDefaultPortion(portion.tempId)}
              />{" "}
              Make this the default size
            </label>
          )}
          <label className="menu-stock-toggle">
            <span>
              <strong>Track available stock</strong>
              <small>Automatically mark this size sold out at zero.</small>
            </span>
            <input
              type="checkbox"
              checked={portion.track_stock === true}
              onChange={(event) =>
                update(portion.tempId, { track_stock: event.target.checked })
              }
            />
          </label>
          {portion.track_stock && (
            <label className="menu-field">
              Available portions
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={portion.stock_quantity ?? ""}
                onChange={(event) =>
                  update(portion.tempId, { stock_quantity: event.target.value })
                }
                placeholder="e.g. 30"
              />
              <small>Zero means this size is currently sold out.</small>
            </label>
          )}
        </section>
      ))}
      <button type="button" className="menu-add-row" onClick={add}>
        <Plus size={20} />
        <span>
          <strong>Add another size</strong>
          <small>For example, a Large portion with its own price.</small>
        </span>
      </button>
    </div>
  );
}
