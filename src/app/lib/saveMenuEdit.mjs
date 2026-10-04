export const entityId = value => String(value?._id || value?.id || '');
export async function saveMenuEdit({vendorId, itemId, draft, original, api, onCreated = () => {}}) {
  await api.updateMenuItem(vendorId, itemId, {
    name:draft.name.trim(), description:draft.description.trim() || null,
    image_url:draft.image_url || null, item_type:draft.item_type,
    dietary_type:draft.dietary_type, prep_time_minutes:draft.prep_time_minutes,
    tags:draft.tags, platform_category_id:draft.platform_category_id,
    vendor_section_id:draft.vendor_section_id || null,
  });
  for(const [index, portion] of draft.portions.entries()) {
    const payload={label:portion.label.trim(),price:Math.round(Number(portion.price_naira)*100),is_default:!!portion.is_default,
      max_quantity:portion.max_quantity || null,track_stock:!!portion.track_stock,
      stock_quantity:portion.track_stock ? Number(portion.stock_quantity) : 0,low_stock_threshold:Number(portion.low_stock_threshold)||0,sort_order:index};
    if(original.portions.some(p=>entityId(p)===portion.tempId)) await api.updatePortion(vendorId,itemId,portion.tempId,payload);
    else {
      const result=await api.addPortion(vendorId,itemId,payload), id=entityId(result.portion || result);
      if(!id) throw new Error('The new portion was saved without a reference. Refresh this item before retrying.');
      original.portions.push({_id:id}); onCreated('portion',portion.tempId,id); portion.tempId=id;
    }
  }
  for(const [index,group] of draft.choice_groups.entries()) {
    const payload={name:group.name.trim(),is_required:!!group.is_required,min_selections:Number(group.min_selections),max_selections:Number(group.max_selections),sort_order:index,source_template_id:group.source_template_id || null};
    let baseline=original.choice_groups.find(g=>entityId(g)===group.tempId);
    if(baseline) await api.updateChoiceGroup(vendorId,itemId,group.tempId,payload);
    else {
      const result=await api.addChoiceGroup(vendorId,itemId,payload), id=entityId(result.group || result.choiceGroup || result);
      if(!id) throw new Error('The new group was saved without a reference. Refresh this item before retrying.');
      baseline={_id:id,options:[]}; original.choice_groups.push(baseline);onCreated('group',group.tempId,id);group.tempId=id;
    }
    for(const [optionIndex,option] of group.options.entries()) {
      const optionPayload={label:option.label.trim(),price_modifier:Math.round(Number(option.price_modifier_naira)*100),price_modifier_naira:Number(option.price_modifier_naira),image_url:option.image_url || null,is_available:option.is_available!==false,track_stock:!!option.track_stock,stock_quantity:option.track_stock ? Number(option.stock_quantity):0,low_stock_threshold:Number(option.low_stock_threshold)||0,sort_order:optionIndex,source_template_option_id:option.source_template_option_id || null};
      if((baseline.options || []).some(o=>entityId(o)===option.tempId)) await api.updateChoiceOption(group.tempId,option.tempId,optionPayload);
      else {
        const result=await api.addChoiceOption(group.tempId,optionPayload),id=entityId(result.option || result);
        if(!id) throw new Error('The new option was saved without a reference. Refresh this item before retrying.');
        (baseline.options ||= []).push({_id:id});onCreated('option',option.tempId,id,group.tempId);option.tempId=id;
      }
    }
    for(const old of [...(baseline.options || [])]) if(!group.options.some(o=>o.tempId===entityId(old))) {
      await api.deleteChoiceOption(group.tempId,entityId(old));baseline.options=baseline.options.filter(o=>entityId(o)!==entityId(old));
    }
  }
  for(const old of [...original.choice_groups]) if(!draft.choice_groups.some(g=>g.tempId===entityId(old))) {
    await api.deleteChoiceGroup(vendorId,itemId,entityId(old));original.choice_groups=original.choice_groups.filter(g=>entityId(g)!==entityId(old));
  }
  for(const old of [...original.portions]) if(!draft.portions.some(p=>p.tempId===entityId(old))) {
    await api.deleteMenuItemPortion(vendorId,itemId,entityId(old));original.portions=original.portions.filter(p=>entityId(p)!==entityId(old));
  }
}
