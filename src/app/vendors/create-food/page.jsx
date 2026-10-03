"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  ImageIcon,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useCreateFoodStore } from "@/app/context/CreateFoodStore";
import { validateMenuDraft } from "@/app/lib/menuDraft.mjs";
import MenuBasics from "@/app/components/create-food/wizard/MenuBasics";
import MenuCategories from "@/app/components/create-food/wizard/MenuCategories";
import MenuPricing from "@/app/components/create-food/wizard/MenuPricing";
import MenuChoices from "@/app/components/create-food/wizard/MenuChoices";
import MenuReview from "@/app/components/create-food/wizard/MenuReview";
import "./create-menu.css";

const steps = [
  {
    title: "The basics",
    short: "Basics",
    detail: "A good menu starts with a great first impression.",
    tip: "Use the name customers recognise. A clear photo and a short description help them decide.",
  },
  {
    title: "Help customers find it",
    short: "Category",
    detail: "Choose the best category, then organise your own menu.",
    tip: "Choose the most specific category. Your store section is optional and only groups items on your menu.",
  },
  {
    title: "Set your price",
    short: "Pricing",
    detail:
      "Start with one price. Add sizes or stock tracking if you need them.",
    tip: "Enter prices in naira. If you sell different sizes, each one can have its own price and stock.",
  },
  {
    title: "Make it their own",
    short: "Choices",
    detail: "Optional extras, proteins, toppings, or customer preferences.",
    tip: "A choice group is a question, like “Choose your protein”. Add the options customers can select and any extra price.",
  },
  {
    title: "Ready for your menu?",
    short: "Review",
    detail: "Check the details your customers will see before publishing.",
    tip: "Check prices, available options, and selection rules before putting this item on your menu.",
  },
];

export default function CreateFoodWizardPage() {
  const store = useCreateFoodStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const warn = (event) => {
      if (store.isDirty && !store.isSubmitting) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [store.isDirty, store.isSubmitting]);
  const step = Math.min(5, Math.max(1, store.currentStep || 1));
  const go = (next) => {
    setError("");
    store.setStep(next);
    requestAnimationFrame(() => {
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      heading.current?.focus({ preventScroll: true });
    });
  };
  const next = () => {
    const message = validateMenuDraft(store, step);
    if (message) setError(message);
    else go(step + 1);
  };
  const primary =
    store.portions.find((portion) => portion.is_default) || store.portions[0];
  if (!mounted)
    return (
      <div className="menu-builder menu-loading" role="status">
        <Loader2 className="animate-spin" /> Opening your menu draft…
      </div>
    );
  return (
    <div className={`menu-builder ${step === 5 ? "is-review" : ""}`}>
      <header className="menu-hero">
        <div className="menu-hero-top">
          <button
            type="button"
            className="menu-back-link"
            onClick={() => router.back()}
            disabled={store.isSubmitting}
          >
            <ArrowLeft size={18} /> Back to menu
          </button>
          <span className="menu-draft-badge">
            <ShieldCheck size={15} />{" "}
            {store.isDirty ? "Draft saved on this device" : "New menu item"}
          </span>
        </div>
        <div className="menu-hero-title">
          <span className="menu-hero-icon">
            <ChefHat size={26} />
          </span>
          <div>
            <p className="menu-eyebrow">Your next customer favourite</p>
            <h1>Add to your menu</h1>
            <p>A few simple steps. A dish that’s ready to order.</p>
          </div>
        </div>
      </header>
      <nav className="menu-steps" aria-label="Menu creation steps">
        <ol>
          {steps.map((item, index) => (
            <li key={item.short}>
              <button
                type="button"
                disabled={index + 1 > step || store.isSubmitting}
                aria-current={step === index + 1 ? "step" : undefined}
                onClick={() => go(index + 1)}
                className={index + 1 < step ? "is-complete" : ""}
              >
                <span>
                  {index + 1 < step ? <Check size={17} /> : index + 1}
                </span>
                <strong>{item.short}</strong>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="menu-workspace">
        <section className="menu-form-panel" aria-labelledby="menu-step-title">
          <div className="menu-step-heading">
            <span className="menu-eyebrow">
              Step {step} of 5{step === 4 ? " · Optional" : ""}
            </span>
            <h2 id="menu-step-title" tabIndex={-1} ref={heading}>
              {steps[step - 1].title}
            </h2>
            <p>{steps[step - 1].detail}</p>
          </div>
          {step === 1 && <MenuBasics />}
          {step === 2 && <MenuCategories />}
          {step === 3 && <MenuPricing />}
          {step === 4 && <MenuChoices />}
          {step === 5 && (
            <MenuReview
              onSetStep={go}
              onComplete={() => {
                store.resetForm();
                router.push("/vendors/my-foods");
              }}
            />
          )}
          {error && (
            <p className="menu-error" role="alert">
              {error}
            </p>
          )}
        </section>
        <aside className="menu-preview-column">
          <div className="menu-preview">
            <div className="menu-preview-heading">
              <span className="menu-eyebrow">Customer preview</span>
              <span className="menu-preview-dot" /> Live
            </div>
            <div className="menu-preview-image">
              {store.image_url ? (
                <img src={store.image_url} alt={store.name || "Menu item"} />
              ) : (
                <div>
                  <ImageIcon size={32} />
                  <span>Your delicious photo goes here</span>
                </div>
              )}
            </div>
            <div className="menu-preview-body">
              <span className="menu-chip">
                {store.platform_category_label || "Your category"}
              </span>
              <h3>{store.name || "Your menu item"}</h3>
              <p>
                {store.description ||
                  "A short description helps customers find their new favourite."}
              </p>
              <div className="menu-preview-price">
                <strong>
                  {Number(primary?.price_naira) > 0
                    ? `₦${Number(primary.price_naira).toLocaleString("en-NG")}`
                    : "Add your price"}
                </strong>
                {store.prep_time_minutes && (
                  <span>{store.prep_time_minutes} min prep</span>
                )}
              </div>
              {store.choice_groups.length > 0 && (
                <div className="menu-preview-choices">
                  {store.choice_groups.length} customisation
                  {store.choice_groups.length === 1 ? "" : "s"} available
                </div>
              )}
            </div>
          </div>
          <div className="menu-tip">
            <ChefHat size={21} />
            <div>
              <strong>A little help</strong>
              <p>{steps[step - 1].tip}</p>
            </div>
          </div>
        </aside>
      </div>
      <footer className="menu-footer">
        <span className="menu-footer-progress">
          {step === 4
            ? "No extras? You can skip this step."
            : `Step ${step} of 5 · ${steps[step - 1].short}`}
        </span>
        <div>
          {step > 1 && (
            <button
              type="button"
              className="menu-button secondary"
              onClick={() => go(step - 1)}
              disabled={store.isSubmitting}
            >
              <ArrowLeft size={17} /> Back
            </button>
          )}
          <button
            type="button"
            className="menu-button primary"
            onClick={
              step === 5
                ? () => document.getElementById("publish-food-btn")?.click()
                : next
            }
            disabled={store.isSubmitting}
          >
            {store.isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : step === 5 ? (
              <Send size={17} />
            ) : null}
            {store.isSubmitting
              ? "Publishing…"
              : step === 5
                ? "Publish menu item"
                : step === 4 && !store.choice_groups.length
                  ? "Skip to review"
                  : step === 4
                    ? "Review item"
                    : "Continue"}
            {step < 5 && <ArrowRight size={17} />}
          </button>
        </div>
      </footer>
    </div>
  );
}
