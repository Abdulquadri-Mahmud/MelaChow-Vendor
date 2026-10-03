"use client";

import { useState } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import { useCreateMenuItem } from "@/app/hooks/useMenu";
import { validateMenuDraft } from "@/app/lib/menuDraft.mjs";

const money = (value) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
export default function MenuReview({ onComplete, onSetStep }) {
  const store = useCreateFoodStore();
  const { vendorProfile } = useVendorProfile();
  const vendorId = vendorProfile?._id || vendorProfile?.id;
  const mutation = useCreateMenuItem(vendorId);
  const [error, setError] = useState("");
  const publish = async () => {
    if (store.isSubmitting || mutation.isPending) return;
    const invalid = validateMenuDraft(store);
    if (invalid || !vendorId)
      return setError(
        invalid || "Your vendor session is missing. Please sign in again.",
      );
    setError("");
    store.setField("isSubmitting", true);
    try {
      await mutation.mutateAsync({
        item: {
          platform_category_id: store.platform_category_id,
          vendor_section_id: store.vendor_section_id,
          name: store.name,
          description: store.description,
          image_url: store.image_url,
          item_type: store.item_type,
          dietary_type: store.dietary_type,
          prep_time_minutes: store.prep_time_minutes,
          tags: store.tags,
        },
        portions: store.portions,
        choice_groups: store.choice_groups,
      });
      onComplete?.();
    } catch (failure) {
      setError(
        failure.message ||
          "Your item couldn’t be published. Your draft is still here.",
      );
    } finally {
      useCreateFoodStore.setState({ isSubmitting: false });
    }
  };
  const edit = (step) => (
    <button
      type="button"
      className="menu-text-button"
      onClick={() => onSetStep(step)}
      disabled={store.isSubmitting}
    >
      <Pencil size={15} /> Edit
    </button>
  );
  return (
    <div className="menu-fields">
      <section className="menu-review-section">
        <div className="menu-card-title">
          <h3>Item details</h3>
          {edit(1)}
        </div>
        <h4 className="menu-review-name">{store.name}</h4>
        <p>{store.description || "No description added."}</p>
        <div className="menu-review-meta">
          <span>{store.item_type.toLowerCase()}</span>
          <span>
            {store.prep_time_minutes
              ? `${store.prep_time_minutes} min preparation`
              : "No prep time set"}
          </span>
        </div>
      </section>
      <section className="menu-review-section">
        <div className="menu-card-title">
          <h3>Category & placement</h3>
          {edit(2)}
        </div>
        <dl>
          <div>
            <dt>Category</dt>
            <dd>{store.platform_category_label}</dd>
          </div>
          <div>
            <dt>Menu section</dt>
            <dd>{store.vendor_section_label || "No section"}</dd>
          </div>
        </dl>
      </section>
      <section className="menu-review-section">
        <div className="menu-card-title">
          <h3>Sizes & prices</h3>
          {edit(3)}
        </div>
        {store.portions.map((portion) => (
          <div key={portion.tempId} className="menu-review-row">
            <span>
              <strong>{portion.label}</strong>
              {portion.is_default && <small>Default size</small>}
              {portion.track_stock && (
                <small>{portion.stock_quantity} available</small>
              )}
            </span>
            <strong>{money(portion.price_naira)}</strong>
          </div>
        ))}
      </section>
      <section className="menu-review-section">
        <div className="menu-card-title">
          <h3>Customer choices</h3>
          {edit(4)}
        </div>
        {!store.choice_groups.length ? (
          <p>No extras or choices added.</p>
        ) : (
          store.choice_groups.map((group) => (
            <div key={group.tempId} className="menu-review-group">
              <h4>{group.name}</h4>
              <p>
                {group.is_required
                  ? `Required · Select at least ${group.min_selections}`
                  : "Optional"}{" "}
                · Up to{" "}
                {group.max_selections >= 9999 ? "all" : group.max_selections}{" "}
                choices
              </p>
              {group.options.map((option) => (
                <div className="menu-review-row" key={option.tempId}>
                  <span>
                    {option.label}
                    {option.is_available === false && (
                      <small>Unavailable</small>
                    )}
                    {option.track_stock && (
                      <small>{option.stock_quantity} left</small>
                    )}
                  </span>
                  <strong>
                    {Number(option.price_modifier_naira) === 0
                      ? "Included"
                      : `+${money(option.price_modifier_naira)}`}
                  </strong>
                </div>
              ))}
            </div>
          ))
        )}
      </section>
      <div className="menu-success-note">
        <CheckCircle2 size={24} />
        <p>
          Happy with the details? Publish below to make this item available on
          your menu.
        </p>
      </div>
      {error && (
        <p className="menu-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        id="publish-food-btn"
        className="hidden"
        onClick={publish}
        disabled={store.isSubmitting}
        tabIndex={-1}
        aria-hidden="true"
      >
        Publish
      </button>
    </div>
  );
}
