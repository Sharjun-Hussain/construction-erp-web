"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const emptyForm = {
  is_default: false,
  locator_available: false,
  code: "",
  name: "",
  name_ar: "",
  address: "",
  address_ar: "",
  contact_person: "",
  contact_person_ar: "",
  phone: "",
  description: "",
  is_active: true,
};

function TranquilWarehouseModal({ isOpen, onClose, onSaved, editRow = null }) {
  const { lang } = useAppStore();
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editRow) {
      setForm({
        is_default: Boolean(editRow.is_default),
        locator_available: Boolean(editRow.locator_available),
        code: editRow.code || "",
        name: editRow.name || "",
        name_ar: editRow.name_ar || "",
        address: editRow.address || "",
        address_ar: editRow.address_ar || "",
        contact_person: editRow.contact_person || "",
        contact_person_ar: editRow.contact_person_ar || "",
        phone: editRow.phone || "",
        description: editRow.description || "",
        is_active: editRow.is_active !== false,
      });
    } else {
      setForm(emptyForm);
    }
    setMsg("");
  }, [editRow, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      setMsg("Please enter WAREHOUSE NAME.");
      return;
    }

    setSaving(true);
    setMsg("");

    try {
      const generatedCode =
        form.code.trim() ||
        form.name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")
          .slice(0, 15) ||
        `WH_${Date.now()}`;

      const payload = {
        ...form,
        code: generatedCode,
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || null,
        address: form.address.trim() || null,
        address_ar: form.address_ar.trim() || null,
        contact_person: form.contact_person.trim() || null,
        contact_person_ar: form.contact_person_ar.trim() || null,
        phone: form.phone.trim() || null,
        description: form.description.trim() || null,
      };

      if (editRow?.id) {
        await api.put(`/warehouses/${editRow.id}`, payload);
      } else {
        await api.post("/warehouses", payload);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || "Failed to save warehouse. Please check all fields.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 780,
          background: "#ffffff",
          borderRadius: 8,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
      >
        {/* 1. DARK SLATE HEADER BAR */}
        <div
          style={{
            background: "#0f172a",
            color: "#ffffff",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            {editRow ? "Edit Warehouse" : "Warehouse"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 4px",
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* 2. SCROLLABLE FORM BODY MATCHING SCREENSHOT */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ padding: "20px 28px 24px", overflowY: "auto", flex: 1, background: "#ffffff" }}>
            {msg && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ⚠️ {msg}
              </div>
            )}

            {/* TOP TOGGLES ROW: DEFAULT WAREHOUSE & LOCATOR AVAILABLE */}
            <div style={{ display: "flex", gap: 32, marginBottom: 18 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11.5,
                  fontWeight: 750,
                  color: "#ea580c", // Orange bold text matching screenshot
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: "#ea580c" }}
                />
                <span>DEFAULT WAREHOUSE</span>
              </label>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11.5,
                  fontWeight: 750,
                  color: "#ea580c", // Orange bold text matching screenshot
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.locator_available}
                  onChange={(e) => setForm({ ...form, locator_available: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: "#ea580c" }}
                />
                <span>LOCATOR AVAILABLE</span>
              </label>
            </div>

            {/* Field: WAREHOUSE CODE */}
            <div style={{ marginBottom: 16, maxWidth: 260 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  color: "#475569",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                WAREHOUSE CODE
              </label>
              <input
                type="text"
                className="input"
                style={{
                  width: "100%",
                  height: 36,
                  fontSize: 13,
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  padding: "0 10px",
                }}
                placeholder="e.g. WH-RYD-01"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            {/* Field Row: WAREHOUSE NAME & WAREHOUSE NAME ARABIC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 750,
                    color: "#475569",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  WAREHOUSE NAME *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: "100%",
                    height: 36,
                    fontSize: 13,
                    borderRadius: 5,
                    border: "1px solid #cbd5e1",
                    padding: "0 10px",
                  }}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 750,
                    color: "#475569",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  WAREHOUSE NAME ARABIC
                </label>
                <input
                  type="text"
                  className="input"
                  dir="rtl"
                  style={{
                    width: "100%",
                    height: 36,
                    fontSize: 13,
                    borderRadius: 5,
                    border: "1px solid #cbd5e1",
                    padding: "0 10px",
                  }}
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                />
              </div>
            </div>

            {/* Field: ADDRESS LINE 1 */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  color: "#475569",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                ADDRESS LINE 1
              </label>
              <input
                type="text"
                className="input"
                style={{
                  width: "100%",
                  height: 36,
                  fontSize: 13,
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  padding: "0 10px",
                }}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {/* Field: ADDRESS ARABIC */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  color: "#475569",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                ADDRESS ARABIC
              </label>
              <input
                type="text"
                className="input"
                dir="rtl"
                style={{
                  width: "100%",
                  height: 36,
                  fontSize: 13,
                  borderRadius: 5,
                  border: "1px solid #cbd5e1",
                  padding: "0 10px",
                }}
                value={form.address_ar}
                onChange={(e) => setForm({ ...form, address_ar: e.target.value })}
              />
            </div>

            {/* 3-Field Grid: CONTACT PERSON | CONTACT PERSON ARABIC | PHONE */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 750,
                    color: "#475569",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  CONTACT PERSON
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: "100%",
                    height: 36,
                    fontSize: 13,
                    borderRadius: 5,
                    border: "1px solid #cbd5e1",
                    padding: "0 10px",
                  }}
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 750,
                    color: "#475569",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  CONTACT PERSON ARABIC
                </label>
                <input
                  type="text"
                  className="input"
                  dir="rtl"
                  style={{
                    width: "100%",
                    height: 36,
                    fontSize: 13,
                    borderRadius: 5,
                    border: "1px solid #cbd5e1",
                    padding: "0 10px",
                  }}
                  value={form.contact_person_ar}
                  onChange={(e) => setForm({ ...form, contact_person_ar: e.target.value })}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 750,
                    color: "#475569",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  PHONE
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: "100%",
                    height: 36,
                    fontSize: 13,
                    borderRadius: 5,
                    border: "1px solid #cbd5e1",
                    padding: "0 10px",
                  }}
                  placeholder="+966 50 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Field: DESCRIPTION WITH FORMATTING TOOLBAR */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 750,
                  color: "#475569",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                DESCRIPTION
              </label>
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                {/* Mini Formatting Toolbar matching screenshot */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "6px 12px",
                    borderBottom: "1px solid #cbd5e1",
                    fontSize: 12,
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontWeight: 800, cursor: "pointer" }}>B</span>
                  <span style={{ fontStyle: "italic", cursor: "pointer" }}>I</span>
                  <span style={{ textDecoration: "underline", cursor: "pointer" }}>U</span>
                  <span style={{ cursor: "pointer" }}>🧹</span>
                  <span style={{ cursor: "pointer" }}>11 ▾</span>
                  <span style={{ cursor: "pointer" }}>≡</span>
                  <span style={{ cursor: "pointer" }}>1.</span>
                  <span style={{ cursor: "pointer" }}>▦ ▾</span>
                </div>
                <textarea
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                  placeholder="Enter warehouse specifications or site layout notes..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* 3. PINNED BOTTOM FOOTER BAR */}
          <div
            style={{
              background: "#f1f5f9",
              padding: "14px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              borderTop: "1px solid #e2e8f0",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "8px 22px",
                fontSize: 13,
                fontWeight: 650,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                background: "#0ba360",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 28px",
                fontSize: 13,
                fontWeight: 750,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehousePage() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const loadWarehouses = () => {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    api
      .get(`/warehouses${q}`)
      .then((r) => {
        setRows(r.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearTimeout(window.__wh);
    window.__wh = setTimeout(loadWarehouses, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleToggleActive = async (r) => {
    try {
      await api.put(`/warehouses/${r.id}`, { is_active: !r.is_active });
      loadWarehouses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${r.name}"?`)) return;
    try {
      await api.delete(`/warehouses/${r.id}`);
      loadWarehouses();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      key: "code",
      label: "CODE",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, fontWeight: 750, color: "#0f172a", fontSize: 12 }}>
            {r.code}
          </code>
          {r.is_default && (
            <span style={{ fontSize: 10, fontWeight: 700, background: "#fff7ed", color: "#ea580c", border: "1px solid #ffedd5", borderRadius: 4, padding: "1px 6px" }}>
              DEFAULT
            </span>
          )}
          {r.locator_available && (
            <span style={{ fontSize: 10, fontWeight: 700, background: "#f0f9ff", color: "#0284c7", border: "1px solid #e0f2fe", borderRadius: 4, padding: "1px 6px" }}>
              LOCATOR
            </span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "WAREHOUSE NAME",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BiginAvatar name={r.name || "WH"} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5 }}>{r.name}</span>
            {r.name_ar && <span style={{ fontSize: 11, color: "#64748b" }} dir="rtl">{r.name_ar}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "contact_person",
      label: "CONTACT & PHONE",
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 650, color: "#334155", fontSize: 12.5 }}>{r.contact_person || "—"}</span>
          {r.phone && <span style={{ fontSize: 11, color: "#64748b" }}>📞 {r.phone}</span>}
        </div>
      ),
    },
    {
      key: "address",
      label: "LOCATION ADDRESS",
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "#475569" }} className="truncate">
          {r.address || r.address_ar || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      render: (r) => (
        <span className={`badge ${r.is_active ? "Approved" : "Draft"}`}>
          {r.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              setEditRow(r);
              setModalOpen(true);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => handleToggleActive(r)}
          >
            {r.is_active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: "#ef4444" }}
            onClick={() => handleDelete(r)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      <DataTable
        title="Warehouses"
        subtitle="Central storage yards, site laydown areas, locator settings & dispatch logistics"
        rows={rows}
        columns={columns}
        loading={loading}
        total={rows.length}
        searchPlaceholder="Search warehouse name, code, contact, phone..."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => {
          setEditRow(null);
          setModalOpen(true);
        }}
        addLabel="+ Warehouse"
      />

      {/* FULL TRANQUIL WAREHOUSE MODAL */}
      <TranquilWarehouseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadWarehouses}
        editRow={editRow}
      />
    </div>
  );
}
