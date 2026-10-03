const validPrice = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;
export function validateMenuDraft(draft, step = 5) {
  if (step === 1 || step === 5) {
    if (draft.name?.trim().length < 2 || !draft.name?.trim())
      return "Give your item a name of at least two characters.";
    if (!draft.item_type) return "Choose an item type.";
    if (
      draft.prep_time_minutes != null &&
      (!Number.isInteger(Number(draft.prep_time_minutes)) ||
        Number(draft.prep_time_minutes) < 1 ||
        Number(draft.prep_time_minutes) > 120)
    )
      return "Preparation time must be between 1 and 120 minutes.";
  }
  if ((step === 2 || step === 5) && !draft.platform_category_id)
    return "Choose a category so customers can find this item.";
  if (step === 3 || step === 5) {
    if (
      !draft.portions?.length ||
      draft.portions.some(
        (portion) => !portion.label?.trim() || !validPrice(portion.price_naira),
      )
    )
      return "Every size needs a name and a price greater than zero.";
    if (
      new Set(
        draft.portions.map((portion) => portion.label.trim().toLowerCase()),
      ).size !== draft.portions.length
    )
      return "Use a different name for each size.";
    if (
      draft.portions.some(
        (portion) =>
          portion.track_stock &&
          (!Number.isInteger(Number(portion.stock_quantity)) ||
            Number(portion.stock_quantity) < 0),
      )
    )
      return "Stock must be a whole number of zero or more.";
  }
  if (step === 4 || step === 5) {
    for (const group of draft.choice_groups || []) {
      const options = group.options || [];
      if (!group.name?.trim())
        return "Give every choice group a name, or remove the unused group.";
      if (!options.length || options.some((option) => !option.label?.trim()))
        return `Add named options to “${group.name}”, or remove the group.`;
      if (
        options.some(
          (option) =>
            !Number.isFinite(Number(option.price_modifier_naira)) ||
            Number(option.price_modifier_naira) < 0,
        )
      )
        return `Extra prices in “${group.name}” must be zero or more.`;
      const minimum = Number(group.min_selections),
        maximum = Number(group.max_selections);
      if (
        !Number.isInteger(minimum) ||
        !Number.isInteger(maximum) ||
        minimum < 0 ||
        maximum < 1 ||
        minimum > maximum ||
        (group.is_required && minimum < 1)
      )
        return `Check the selection limits for “${group.name}”.`;
      const available = options.filter(
        (option) =>
          option.is_available !== false &&
          (!option.track_stock || Number(option.stock_quantity) > 0),
      ).length;
      if (minimum > available)
        return `“${group.name}” needs at least ${minimum} available options.`;
      if (
        options.some(
          (option) =>
            option.track_stock &&
            (!Number.isInteger(Number(option.stock_quantity)) ||
              Number(option.stock_quantity) < 0),
        )
      )
        return `Stock in “${group.name}” must be a whole number of zero or more.`;
    }
  }
  return null;
}
