import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import AppDataGrid from "./common/AppDataGrid";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";

function Asset({ searchText = "" }) {
  const [assets, setAssets] = useState([]);
  const { setInsight } = usePageInsight();

  const filteredAssets = useMemo(
    () => filterBySearch(assets, searchText, ["dname", "ddesc", "updated"]),
    [assets, searchText]
  );

  const columnDefs = useMemo(
    () => [
      { field: "dname", headerName: "Document Name" },
      { field: "ddesc", headerName: "Document Description" },
      { field: "updated", headerName: "Updated Date", minWidth: 170 },
    ],
    []
  );

  useEffect(() => {
    fetchAsset();
  }, []);

  useEffect(() => {
    setInsight({
      recordCount: filteredAssets.length,
      selectedCount: 0,
    });
  }, [filteredAssets.length, setInsight]);

  const fetchAsset = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/Asset");
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid-page">
      <AppDataGrid
        rowData={filteredAssets}
        columnDefs={columnDefs}
        searchPlaceholder="Search assets..."
        overlayNoRowsTemplate="<span>No assets found.</span>"
      />
    </div>
  );
}

export default Asset;
