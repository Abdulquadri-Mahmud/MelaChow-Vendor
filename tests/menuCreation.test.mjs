import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryChoices } from "../src/app/lib/menuCategories.mjs";
import { validateMenuDraft } from "../src/app/lib/menuDraft.mjs";
import { publishMenuItem } from "../src/app/lib/publishMenuItem.mjs";

const draft = () => ({
  name: "Jollof rice",
  item_type: "FOOD",
  platform_category_id: "rice",
  prep_time_minutes: 20,
  portions: [{ label: "Regular", price_naira: "1200.25", is_default: true }],
  choice_groups: [],
});
const group = () => ({
  name: "Choose protein",
  is_required: true,
  min_selections: 1,
  max_selections: 1,
  options: [
    { label: "Chicken", price_modifier_naira: "350.50", is_available: true },
  ],
});
test("supports nested trees, UUID IDs, active leaf selection and category search paths", () => {
  const choices = categoryChoices({
    data: [
      {
        id: "food",
        name: "Food",
        children: [
          {
            id: "rice",
            name: "Rice",
            children: [{ id: "jollof", name: "Jollof" }],
          },
          { id: "hidden", name: "Inactive", isActive: false },
        ],
      },
    ],
  });
  assert.deepEqual(
    choices.map(({ id, path }) => ({ id, path })),
    [{ id: "jollof", path: "Food / Rice" }],
  );
  assert.equal(choices[0].search, "food rice jollof");
});
test("supports flat Mongo response with populated parents and root leaves", () => {
  const choices = categoryChoices({
    categories: [
      { _id: "food", name: "Food" },
      { _id: "rice", name: "Rice", parent: { _id: "food" } },
      { _id: "drink", name: "Drink" },
    ],
  });
  assert.equal(choices.length, 2);
  assert.equal(choices.find((row) => row.id === "rice").path, "Food");
});
test("invalid category responses are errors, not empty successful lists", () => {
  assert.throws(() => categoryChoices({ success: true }), /not returned/);
  assert.deepEqual(categoryChoices({ categories: [] }), []);
});
test("simple items can publish with no optional choices", () => {
  assert.equal(validateMenuDraft(draft()), null);
});
test("all sizes must have positive prices and unique names", () => {
  const value = draft();
  value.portions.push({ label: "Large", price_naira: 0 });
  assert.match(validateMenuDraft(value), /Every size/);
  value.portions[1] = { label: "regular", price_naira: 2500 };
  assert.match(validateMenuDraft(value), /different name/);
});
test("required groups must be answerable by available, stocked options", () => {
  const value = draft();
  value.choice_groups = [group()];
  assert.equal(validateMenuDraft(value), null);
  value.choice_groups[0].options[0].is_available = false;
  assert.match(validateMenuDraft(value), /available options/);
  value.choice_groups[0].options[0] = {
    label: "Chicken",
    price_modifier_naira: 0,
    track_stock: true,
    stock_quantity: 0,
  };
  assert.match(validateMenuDraft(value), /available options/);
});
test("empty groups, invalid limits and negative prices cannot publish", () => {
  const value = draft();
  value.choice_groups = [{ ...group(), options: [] }];
  assert.match(validateMenuDraft(value), /named options/);
  value.choice_groups = [{ ...group(), max_selections: 0 }];
  assert.match(validateMenuDraft(value), /limits/);
  value.choice_groups = [group()];
  value.choice_groups[0].options[0].price_modifier_naira = -100;
  assert.match(validateMenuDraft(value), /zero or more/);
});
function fakeApi() {
  const calls = [];
  return {
    calls,
    createMenuItem: async (...args) => {
      calls.push(["item", ...args]);
      return { item: { _id: "new-item" } };
    },
    addPortion: async (...args) => calls.push(["portion", ...args]),
    addChoiceGroup: async (...args) => {
      calls.push(["group", ...args]);
      return { group: { _id: "new-group" } };
    },
    addChoiceOption: async (...args) => calls.push(["option", ...args]),
    deleteMenuItem: async (...args) => calls.push(["delete", ...args]),
  };
}
test("publishes choices, required rules and prices in both naira and kobo", async () => {
  const api = fakeApi(),
    value = draft();
  value.choice_groups = [group()];
  assert.equal(
    await publishMenuItem(api, "vendor", {
      item: value,
      portions: value.portions,
      choice_groups: value.choice_groups,
    }),
    "new-item",
  );
  assert.deepEqual(
    api.calls.map((call) => call[0]),
    ["item", "portion", "group", "option"],
  );
  assert.equal(api.calls[1][3].price, 120025);
  assert.equal(api.calls[2][3].is_required, true);
  assert.equal(api.calls[3][1], "new-group");
  assert.equal(api.calls[3][2].price_modifier, 35050);
  assert.equal(api.calls[3][2].price_modifier_naira, 350.5);
});
test("failed option saves reject publishing and roll back only the new item", async () => {
  const api = fakeApi(),
    value = draft();
  api.addChoiceOption = async () => {
    throw new Error("Network failed");
  };
  await assert.rejects(
    publishMenuItem(api, "vendor", {
      item: value,
      portions: value.portions,
      choice_groups: [group()],
    }),
    /draft is saved/,
  );
  assert.deepEqual(api.calls.at(-1), ["delete", "vendor", "new-item"]);
});
test("failed rollback tells the vendor to check their menu before retrying", async () => {
  const api = fakeApi(),
    value = draft();
  api.addPortion = async () => {
    throw new Error("Network failed");
  };
  api.deleteMenuItem = async () => {
    throw new Error("Network failed");
  };
  await assert.rejects(
    publishMenuItem(api, "vendor", { item: value, portions: value.portions }),
    /partly saved.*Check your menu/,
  );
});
