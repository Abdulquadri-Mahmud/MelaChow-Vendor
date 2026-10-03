"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Library,
  Loader2,
  Check,
} from "lucide-react";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { getChoiceGroupTemplates } from "@/app/lib/menuApi";
import { templateToChoiceGroupSnapshot } from "@/app/lib/choiceGroupTemplates";

const presets = [
  "Choose your protein",
  "Add toppings",
  "Spice level",
  "Add a drink",
];
export default function MenuChoices() {
  const store = useCreateFoodStore();
  const { vendorProfile } = useVendorProfile();
  const [expanded, setExpanded] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const addGroup = (name = "") => {
    const tempId = crypto.randomUUID();
    store.addChoiceGroup({
      tempId,
      name,
      is_required: false,
      min_selections: 0,
      max_selections: 1,
      sort_order: store.choice_groups.length,
      options: [
        {
          tempId: crypto.randomUUID(),
          label: "",
          price_modifier_naira: 0,
          is_available: true,
          track_stock: false,
          stock_quantity: 0,
          low_stock_threshold: 5,
        },
      ],
    });
    setExpanded(tempId);
  };
  const openLibrary = async () => {
    setLibraryOpen(true);
    setLoading(true);
    setError("");
    try {
      const vendorId = vendorProfile?._id || vendorProfile?.id;
      if (!vendorId) throw new Error();
      const result = await getChoiceGroupTemplates(vendorId);
      setTemplates(result.templates || []);
    } catch {
      setError(
        "Saved groups couldn’t load. Try again or create your own group.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="menu-fields">
      <div className="menu-note">
        <SlidersHorizontal size={22} />
        <p>
          Give customers a choice, like chicken or beef. Add extra prices where
          needed, or leave them at ₦0 for free choices. This whole step is
          optional.
        </p>
      </div>
      <div className="menu-presets">
        <span>Start with a suggestion</span>
        <div>
          {presets.map((name) => (
            <button type="button" key={name} onClick={() => addGroup(name)}>
              <Plus size={15} />
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="menu-choice-actions">
        <button
          type="button"
          className="menu-button secondary"
          onClick={() => addGroup()}
        >
          <Plus size={17} /> Create a group
        </button>
        <button
          type="button"
          className="menu-button secondary"
          onClick={() => (libraryOpen ? setLibraryOpen(false) : openLibrary())}
        >
          <Library size={17} /> Use a saved group
        </button>
      </div>
      {libraryOpen && (
        <section className="menu-library">
          <div className="menu-card-title">
            <h3>Your saved groups</h3>
            <button
              type="button"
              className="menu-text-button"
              onClick={() => setLibraryOpen(false)}
            >
              Close
            </button>
          </div>
          {loading ? (
            <p role="status">
              <Loader2 size={18} className="animate-spin" /> Loading saved
              groups…
            </p>
          ) : error ? (
            <p role="alert" className="menu-error">
              {error}
              <button type="button" onClick={openLibrary}>
                Try again
              </button>
            </p>
          ) : !templates.length ? (
            <p>
              You haven’t saved any groups yet. Create a group below to get
              started.
            </p>
          ) : (
            <div className="menu-library-list">
              {templates.map((template) => {
                const added = store.choice_groups.some(
                  (group) => group.source_template_id === template._id,
                );
                return (
                  <button
                    type="button"
                    key={template._id}
                    disabled={added}
                    onClick={() => {
                      const group = templateToChoiceGroupSnapshot(
                        template,
                        store.choice_groups.length,
                      );
                      store.addChoiceGroup(group);
                      setExpanded(group.tempId);
                      setLibraryOpen(false);
                    }}
                  >
                    <span>
                      <strong>{template.name}</strong>
                      <small>
                        {template.options?.length || 0} options ·{" "}
                        {template.is_required ? "Required" : "Optional"}
                      </small>
                    </span>
                    {added ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
      {!store.choice_groups.length && (
        <div className="menu-empty">
          <SlidersHorizontal size={30} />
          <h3>Keep it simple, or add a little extra</h3>
          <p>No choices needed? Tap “Skip to review” below.</p>
        </div>
      )}
      {store.choice_groups.map((group) => (
        <section key={group.tempId} className="menu-group-card">
          <div className="menu-group-top">
            <button
              type="button"
              className="menu-group-heading"
              aria-expanded={expanded === group.tempId}
              onClick={() =>
                setExpanded(expanded === group.tempId ? null : group.tempId)
              }
            >
              <span>
                <strong>{group.name || "New choice group"}</strong>
                <small>
                  {group.options.length} option
                  {group.options.length === 1 ? "" : "s"} ·{" "}
                  {group.is_required ? "Required" : "Optional"} · Choose up to{" "}
                  {group.max_selections >= 9999 ? "all" : group.max_selections}
                </small>
              </span>
              {expanded === group.tempId ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
            <button
              type="button"
              className="menu-icon-button danger"
              aria-label={`Remove ${group.name || "choice group"}`}
              onClick={() => setPendingRemoval(group.tempId)}
            >
              <Trash2 size={18} />
            </button>
          </div>
          {pendingRemoval === group.tempId && (
            <div className="menu-removal" role="alert">
              <p>Remove this group and all its options?</p>
              <button
                type="button"
                className="menu-button secondary"
                onClick={() => setPendingRemoval(null)}
              >
                Keep it
              </button>
              <button
                type="button"
                className="menu-button danger"
                onClick={() => {
                  store.removeChoiceGroup(group.tempId);
                  setPendingRemoval(null);
                }}
              >
                Remove group
              </button>
            </div>
          )}
          {expanded === group.tempId && (
            <div className="menu-group-body">
              <label className="menu-field">
                What should the customer choose?
                <input
                  value={group.name}
                  maxLength={100}
                  onChange={(event) =>
                    store.updateChoiceGroup(group.tempId, {
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Choose your protein"
                />
                <small>
                  This question appears above the options on your menu.
                </small>
              </label>
              <label className="menu-stock-toggle">
                <span>
                  <strong>Customer must choose</strong>
                  <small>
                    Turn on if an order needs an answer to this question.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={group.is_required}
                  onChange={(event) =>
                    store.updateChoiceGroup(group.tempId, {
                      is_required: event.target.checked,
                      min_selections: event.target.checked
                        ? Math.max(1, Number(group.min_selections))
                        : 0,
                    })
                  }
                />
              </label>
              <div className="menu-two-cols">
                {group.is_required && (
                  <label className="menu-field">
                    Minimum choices
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={group.options.length || 1}
                      value={group.min_selections}
                      onChange={(event) =>
                        store.updateChoiceGroup(group.tempId, {
                          min_selections:
                            event.target.value === ""
                              ? ""
                              : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                )}
                <label className="menu-field">
                  Maximum choices
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={group.max_selections}
                    onChange={(event) =>
                      store.updateChoiceGroup(group.tempId, {
                        max_selections:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      })
                    }
                  />
                  <small>Use 1 for a single choice, or allow several.</small>
                </label>
              </div>
              <h4 className="menu-section-title">
                Options customers can choose
              </h4>
              {group.options.map((option, index) => (
                <div key={option.tempId} className="menu-option-card">
                  <div className="menu-card-title">
                    <strong>Option {index + 1}</strong>
                    <button
                      type="button"
                      className="menu-icon-button danger"
                      aria-label={`Remove ${option.label || "option " + (index + 1)}`}
                      onClick={() =>
                        store.removeChoiceOption(group.tempId, option.tempId)
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="menu-option-fields">
                    <label className="menu-field">
                      Option name
                      <input
                        value={option.label}
                        maxLength={100}
                        onChange={(event) =>
                          store.updateChoiceOption(
                            group.tempId,
                            option.tempId,
                            { label: event.target.value },
                          )
                        }
                        placeholder="e.g. Grilled chicken"
                      />
                    </label>
                    <label className="menu-field">
                      Extra price <span className="menu-optional">Naira</span>
                      <div className="menu-money-input">
                        <span>+₦</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={option.price_modifier_naira}
                          onChange={(event) =>
                            store.updateChoiceOption(
                              group.tempId,
                              option.tempId,
                              { price_modifier_naira: event.target.value },
                            )
                          }
                          placeholder="0"
                        />
                      </div>
                      <small>0 means no extra charge.</small>
                    </label>
                  </div>
                  <details className="menu-option-stock">
                    <summary>Availability & stock</summary>
                    <label className="menu-check-row">
                      <input
                        type="checkbox"
                        checked={option.is_available !== false}
                        onChange={(event) =>
                          store.updateChoiceOption(
                            group.tempId,
                            option.tempId,
                            { is_available: event.target.checked },
                          )
                        }
                      />{" "}
                      Available to order
                    </label>
                    <label className="menu-check-row">
                      <input
                        type="checkbox"
                        checked={option.track_stock === true}
                        onChange={(event) =>
                          store.updateChoiceOption(
                            group.tempId,
                            option.tempId,
                            { track_stock: event.target.checked },
                          )
                        }
                      />{" "}
                      Track stock for this option
                    </label>
                    {option.track_stock && (
                      <label className="menu-field">
                        Available quantity
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={option.stock_quantity ?? ""}
                          onChange={(event) =>
                            store.updateChoiceOption(
                              group.tempId,
                              option.tempId,
                              { stock_quantity: event.target.value },
                            )
                          }
                        />
                      </label>
                    )}
                  </details>
                </div>
              ))}
              <button
                type="button"
                className="menu-add-row"
                onClick={() =>
                  store.addChoiceOption(group.tempId, {
                    tempId: crypto.randomUUID(),
                    label: "",
                    price_modifier_naira: 0,
                    is_available: true,
                    track_stock: false,
                    stock_quantity: 0,
                    low_stock_threshold: 5,
                  })
                }
              >
                <Plus size={18} />
                <strong>Add an option</strong>
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
