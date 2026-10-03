// Both the older Mongo API and PostgreSQL API expose _id for menu selections.
export function categoryChoices(response) {
  const rows = Array.isArray(response)
    ? response
    : (response?.categories ?? response?.data);
  if (!Array.isArray(rows))
    throw new Error("The category list was not returned. Please retry.");
  const nodes = new Map();
  function visit(categories, parent = null) {
    for (const category of categories) {
      if (category.isActive === false || category.is_active === false) continue;
      const id = String(category._id || category.id || "");
      if (!id || !category.name) continue;
      const parentValue =
        category.parentId ||
        category.parent?._id ||
        category.parent?.id ||
        category.parent ||
        parent;
      nodes.set(id, {
        id,
        name: category.name,
        parentId: parentValue ? String(parentValue) : null,
      });
      visit(category.children || category.subCategories || [], id);
    }
  }
  visit(rows);
  const parents = new Set(
    [...nodes.values()].map((node) => node.parentId).filter(Boolean),
  );
  return [...nodes.values()]
    .filter((node) => !parents.has(node.id))
    .map((node) => {
      const path = [],
        seen = new Set([node.id]);
      let parent = nodes.get(node.parentId);
      while (parent && !seen.has(parent.id)) {
        path.unshift(parent.name);
        seen.add(parent.id);
        parent = nodes.get(parent.parentId);
      }
      return {
        ...node,
        path: path.join(" / "),
        search: [...path, node.name].join(" ").toLowerCase(),
      };
    })
    .sort((a, b) => (a.path + a.name).localeCompare(b.path + b.name));
}
