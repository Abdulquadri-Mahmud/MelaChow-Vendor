// Save the complete configuration. A failure must never be reported as success.
export async function publishMenuItem(
  api,
  vendorId,
  { item, portions, choice_groups = [] },
) {
  let itemId;
  try {
    const result = await api.createMenuItem(vendorId, {
      ...item,
      name: item.name.trim(),
      description: item.description?.trim() || undefined,
      vendor_section_id: item.vendor_section_id || null,
      image_url: item.image_url || undefined,
    });
    itemId =
      result?.item?._id || result?.item?.id || result?.data?._id || result?._id;
    if (!itemId)
      throw new Error(
        "The server did not return the new item ID. Check your menu before trying again.",
      );
    for (const [index, portion] of portions.entries()) {
      await api.addPortion(vendorId, itemId, {
        label: portion.label.trim(),
        price: Math.round(Number(portion.price_naira) * 100),
        is_default: portion.is_default === true,
        max_quantity: portion.max_quantity || null,
        track_stock: portion.track_stock === true,
        stock_quantity: portion.track_stock
          ? Number(portion.stock_quantity)
          : 0,
        low_stock_threshold: Number(portion.low_stock_threshold ?? 5),
        sort_order: index,
      });
    }
    for (const [index, group] of choice_groups.entries()) {
      const result = await api.addChoiceGroup(vendorId, itemId, {
        source_template_id: group.source_template_id || null,
        name: group.name.trim(),
        is_required: group.is_required === true,
        min_selections: Number(group.min_selections),
        max_selections: Number(group.max_selections),
        sort_order: index,
      });
      const groupId =
        result?.group?._id ||
        result?.choiceGroup?._id ||
        result?.data?._id ||
        result?._id;
      if (!groupId)
        throw new Error(`The server did not return an ID for “${group.name}”.`);
      for (const [optionIndex, option] of group.options.entries()) {
        await api.addChoiceOption(groupId, {
          source_template_option_id: option.source_template_option_id || null,
          label: option.label.trim(),
          price_modifier: Math.round(Number(option.price_modifier_naira) * 100),
          price_modifier_naira: Number(option.price_modifier_naira),
          image_url: option.image_url || null,
          is_available: option.is_available !== false,
          track_stock: option.track_stock === true,
          stock_quantity: option.track_stock
            ? Number(option.stock_quantity)
            : 0,
          low_stock_threshold: Number(option.low_stock_threshold ?? 5),
          sort_order: optionIndex,
        });
      }
    }
    return itemId;
  } catch (failure) {
    const reason =
      failure?.response?.data?.message ||
      failure.message ||
      "Please try again.";
    if (itemId) {
      // Only roll back the brand-new item created by this publish attempt.
      try {
        await api.deleteMenuItem(vendorId, itemId);
      } catch {
        throw new Error(
          `The item was only partly saved. Check your menu before retrying. ${reason}`,
          { cause: failure },
        );
      }
    }
    throw new Error(
      `Your item could not be published. Your draft is saved. ${reason}`,
      { cause: failure },
    );
  }
}
