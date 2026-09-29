"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const emptyItem = { material_code: "", description: "", unit: "NOS", qty: 1 };
const emptyIndent = {
  number: "",
  project_id: "",
  date: new Date().toISOString().slice(0, 10),
  required_by: "",
  notes: "",
  items: [{ ...emptyItem }],
};

export default function MaterialIndentsPage() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: 'create' | 'view', row }
  const [form, setForm] = useState(emptyIndent);
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setMsg("");
    const q = [];
    if (projectId) q.push(`project_id=${projectId}`);
    api
      .get(`/procurement/indents${q.length ? "?" + q.join("&") : ""}`)
      .then((r) => {
        setRows(r.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load material indents");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    api.get("/projects?limit=100").then((r) => setProjects(r.data.data || [])).catch(() => {});
  }, [projectId]);

  const openCreate = () => {
    setForm({
      ...emptyIndent,
      project_id: projectId || (projects[0]?.id || ""),
      items: [{ ...emptyItem }],
    });
    setDrawer({ mode: "create" });
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

  const saveIndent = async (e) => {
    e.preventDefault();
    if (!form.project_id) {
      alert("Please select a project");
      return;
    }
    if (!form.items.length || form.items.some((it) => !it.material_code || Number(it.qty) <= 0)) {
      alert("Please enter valid material code and quantity for all items");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await api.post("/procurement/indents", {
        ...form,
        status: "Submitted",
      });
      setDrawer(null);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create material indent");
    } finally {
      setBusy(false);
    }
  };

  const makeDecision = async (id, status) => {
    setBusy(true);
    try {
      await api.post(`/procurement/indents/${id}/decision`, { status });
      if (drawer?.row?.id === id) {
        setDrawer((prev) => ({ ...prev, row: { ...prev.row, status } }));
      }
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to update indent decision");
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.number || "").toLowerCase().includes(s) ||
      (r.project?.name || "").toLowerCase().includes(s) ||
      (r.notes || "").toLowerCase().includes(s)
    );
  });

  const pendingCount = rows.filter((r) => ["Draft", "Submitted"].includes(r.status)).length;
  const approvedCount = rows.filter((r) => ["Approved", "Ordered"].includes(r.status)).length;

  const columns = [
    {
      key: "number",
      label: "MR Number",
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>
          {r.number}
        </span>
      ),
    },
    {
      key: "project",
      label: "Project",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.project?.name || "—"}</div>
          {r.project?.code && <span className="badge muted sm">{r.project.code}</span>}
        </div>
      ),
    },
    {
      key: "date",
      label: "Request Date",
      render: (r) => r.date ? new Date(r.date).toLocaleDateString() : "—",
    },
    {
      key: "required_by",
      label: "Required By",
      render: (r) => (
        <span style={{ fontWeight: 500, color: r.required_by ? "var(--warning)" : "var(--muted)" }}>
          {r.required_by ? new Date(r.required_by).toLocaleDateString() : "Immediate"}
        </span>
      ),
    },
    {
      key: "itemsCount",
      label: "Items",
      render: (r) => <span className="badge neutral sm">{r.items?.length || 0} material(s)</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const cls =
          r.status === "Approved" ? "Active" :
          r.status === "Ordered" ? "Won" :
          r.status === "Rejected" ? "Suspended" : "Pending";
        return <span className={`badge ${cls}`}>{r.status}</span>;
      },
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {["Draft", "Submitted"].includes(r.status) && (
            <>
              <button
                className="btn sm"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={(e) => {
                  e.stopPropagation();
                  makeDecision(r.id, "Approved");
                }}
              >
                Approve
              </button>
              <button
                className="btn ghost sm"
                style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  makeDecision(r.id, "Rejected");
                }}
              >
                Reject
              </button>
            </>
          )}
          <button className="btn ghost sm" onClick={() => setDrawer({ mode: "view", row: r })}>
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
        title="All Material Indents (MR)"
        activeFilter={statusFilter ? `${statusFilter} Indents` : "All Material Indents"}
        filterOptions={[
          { label: "All Material Indents", value: "" },
          { label: "Submitted Indents", value: "Submitted" },
          { label: "Approved Indents", value: "Approved" },
          { label: "Ordered Indents", value: "Ordered" },
          { label: "Rejected Indents", value: "Rejected" },
        ]}
        onFilterSelect={(val) => setStatusFilter(val)}
        onFilterChange={setStatusFilter}
        searchPlaceholder="Search indents by number, project, site notes..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "Material Indent",
          onClick: openCreate,
        }}
        onAdd={openCreate}
        addLabel="Material Indent"
        stats={[
          { label: "Total Requisitions", value: rows.length },
          { label: "Pending Approvals", value: pendingCount },
          { label: "Approved / Ordered", value: approvedCount },
        ]}
      />

      {/* CREATE INDENT DRAWER */}
      {drawer?.mode === "create" && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 1000, width: "88vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Raise Site Material Indent (MR)</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Submit site requisitions to head office procurement for RFQ floating or direct purchase
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <form onSubmit={saveIndent} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div>
                  <label className="label">MR Number</label>
                  <input
                    className="input"
                    placeholder="Auto-generated if blank"
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
                  <label className="label">Request Date *</label>
                  <input
                    className="input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Required By Site Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.required_by}
                    onChange={(e) => setForm({ ...form, required_by: e.target.value })}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="label" style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                    Requisitioned Materials
                  </label>
                  <button type="button" className="btn ghost sm" onClick={addItem}>
                    + Add Material
                  </button>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px", width: "25%" }}>Material Code *</th>
                        <th style={{ padding: "8px 12px", width: "45%" }}>Description *</th>
                        <th style={{ padding: "8px 12px", width: "15%" }}>Unit</th>
                        <th style={{ padding: "8px 12px", width: "15%" }}>Required Qty *</th>
                        <th style={{ padding: "8px 12px", width: "30px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: 6 }}>
                            <input
                              className="input"
                              style={{ padding: "6px 8px" }}
                              placeholder="e.g. REBAR-16MM"
                              value={it.material_code}
                              onChange={(e) => handleItemChange(idx, "material_code", e.target.value)}
                              required
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              className="input"
                              style={{ padding: "6px 8px" }}
                              placeholder="High tensile steel rebar 16mm Grade 60"
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
                              <option value="TON">TON</option>
                              <option value="M3">M3</option>
                              <option value="M2">M2</option>
                              <option value="KG">KG</option>
                              <option value="LM">LM</option>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="label">Site Notes / Justification</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Required for foundation raft casting scheduled next Tuesday..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setDrawer(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Submitting..." : "Submit Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INDENT DRAWER */}
      {drawer?.mode === "view" && drawer.row && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 850, width: "85vw" }}
          >
            <div className="drawer-h">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3>Indent: {drawer.row.number}</h3>
                  <span className="badge Active">{drawer.row.status}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Requested on {drawer.row.date ? new Date(drawer.row.date).toLocaleDateString() : "—"}
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Project</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.project?.name || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Required By</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2, color: "var(--warning)" }}>
                    {drawer.row.required_by ? new Date(drawer.row.required_by).toLocaleDateString() : "Immediate"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Status</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.status}</div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Requested Material Items</h4>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px" }}>Material Code</th>
                        <th style={{ padding: "8px 12px" }}>Description</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Required Quantity</th>
                        <th style={{ padding: "8px 12px" }}>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(drawer.row.items || []).map((it) => (
                        <tr key={it.id || it.material_code} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{it.material_code}</td>
                          <td style={{ padding: "10px 12px" }}>{it.description}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--primary-dark)" }}>
                            {it.qty}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {drawer.row.notes && (
                <div style={{ padding: 12, background: "var(--bg-subtle)", borderRadius: 6, fontSize: 13 }}>
                  <b>Site Notes:</b> {drawer.row.notes}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                {["Draft", "Submitted"].includes(drawer.row.status) ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => makeDecision(drawer.row.id, "Approved")}
                    >
                      {busy ? "..." : "✓ Approve Indent"}
                    </button>
                    <button
                      className="btn ghost"
                      style={{ color: "var(--danger)" }}
                      disabled={busy}
                      onClick={() => makeDecision(drawer.row.id, "Rejected")}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Requisition decision completed: <b>{drawer.row.status}</b>
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
