"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Check } from "lucide-react";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { createVendorSection, getVendorSections } from "@/app/lib/menuApi";
import PlatformCategoryPicker from "@/app/components/shared/PlatformCategoryPicker";

export default function Step2Categories() {
  const store = useCreateFoodStore();
  const { vendorProfile } = useVendorProfile();
  const vendorId = vendorProfile?._id || vendorProfile?.id;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    getVendorSections(vendorId)
      .then((result) => {
        if (active) setSections(result.sections || result.data || []);
      })
      .catch(() => {
        if (active)
          setError(
            "Your menu sections couldn’t load. You can continue without one.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vendorId, retry]);
  const addSection = async () => {
    if (!name.trim() || !vendorId || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await createVendorSection(vendorId, name.trim());
      const section = result.section || result.data;
      if (!section?._id && !section?.id) throw new Error();
      setSections((previous) => [...previous, section]);
      store.setField("vendor_section_id", section._id || section.id);
      store.setField("vendor_section_label", section.name);
      setName("");
      setShowNew(false);
    } catch {
      setError("The section couldn’t be created. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="menu-fields">
      <div>
        <h3 className="menu-section-title">
          Food category <span className="menu-required">Required</span>
        </h3>
        <p className="menu-help">
          Choose the category that best describes this item.
        </p>
        <PlatformCategoryPicker
          value={store.platform_category_id}
          onChange={(id, label) => {
            store.setField("platform_category_id", id);
            store.setField("platform_category_label", label);
          }}
        />
      </div>
      <section className="menu-subsection">
        <h3 className="menu-section-title">
          Your menu section <span className="menu-optional">Optional</span>
        </h3>
        <p className="menu-help">
          Group items on your store’s menu, such as “Lunch specials” or
          “Drinks”.
        </p>
        {loading && vendorId ? (
          <p className="menu-help" role="status">
            Loading your sections…
          </p>
        ) : (
          <div className="menu-section-pills">
            {[{ _id: null, name: "No section" }, ...sections].map((section) => {
              const id = section._id || section.id || null;
              return (
                <button
                  type="button"
                  key={id || "none"}
                  aria-pressed={store.vendor_section_id === id}
                  onClick={() => {
                    store.setField("vendor_section_id", id);
                    store.setField(
                      "vendor_section_label",
                      id ? section.name : null,
                    );
                  }}
                >
                  {store.vendor_section_id === id && <Check size={15} />}
                  {section.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              disabled={!vendorId}
            >
              <Plus size={16} /> New section
            </button>
          </div>
        )}
        {error && (
          <p className="menu-error" role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                setRetry((value) => value + 1);
              }}
            >
              Try again
            </button>
          </p>
        )}
        {showNew && (
          <div className="menu-inline-field">
            <label className="menu-field">
              Section name
              <input
                autoFocus
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Lunch specials"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSection();
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="menu-button primary"
              onClick={addSection}
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                "Add section"
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
