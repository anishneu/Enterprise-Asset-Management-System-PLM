import GridEditIconCellRenderer from "./GridEditIconCellRenderer";

export const multiRowSelection = {
  mode: "multiRow",
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: true,
};

export function createEditColumn() {
  return {
    headerName: "",
    field: "edit",
    width: 52,
    maxWidth: 52,
    minWidth: 52,
    sortable: false,
    filter: false,
    resizable: false,
    pinned: "left",
    suppressHeaderMenuButton: true,
    cellClass: "grid-edit-cell",
    cellRenderer: GridEditIconCellRenderer,
  };
}
