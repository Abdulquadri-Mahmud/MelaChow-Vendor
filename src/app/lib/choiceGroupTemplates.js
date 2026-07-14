export const templateToChoiceGroupSnapshot = (template, sequence = 0) => {
    const seed = `${Date.now()}-${sequence}`;
    return {
        tempId: `template-${template._id}-${seed}`,
        source_template_id: template._id,
        name: template.name,
        is_required: template.is_required,
        min_selections: template.min_selections,
        max_selections: template.max_selections,
        sort_order: template.sort_order || 0,
        options: (template.options || []).map((option, optionIndex) => ({
            tempId: `template-option-${option._id || optionIndex}-${seed}`,
            label: option.label,
            price_modifier_naira: Number(option.price_modifier_naira) || 0,
            image_url: option.image_url || null,
            is_available: option.is_available !== false,
            track_stock: option.track_stock === true,
            stock_quantity: option.track_stock ? Math.max(0, Number(option.stock_quantity) || 0) : 0,
            low_stock_threshold: Math.max(0, Number(option.low_stock_threshold) || 0),
            sort_order: option.sort_order ?? optionIndex,
        })),
    };
};
