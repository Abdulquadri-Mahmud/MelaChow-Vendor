"use client";

import { useState } from "react";
import { Camera, Loader2, X, Plus } from "lucide-react";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";
import uploadToCloudinary from "@/app/components/user_profile/helpers/uploadToCloudinary";

const itemTypes = [
  "FOOD",
  "DRINK",
  "SOUP",
  "SWALLOW",
  "PROTEIN",
  "SIDE",
  "DESSERT",
  "OTHER",
];
const diets = [
  ["mixed", "No special dietary label"],
  ["veg", "Vegetarian"],
  ["vegan", "Vegan"],
  ["non-veg", "Non-vegetarian"],
  ["halal", "Halal"],
  ["kosher", "Kosher"],
];

export default function Step1BasicInfo() {
  const store = useCreateFoodStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tag, setTag] = useState("");
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return setError("Choose an image file.");
    if (file.size > 10 * 1024 * 1024)
      return setError("Choose a photo smaller than 10 MB.");
    setUploading(true);
    setError("");
    try {
      const url = await uploadToCloudinary(file);
      if (!url) throw new Error();
      store.setField("image_url", url);
    } catch {
      setError("Your photo couldn’t upload. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  const addTag = () => {
    if (tag.trim()) {
      store.addTag(tag);
      setTag("");
    }
  };
  return (
    <div className="menu-fields">
      <label className="menu-field">
        Item name <span className="menu-required">Required</span>
        <input
          value={store.name}
          maxLength={150}
          onChange={(event) => store.setField("name", event.target.value)}
          placeholder="e.g. Smoky jollof rice"
          autoComplete="off"
        />
        <small>Keep it clear and familiar, just like on your menu.</small>
      </label>
      <label className="menu-field">
        Description <span className="menu-optional">Optional</span>
        <textarea
          value={store.description}
          rows={3}
          maxLength={1000}
          onChange={(event) =>
            store.setField("description", event.target.value)
          }
          placeholder="What makes it special? Mention ingredients, flavour, or what’s included."
        />
      </label>
      <div className="menu-photo-section">
        <div>
          <h3>Make it look delicious</h3>
          <p>A real photo of your dish helps customers choose.</p>
          <small>Optional · JPG, PNG, or WebP · Up to 10 MB</small>
        </div>
        <div className="menu-photo-upload">
          {store.image_url ? (
            <>
              <img
                src={store.image_url}
                alt={store.name || "Uploaded food photo"}
              />
              <button
                type="button"
                className="menu-remove-photo"
                aria-label="Remove food photo"
                onClick={() => store.setField("image_url", null)}
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <Camera size={32} />
          )}
          <label className="menu-upload-label">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={upload}
            />
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Uploading…
              </>
            ) : store.image_url ? (
              "Change photo"
            ) : (
              "Add a photo"
            )}
          </label>
        </div>
      </div>
      {error && (
        <p className="menu-error" role="alert">
          {error}
        </p>
      )}
      <div className="menu-two-cols">
        <label className="menu-field">
          Item type
          <select
            value={store.item_type}
            onChange={(event) =>
              store.setField("item_type", event.target.value)
            }
          >
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="menu-field">
          Dietary label
          <select
            value={store.dietary_type}
            onChange={(event) =>
              store.setField("dietary_type", event.target.value)
            }
          >
            {diets.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="menu-field">
        Preparation time <span className="menu-optional">Minutes</span>
        <input
          type="number"
          min="1"
          max="120"
          inputMode="numeric"
          value={store.prep_time_minutes ?? ""}
          onChange={(event) =>
            store.setField(
              "prep_time_minutes",
              event.target.value === "" ? null : Number(event.target.value),
            )
          }
          placeholder="e.g. 20"
        />
        <small>How long does it take to prepare after an order comes in?</small>
      </label>
      <details className="menu-details">
        <summary>
          Tags <span className="menu-optional">Optional</span>
        </summary>
        <p>Help customers search for your dish. Add up to six tags.</p>
        <div className="menu-tag-list">
          {store.tags.map((value) => (
            <span key={value} className="menu-chip">
              {value}
              <button
                type="button"
                onClick={() => store.removeTag(value)}
                aria-label={`Remove ${value} tag`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        {store.tags.length < 6 && (
          <div className="menu-inline-field">
            <label className="menu-field">
              <span className="sr-only">New tag</span>
              <input
                value={tag}
                maxLength={40}
                onChange={(event) => setTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g. spicy"
              />
            </label>
            <button
              type="button"
              className="menu-button secondary"
              onClick={addTag}
              disabled={!tag.trim()}
            >
              <Plus size={16} /> Add
            </button>
          </div>
        )}
      </details>
    </div>
  );
}
