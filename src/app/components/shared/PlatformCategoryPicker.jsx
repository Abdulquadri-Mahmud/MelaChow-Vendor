"use client";
import "./category-picker.css";

import { useEffect, useState } from "react";
import { Search, Check, RefreshCw, Loader2, FolderTree } from "lucide-react";
import { getPlatformCategories } from "@/app/lib/menuApi";
import { categoryChoices } from "@/app/lib/menuCategories.mjs";

export default function PlatformCategoryPicker({
  value,
  onChange,
  className = "",
}) {
  const [choices, setChoices] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getPlatformCategories()
      .then((result) => {
        const items = categoryChoices(result);
        if (active) {
          setChoices(items);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const retry = () => {
    setStatus("loading");
    setAttempt((previous) => previous + 1);
  };
  const selected = choices.find((category) => category.id === String(value));
  const visible = choices.filter((category) =>
    category.search.includes(query.trim().toLowerCase()),
  );
  return (
    <div className={`category-picker ${className}`}>
      {status === "loading" ? (
        <div className="category-state" role="status">
          <Loader2 size={22} className="animate-spin" /> Loading categories…
        </div>
      ) : status === "error" ? (
        <div className="category-state category-error" role="alert">
          <p>We couldn’t load the categories.</p>
          <p>Check your connection and try again.</p>
          <button type="button" onClick={retry}>
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      ) : choices.length === 0 ? (
        <div className="category-state">
          <FolderTree size={24} />
          <p>
            No categories are available yet. Please contact MelaChow support.
          </p>
          <button type="button" onClick={retry}>
            Refresh categories
          </button>
        </div>
      ) : (
        <>
          <label className="category-search">
            <Search size={18} />
            <input
              aria-label="Search categories"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rice, drinks, soups…"
            />
          </label>
          <div
            className="category-results"
            role="group"
            aria-label="Food categories"
          >
            {visible.map((category) => (
              <button
                type="button"
                key={category.id}
                aria-pressed={String(value) === category.id}
                onClick={() => onChange(category.id, category.name)}
                className={`category-option ${String(value) === category.id ? "is-selected" : ""}`}
              >
                <span>
                  {category.path && <small>{category.path}</small>}
                  <strong>{category.name}</strong>
                </span>
                <span className="category-check">
                  {String(value) === category.id && <Check size={16} />}
                </span>
              </button>
            ))}
            {!visible.length && (
              <p className="category-state">
                No matches. Try another food name.
              </p>
            )}
          </div>
          {selected && (
            <p className="category-selection" role="status">
              <Check size={16} /> Selected: {selected.name}
            </p>
          )}
          {value && !selected && (
            <p className="category-error">
              Your previous category is no longer available. Please choose
              another.
            </p>
          )}
        </>
      )}
    </div>
  );
}
