"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const emptyMaterial = {
  code: "",
  description: "",
  category: "General",
  unit: "NOS",
  min_qty: 10,
  last_rate: 0,
  is_active: true,
};

export default function MaterialsPage() {
  const { lang, projectId } = useAppStore();
  const [tab, setTab] = useState("catalog"); // 'catalog' | 'stock'
  const [materials, setMaterials] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(emptyMaterial);
  const [busy, setBusy] = useState(false);

  const loadData = () => {
    setLoading(true);
    setMsg("");

    Promise.all([
      api.get("/procurement/materials"),
      api.get(`/procurement/stock${projectId ? "?project_id=" + projectId : ""}`),
      api.get("/procurement/reorder"),
    ])
      .then(([matRes, stockRes, reorderRes]) => {
        setMaterials(matRes.data.data || []);
        setStocks(stockRes.data.data || []);
        setReorders(reorderRes.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load materials and inventory");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const openCreate = () => {
    setForm({
      ...emptyMaterial,
      code: `MAT-${Date.now().toString().slice(-4)}`,
    });
    setDrawer(true);
  };

  const saveMaterial = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.post("/procurement/materials", {
        ...form,
        min_qty: Number(form.min_qty || 0),
        last_rate: Number(form.last_rate || 0),
      });
      setDrawer(false);
      loadData();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to save material");
    } finally {
      setBusy(false);
    }
  };

  // Filtered
  const filteredMaterials = materials.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (m.code || "").toLowerCase().includes(s) ||
      (m.description || "").toLowerCase().includes(s) ||
      (m.category || "").toLowerCase().includes(s)
    );
  });

  const filteredStocks = stocks.filter((stk) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (stk.material_code || "").toLowerCase().includes(s) ||
      (stk.description || "").toLowerCase().includes(s)
    );
  });

  const catalogColumns = [
    {
      key: "code",
      label: "Material Code",
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>
          {r.code}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      sortable: true,
      render: (r) => <div style={{ fontWeight: 500 }}>{r.description}</div>,
    },
    {
      key: "category",
      label: "Category",
      render: (r) => <span className="badge muted sm">{r.category || "General"}</span>,
    },
    {
      key: "unit",
      label: "Unit of Measure",
      render: (r) => <span className="badge neutral sm">{r.unit}</span>,
    },
    {
      key: "min_qty",
      label: "Min. Threshold",
      render: (r) => (
        <div style={{ fontWeight: 600 }}>
          {r.min_qty} {r.unit}
        </div>
      ),
    },
    {
      key: "last_rate",
      label: "Last Purchase Rate",
      render: (r) => (
        <div style={{ fontWeight: 700, color: "var(--fg)" }}>
          {Number(r.last_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          <span style={{ fontSize: 11, color: "var(--muted)", marginInlineStart: 4 }}>SAR</span>
        </div>
      ),
    },
  ];

  const stockColumns = [
    {
      key: "material_code",
      label: "Material Code",
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>
          {r.material_code}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (r) => r.description || "—",
    },
    {
      key: "unit",
      label: "Unit",
      render: (r) => r.unit || "NOS",
    },
    {
      key: "qty",
      label: "On-Hand Balance",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 14,
              color: Number(r.qty || 0) > 0 ? "var(--success)" : "var(--danger)",
            }}
          >
            {Number(r.qty || 0).toLocaleString()}
          </span>
          <span className="badge Active sm">In Stock</span>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div>
          <h2>Materials & Stock Management</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Tranquil Inventory & Catalog · Master material codes, purchase price benchmarks & project site balances
          </p>
        </div>
        <span className="spacer" />
      </div>

      {/* REORDER SHORTAGE ALERT BANNER */}
      {reorders.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <b style={{ color: "var(--danger)" }}>
                Low Stock Alert ({reorders.length} material{reorders.length > 1 ? "s" : ""})
              </b>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                The following materials are below their minimum safety stock threshold:{" "}
                {reorders.map((x) => `${x.material_code} (Shortage: ${x.shortage} ${x.unit})`).join(", ")}
              </div>
            </div>
          </div>
          <a href="/procurement/indents" className="btn sm" style={{ textDecoration: "none" }}>
            + Raise Indent
          </a>
        </div>
      )}

      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
        <button
          className={`btn ${tab === "catalog" ? "" : "ghost"}`}
          onClick={() => setTab("catalog")}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          Material Master Catalog ({materials.length})
        </button>
        <button
          className={`btn ${tab === "stock" ? "" : "ghost"}`}
          onClick={() => setTab("stock")}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          Site Physical Stock ({stocks.length})
        </button>
      </div>

      {tab === "catalog" ? (
        <DataTable
          columns={catalogColumns}
          rows={filteredMaterials}
          total={filteredMaterials.length}
          page={1}
          limit={filteredMaterials.length || 10}
          loading={loading}
          title="Material Catalog"
          search={search}
          onSearchChange={setSearch}
          onAdd={openCreate}
          addLabel="New Material Item"
          stats={[
            { label: "Catalog Items", value: materials.length },
            { label: "Shortage Alerts", value: reorders.length },
          ]}
        />
      ) : (
        <DataTable
          columns={stockColumns}
          rows={filteredStocks}
          total={filteredStocks.length}
          page={1}
          limit={filteredStocks.length || 10}
          loading={loading}
          title="Site Stock Balances"
          search={search}
          onSearchChange={setSearch}
          stats={[
            { label: "Stocked Items", value: stocks.length },
            {
              label: "Total Units on Hand",
              value: stocks.reduce((acc, s) => acc + Number(s.qty || 0), 0).toLocaleString(),
            },
          ]}
        />
      )}

      {/* CREATE MATERIAL DRAWER */}
      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(false)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 750, width: "80vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Add Material to Catalog</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Define material code, standard unit, and minimum reorder alert threshold
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(false)}>×</button>
            </div>

            <form onSubmit={saveMaterial} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="label">Material Code *</label>
                  <input
                    className="input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Concrete & Masonry">Concrete & Masonry</option>
                    <option value="Steel & Rebar">Steel & Rebar</option>
                    <option value="Piping & MEP">Piping & MEP</option>
                    <option value="Finishes & Tiles">Finishes & Tiles</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Safety & Consumables">Safety & Consumables</option>
                    <option value="General">General Construction</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Description / Specifications *</label>
                  <input
                    className="input"
                    placeholder="e.g. Portland Cement Type I (50 KG Bag)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Unit of Measure</label>
                  <select
                    className="input"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="NOS">NOS (Number)</option>
                    <option value="BAG">BAG</option>
                    <option value="TON">TON</option>
                    <option value="KG">KG</option>
                    <option value="M3">M3 (Cubic Meter)</option>
                    <option value="M2">M2 (Square Meter)</option>
                    <option value="LM">LM (Linear Meter)</option>
                    <option value="SET">SET</option>
                  </select>
                </div>
                <div>
                  <label className="label">Minimum Stock Alert Threshold</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={form.min_qty}
                    onChange={(e) => setForm({ ...form, min_qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Benchmark Rate (SAR)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={form.last_rate}
                    onChange={(e) => setForm({ ...form, last_rate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setDrawer(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
