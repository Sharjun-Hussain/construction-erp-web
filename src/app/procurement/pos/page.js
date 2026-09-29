"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const emptyItem = { material_code: "", description: "", unit: "NOS", qty: 1, unit_rate: 0 };
const emptyPO = {
  number: "",
  project_id: "",
  supplier_id: "",
  date: new Date().toISOString().slice(0, 10),
  delivery_date: "",
  notes: "",
  items: [{ ...emptyItem }],
};

export default function PurchaseOrdersPage() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: 'create' | 'view', row }
  const [form, setForm] = useState(emptyPO);
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Load POs
  const load = () => {
    setLoading(true);
    setMsg("");
    const q = [];
    if (projectId) q.push(`project_id=${projectId}`);
    api
      .get(`/procurement/pos${q.length ? "?" + q.join("&") : ""}`)
      .then((r) => {
        setRows(r.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load purchase orders");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    api.get("/projects?limit=100").then((r) => setProjects(r.data.data || [])).catch(() => {});
    api.get("/procurement/suppliers").then((r) => setSuppliers(r.data.data || [])).catch(() => {});
  }, [projectId]);

  // Calculations for form
  const subtotal = (form.items || []).reduce(
    (sum, it) => sum + Number(it.qty || 0) * Number(it.unit_rate || 0),
    0
  );
  const vat = subtotal * 0.15;
  const grandTotal = subtotal + vat;

  // Filtered rows
  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.number || "").toLowerCase().includes(s) ||
      (r.supplier?.name || "").toLowerCase().includes(s) ||
      (r.project?.name || "").toLowerCase().includes(s)
    );
  });

  const totalCommitted = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);
  const approvedCount = rows.filter((r) => ["Approved", "Sent", "PartiallyReceived", "Received"].includes(r.status)).length;

  const openCreate = () => {
    setForm({
      ...emptyPO,
      project_id: projectId || (projects[0]?.id || ""),
      supplier_id: suppliers[0]?.id || "",
      items: [{ ...emptyItem }],
    });
    setDrawer({ mode: "create" });
  };

  const openView = (po) => {
    setDrawer({ mode: "view", row: po });
  };

  const handleItemChange = (idx, field, val) => {
    const next = [...form.items];
    next[idx] = { ...next[idx], [field]: val };
    setForm({ ...form, items: next });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const savePO = async (e) => {
    e.preventDefault();
    if (!form.project_id) {
      alert("Please select a project");
      return;
    }
    if (!form.supplier_id) {
      alert("Please select a supplier");
      return;
    }
    if (!form.items.length || form.items.some((it) => !it.material_code || Number(it.qty) <= 0)) {
      alert("Please provide valid material code and quantity for all line items");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await api.post("/procurement/pos", {
        ...form,
        vat_pct: 15,
      });
      setDrawer(null);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create Purchase Order");
    } finally {
      setBusy(false);
    }
  };

  const approvePO = async (id) => {
    if (!window.confirm("Approve this Purchase Order?")) return;
    setBusy(true);
    try {
      await api.post(`/procurement/pos/${id}/approve`);
      if (drawer?.row?.id === id) {
        setDrawer((prev) => ({ ...prev, row: { ...prev.row, status: "Approved" } }));
      }
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to approve PO");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "number",
      label: "PO Number",
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>
          {r.number}
        </span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier / Vendor",
      render: (r) => (
        <BiginAvatar
          name={r.supplier?.name || "Supplier"}
          subline={r.supplier?.code || ""}
          color="#0ba360"
        />
      ),
    },
    {
      key: "project",
      label: "Project",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.project?.name || "—"}</div>
          {r.project?.code && <span className="badge muted sm">{r.project.code}</span>}
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (r) => r.date ? new Date(r.date).toLocaleDateString() : "—",
    },
    {
      key: "itemsCount",
      label: "Items",
      render: (r) => (
        <span className="badge neutral sm">{r.items?.length || 0} line(s)</span>
      ),
    },
    {
      key: "total",
      label: "Total (SAR)",
      render: (r) => (
        <div style={{ fontWeight: 700, color: "var(--fg)" }}>
          {Number(r.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span style={{ fontSize: 11, color: "var(--muted)", marginInlineStart: 4 }}>SAR</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const cls =
          r.status === "Approved" ? "Active" :
          r.status === "Received" ? "Won" :
          r.status === "PartiallyReceived" ? "Pending" :
          r.status === "Draft" ? "Muted" : "Active";
        return <span className={`badge ${cls}`}>{r.status}</span>;
      },
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {r.status === "Draft" && (
            <button
              className="btn sm"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                approvePO(r.id);
              }}
            >
              Approve
            </button>
          )}
          <button className="btn ghost sm" onClick={() => openView(r)}>
            {t(lang, "viewDetails")}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {msg && (
        <div className="alert err" style={{ margin: "10px 24px" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        total={filtered.length}
        page={1}
        limit={filtered.length || 10}
        loading={loading}
        title="All Purchase Orders"
        activeFilter={statusFilter ? `${statusFilter} Orders` : "All Purchase Orders"}
        filterOptions={[
          { label: "All Purchase Orders", value: "" },
          { label: "Draft Orders", value: "Draft" },
          { label: "Approved Orders", value: "Approved" },
          { label: "Partially Received", value: "PartiallyReceived" },
          { label: "Received Orders", value: "Received" },
        ]}
        onFilterSelect={(val) => setStatusFilter(val)}
        onFilterChange={setStatusFilter}
        searchPlaceholder="Search PO by number, supplier, project..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "Purchase Order",
          onClick: openCreate,
        }}
        onAdd={openCreate}
        addLabel="Purchase Order"
        stats={[
          { label: "Total POs", value: rows.length },
          { label: "Approved", value: approvedCount },
          {
            label: "Total Value",
            value: totalCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " SAR",
          },
        ]}
      />

      {/* CREATE PO DRAWER */}
      {drawer?.mode === "create" && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 1100, width: "90vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Issue Purchase Order</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Create an official PO for materials & equipment with automated 15% VAT
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <form onSubmit={savePO} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header Fields */}
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div>
                  <label className="label">PO Number</label>
                  <input
                    className="input"
                    placeholder="Auto-generated if left empty"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Project *</label>
                  <select
                    className="input"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Supplier / Vendor *</label>
                  <select
                    className="input"
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">PO Date *</label>
                  <input
                    className="input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Expected Delivery Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.delivery_date}
                    onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="label" style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                    PO Line Items
                  </label>
                  <button type="button" className="btn ghost sm" onClick={addItem}>
                    + Add Item Line
                  </button>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px", width: "18%" }}>Material Code *</th>
                        <th style={{ padding: "8px 12px", width: "32%" }}>Description *</th>
                        <th style={{ padding: "8px 12px", width: "12%" }}>Unit</th>
                        <th style={{ padding: "8px 12px", width: "12%" }}>Qty *</th>
                        <th style={{ padding: "8px 12px", width: "14%" }}>Unit Rate (SAR) *</th>
                        <th style={{ padding: "8px 12px", width: "12%", textAlign: "right" }}>Amount</th>
                        <th style={{ padding: "8px 12px", width: "30px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => {
                        const amt = Number(it.qty || 0) * Number(it.unit_rate || 0);
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: 6 }}>
                              <input
                                className="input"
                                style={{ padding: "6px 8px" }}
                                placeholder="e.g. CONC-C35"
                                value={it.material_code}
                                onChange={(e) => handleItemChange(idx, "material_code", e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ padding: 6 }}>
                              <input
                                className="input"
                                style={{ padding: "6px 8px" }}
                                placeholder="Ready-mix concrete C35/40 OPC"
                                value={it.description}
                                onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ padding: 6 }}>
                              <select
                                className="input"
                                style={{ padding: "6px 8px" }}
                                value={it.unit}
                                onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                              >
                                <option value="NOS">NOS</option>
                                <option value="M3">M3</option>
                                <option value="M2">M2</option>
                                <option value="TON">TON</option>
                                <option value="KG">KG</option>
                                <option value="LM">LM</option>
                                <option value="BAG">BAG</option>
                                <option value="SET">SET</option>
                              </select>
                            </td>
                            <td style={{ padding: 6 }}>
                              <input
                                className="input"
                                type="number"
                                min="0.01"
                                step="any"
                                style={{ padding: "6px 8px" }}
                                value={it.qty}
                                onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ padding: 6 }}>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="any"
                                style={{ padding: "6px 8px" }}
                                value={it.unit_rate}
                                onChange={(e) => handleItemChange(idx, "unit_rate", e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600 }}>
                              {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: 6, textAlign: "center" }}>
                              {form.items.length > 1 && (
                                <button
                                  type="button"
                                  className="btn ghost sm"
                                  style={{ color: "var(--danger)", padding: "2px 6px" }}
                                  onClick={() => removeItem(idx)}
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginTop: 10 }}>
                <div>
                  <label className="label">Terms & Notes</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Delivery to site batching plant, payment net 45 days upon GRN inspection..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div
                  style={{
                    background: "var(--bg-subtle)",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>Subtotal:</span>
                    <b>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>VAT (15%):</span>
                    <b>{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--primary-dark)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                      marginTop: 4,
                    }}
                  >
                    <span>Total Amount:</span>
                    <span>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setDrawer(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PO DRAWER */}
      {drawer?.mode === "view" && drawer.row && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 950, width: "88vw" }}
          >
            <div className="drawer-h">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3>PO: {drawer.row.number}</h3>
                  <span className={`badge ${drawer.row.status === "Approved" ? "Active" : "Pending"}`}>
                    {drawer.row.status}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Issued on {drawer.row.date ? new Date(drawer.row.date).toLocaleDateString() : "—"}
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Meta Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  padding: 16,
                  background: "var(--bg-subtle)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Supplier</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.supplier?.name || "—"}</div>
                  {drawer.row.supplier?.vat_number && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>VAT: {drawer.row.supplier.vat_number}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Project</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.project?.name || "—"}</div>
                  {drawer.row.project?.code && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Code: {drawer.row.project.code}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Delivery Date</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
                    {drawer.row.delivery_date ? new Date(drawer.row.delivery_date).toLocaleDateString() : "Immediate"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Total (SAR)</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "var(--primary-dark)", marginTop: 2 }}>
                    {Number(drawer.row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
                  </div>
                </div>
              </div>

              {/* Items List with Delivery Progress */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Line Items & Delivery Progress</h4>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px" }}>Code</th>
                        <th style={{ padding: "8px 12px" }}>Description</th>
                        <th style={{ padding: "8px 12px" }}>Unit</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Ordered</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Received</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Rate (SAR)</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (SAR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(drawer.row.items || []).map((it) => {
                        const recv = Number(it.received_qty || 0);
                        const ord = Number(it.qty || 0);
                        const pct = ord > 0 ? Math.min(100, Math.round((recv / ord) * 100)) : 0;
                        return (
                          <tr key={it.id || it.material_code} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{it.material_code}</td>
                            <td style={{ padding: "10px 12px" }}>{it.description}</td>
                            <td style={{ padding: "10px 12px" }}>{it.unit}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{ord}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              <span style={{ color: recv >= ord ? "var(--success)" : "inherit", fontWeight: 600 }}>
                                {recv}
                              </span>
                              <div style={{ fontSize: 10, color: "var(--muted)" }}>{pct}%</div>
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              {Number(it.unit_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                              {Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {drawer.row.notes && (
                <div style={{ padding: 12, background: "var(--bg-subtle)", borderRadius: 6, fontSize: 13 }}>
                  <b>Notes:</b> {drawer.row.notes}
                </div>
              )}

              {/* Actions Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                {drawer.row.status === "Draft" ? (
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => approvePO(drawer.row.id)}
                  >
                    {busy ? "..." : "✓ Approve Purchase Order"}
                  </button>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Approved and ready for Goods Receipt Notes (GRN).
                  </div>
                )}

                <button className="btn ghost" onClick={() => setDrawer(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
