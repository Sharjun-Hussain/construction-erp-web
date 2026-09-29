"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

export default function GoodsReceiptNotesPage() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: 'create' | 'view', row }
  const [pos, setPos] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().slice(0, 10));
  const [grnNumber, setGrnNumber] = useState("");
  const [receiptLines, setReceiptLines] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setMsg("");
    api
      .get("/procurement/grns")
      .then((r) => {
        setRows(r.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load GRNs");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // Load POs for receipt creation
    api
      .get("/procurement/pos")
      .then((r) => setPos(r.data.data || []))
      .catch(() => {});
  }, [projectId]);

  const openCreate = () => {
    setDeliveryNote("");
    setGrnDate(new Date().toISOString().slice(0, 10));
    setGrnNumber("");
    setSelectedPO(null);
    setReceiptLines([]);
    setDrawer({ mode: "create" });
  };

  const onSelectPO = (poId) => {
    const po = pos.find((p) => p.id === poId);
    setSelectedPO(po || null);
    if (!po) {
      setReceiptLines([]);
      return;
    }
    // build receipt lines from po.items
    const lines = (po.items || []).map((it) => {
      const ordered = Number(it.qty || 0);
      const prevRecv = Number(it.received_qty || 0);
      const remaining = Math.max(0, ordered - prevRecv);
      return {
        po_item_id: it.id,
        material_code: it.material_code,
        description: it.description,
        unit: it.unit || "NOS",
        ordered_qty: ordered,
        prev_received_qty: prevRecv,
        remaining_qty: remaining,
        unit_rate: Number(it.unit_rate || 0),
        qty: remaining, // default to remaining
      };
    });
    setReceiptLines(lines);
  };

  const handleLineQtyChange = (idx, val) => {
    const next = [...receiptLines];
    next[idx] = { ...next[idx], qty: val };
    setReceiptLines(next);
  };

  const saveGRN = async (e) => {
    e.preventDefault();
    if (!selectedPO) {
      alert("Please select a Purchase Order");
      return;
    }
    if (!deliveryNote.trim()) {
      alert("Please enter a Delivery Note / Waybill number");
      return;
    }
    // Validate 3-way match
    for (const it of receiptLines) {
      const q = Number(it.qty || 0);
      if (q > it.remaining_qty + 0.001) {
        alert(`Over-receipt blocked for ${it.material_code}: quantity (${q}) exceeds remaining (${it.remaining_qty})`);
        return;
      }
    }
    const validLines = receiptLines.filter((it) => Number(it.qty) > 0);
    if (!validLines.length) {
      alert("Please enter receiving quantity greater than 0 for at least one item");
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      await api.post("/procurement/grns", {
        po_id: selectedPO.id,
        number: grnNumber || `GRN-${Date.now().toString().slice(-6)}`,
        date: grnDate,
        delivery_note: deliveryNote,
        items: validLines.map((it) => ({
          po_item_id: it.po_item_id,
          material_code: it.material_code,
          qty: Number(it.qty),
        })),
      });
      setDrawer(null);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create GRN");
    } finally {
      setBusy(false);
    }
  };

  const postGRN = async (id) => {
    if (!window.confirm("Post this Goods Receipt Note to inventory? This will update site stock and purchase order status.")) return;
    setBusy(true);
    try {
      await api.post(`/procurement/grns/${id}/post`);
      if (drawer?.row?.id === id) {
        setDrawer((prev) => ({ ...prev, row: { ...prev.row, status: "Posted" } }));
      }
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to post GRN");
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
      (r.delivery_note || "").toLowerCase().includes(s) ||
      (r.supplier?.name || "").toLowerCase().includes(s) ||
      (r.po?.number || "").toLowerCase().includes(s)
    );
  });

  const totalReceipts = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);
  const postedCount = rows.filter((r) => r.status === "Posted").length;

  const columns = [
    {
      key: "number",
      label: "GRN Number",
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>
          {r.number}
        </span>
      ),
    },
    {
      key: "delivery_note",
      label: "Delivery Note #",
      render: (r) => (
        <span className="badge muted sm">{r.delivery_note || "—"}</span>
      ),
    },
    {
      key: "po",
      label: "Purchase Order",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.po?.number || "—"}</div>
        </div>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BiginAvatar name={r.supplier?.name || "Supplier"} color="#0ba360" />
          <span style={{ fontWeight: 500 }}>{r.supplier?.name || "—"}</span>
        </div>
      ),
    },
    {
      key: "date",
      label: "Receipt Date",
      render: (r) => r.date ? new Date(r.date).toLocaleDateString() : "—",
    },
    {
      key: "itemsCount",
      label: "Items Received",
      render: (r) => (
        <span className="badge neutral sm">{r.items?.length || 0} line(s)</span>
      ),
    },
    {
      key: "total",
      label: "Received Value",
      render: (r) => (
        <div style={{ fontWeight: 700 }}>
          {Number(r.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span style={{ fontSize: 11, color: "var(--muted)", marginInlineStart: 4 }}>SAR</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`badge ${r.status === "Posted" ? "Won" : "Pending"}`}>
          {r.status === "Posted" ? "Posted to Stock" : r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {r.status !== "Posted" && (
            <button
              className="btn sm"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                postGRN(r.id);
              }}
            >
              Post to Stock
            </button>
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
      <div className="page-head">
        <div>
          <h2>Goods Receipt Notes (GRN)</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Tranquil 3-Way Match · Verify site physical receipt against purchase orders & update inventory
          </p>
        </div>
        <span className="spacer" />
      </div>

      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}

      <DataTable
        columns={columns}
        rows={filtered}
        total={filtered.length}
        page={1}
        limit={filtered.length || 10}
        loading={loading}
        title="Goods Receipt Notes"
        activeFilter={statusFilter || "All Statuses"}
        filterOptions={[
          { label: "All Statuses", value: "" },
          { label: "Draft", value: "Draft" },
          { label: "Posted to Stock", value: "Posted" },
        ]}
        onFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreate}
        addLabel="Receive Goods (GRN)"
        stats={[
          { label: "Total GRNs", value: rows.length },
          { label: "Posted to Stock", value: postedCount },
          {
            label: "Total Value Received",
            value: totalReceipts.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " SAR",
          },
        ]}
      />

      {/* CREATE GRN DRAWER */}
      {drawer?.mode === "create" && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 1100, width: "90vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Receive Goods Against PO</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Tranquil 3-Way Match ensures you never receive more than the approved purchase order
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <form onSubmit={saveGRN} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div>
                  <label className="label">GRN Number</label>
                  <input
                    className="input"
                    placeholder="Auto-generated if blank"
                    value={grnNumber}
                    onChange={(e) => setGrnNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Select Purchase Order *</label>
                  <select
                    className="input"
                    value={selectedPO?.id || ""}
                    onChange={(e) => onSelectPO(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Approved PO --</option>
                    {pos
                      .filter((p) => ["Approved", "PartiallyReceived"].includes(p.status))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.number} — {p.supplier?.name} ({p.project?.name})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">Delivery Note / Waybill # *</label>
                  <input
                    className="input"
                    placeholder="e.g. DN-88421"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Receipt Date *</label>
                  <input
                    className="input"
                    type="date"
                    value={grnDate}
                    onChange={(e) => setGrnDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {selectedPO && (
                <div
                  style={{
                    padding: 12,
                    background: "var(--bg-subtle)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    display: "flex",
                    gap: 20,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--muted)" }}>Supplier: </span>
                    <b>{selectedPO.supplier?.name || "—"}</b>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Project: </span>
                    <b>{selectedPO.project?.name || "—"}</b>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>PO Status: </span>
                    <span className="badge Active sm">{selectedPO.status}</span>
                  </div>
                </div>
              )}

              {/* Line items match */}
              {selectedPO && (
                <div>
                  <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                    Inspect & Record Received Quantities
                  </label>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "8px 12px" }}>Material Code</th>
                          <th style={{ padding: "8px 12px" }}>Description</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Ordered</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Prev. Received</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Remaining</th>
                          <th style={{ padding: "8px 12px", textAlign: "right", width: "150px" }}>Receive Now *</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Value (SAR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptLines.map((it, idx) => {
                          const recvVal = Number(it.qty || 0) * it.unit_rate;
                          const isOver = Number(it.qty || 0) > it.remaining_qty;
                          return (
                            <tr key={it.po_item_id} style={{ borderBottom: "1px solid var(--border)", background: isOver ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600 }}>{it.material_code}</td>
                              <td style={{ padding: "10px 12px" }}>{it.description}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>{it.ordered_qty} {it.unit}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>{it.prev_received_qty}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--primary-dark)" }}>
                                {it.remaining_qty}
                              </td>
                              <td style={{ padding: "6px 12px", textAlign: "right" }}>
                                <input
                                  className="input"
                                  type="number"
                                  min="0"
                                  max={it.remaining_qty}
                                  step="any"
                                  style={{
                                    padding: "6px 8px",
                                    textAlign: "right",
                                    borderColor: isOver ? "var(--danger)" : "var(--border)",
                                  }}
                                  value={it.qty}
                                  onChange={(e) => handleLineQtyChange(idx, e.target.value)}
                                />
                                {isOver && (
                                  <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 2 }}>
                                    Exceeds balance!
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                                {recvVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setDrawer(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy || !selectedPO}>
                  {busy ? "Processing..." : "Create Goods Receipt Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW GRN DRAWER */}
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
                  <h3>GRN: {drawer.row.number}</h3>
                  <span className={`badge ${drawer.row.status === "Posted" ? "Won" : "Pending"}`}>
                    {drawer.row.status === "Posted" ? "Posted to Site Stock" : drawer.row.status}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Delivery Note: {drawer.row.delivery_note || "—"} · Received on {drawer.row.date ? new Date(drawer.row.date).toLocaleDateString() : "—"}
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
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Purchase Order</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.po?.number || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Supplier</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.supplier?.name || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Project</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{drawer.row.project?.name || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Total Received</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "var(--primary-dark)", marginTop: 2 }}>
                    {Number(drawer.row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Received Line Items</h4>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px" }}>Material Code</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Received Qty</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Unit Rate (SAR)</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (SAR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(drawer.row.items || []).map((it) => (
                        <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{it.material_code}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                            {it.qty}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {Number(it.unit_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                            {Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                {drawer.row.status !== "Posted" ? (
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => postGRN(drawer.row.id)}
                  >
                    {busy ? "Posting..." : "✓ Post GRN & Update Inventory"}
                  </button>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
                    ✓ Inventory updated and posted to Site Stock.
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
