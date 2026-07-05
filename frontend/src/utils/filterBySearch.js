export function filterBySearch(items, searchText, fields) {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return items;
  }

  return items.filter((item) =>
    fields.some((field) =>
      String(item[field] ?? "")
        .toLowerCase()
        .includes(query)
    )
  );
}
