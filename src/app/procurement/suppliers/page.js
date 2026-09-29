"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const emptySupplier = {
  code: "",
  name: "",
  name_ar: "",
  vat_number: "",
  cr_number: "",
  phone: "",
  email: "",
  address: "",
  city: "Riyadh",
  payment_terms: "Net 30",
  rating: 5,
  is_active: true,
};

export default function SuppliersPage() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: 'create' | 'edit', row }
  const [form, setForm] = useState(emptySupplier);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setMsg("");
    api
      .get("/procurement/suppliers")
      .then((r) => {
        setRows(r.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load suppliers");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({
      ...emptySupplier,
      code: `SUP-${Date.now().toString().slice(-4)}`,
    });
    setDrawer({ mode: "create" });
  };

  const openEdit = (s) => {
    setForm({
      code: s.code || "",
      name: s.name || "",
      name_ar: s.name_ar || "",
      vat_number: s.vat_number || "",
      cr_number: s.cr_number || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      city: s.city || "Riyadh",
      payment_terms: s.payment_terms || "Net 30",
      rating: s.rating || 5,
      is_active: s.is_active !== false,
    });
    setDrawer({ mode: "edit", row: s });
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (drawer.mode === "create") {
        await api.post("/procurement/suppliers", form);
      } else {
        // In case there is an update endpoint or re-save
        await api.post("/procurement/suppliers", form);
      }
      setDrawer(null);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to save supplier");
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (cityFilter && r.city !== cityFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.name || "").toLowerCase().includes(s) ||
      (r.name_ar || "").includes(s) ||
      (r.code || "").toLowerCase().includes(s) ||
      (r.cr_number || "").includes(s) ||
      (r.vat_number || "").includes(s)
    );
  });

  const activeCount = rows.filter((r) => r.is_active !== false).length;
  const certifiedCount = rows.filter((r) => r.vat_number && r.cr_number).length;

  const columns = [
    {
      key: "code",
      label: "Code",
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>
          {r.code || "—"}
        </span>
      ),
    },
    {
      key: "name",
      label: "Supplier Name",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar name={r.name} color="#0ba360" />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            {r.name_ar && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.name_ar}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "cr_number",
      label: "CR / Commercial Reg.",
      render: (r) => r.cr_number ? <span className="badge muted sm">{r.cr_number}</span> : "—",
    },
    {
      key: "vat_number",
      label: "VAT Number",
      render: (r) => r.vat_number ? <span className="badge neutral sm">{r.vat_number}</span> : "—",
    },
    {
      key: "city",
      label: "City / Region",
      render: (r) => r.city || "Riyadh",
    },
    {
      key: "phone",
      label: "Contact",
      render: (r) => (
        <div>
          <div>{r.phone || "—"}</div>
          {r.email && <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.email}</div>}
        </div>
      ),
    },
    {
      key: "payment_terms",
      label: "Payment Terms",
      render: (r) => <span className="badge Active sm">{r.payment_terms || "Net 30"}</span>,
    },
    {
      key: "rating",
      label: "Rating",
      render: (r) => (
        <span style={{ color: "#f59e0b", letterSpacing: 2 }}>
          {"★".repeat(Math.min(5, Math.max(1, Number(r.rating || 5))))}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <button className="btn ghost sm" onClick={() => openEdit(r)}>
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div>
          <h2>Approved Vendor List (AVL)</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Tranquil Supplier Directory · Manage pre-qualified material vendors, subcontractors & Saudi CR/VAT records
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
        title="Vendors & Suppliers"
        activeFilter={cityFilter || "All Cities"}
        filterOptions={[
          { label: "All Cities", value: "" },
          { label: "Riyadh", value: "Riyadh" },
          { label: "Jeddah", value: "Jeddah" },
          { label: "Dammam", value: "Dammam" },
          { label: "Neom", value: "Neom" },
        ]}
        onFilterChange={setCityFilter}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreate}
        addLabel="Register Supplier"
        stats={[
          { label: "Total Vendors", value: rows.length },
          { label: "Active Suppliers", value: activeCount },
          { label: "Saudi CR/VAT Verified", value: certifiedCount },
        ]}
      />

      {/* CREATE / EDIT DRAWER */}
      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 850, width: "85vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>{drawer.mode === "create" ? "Register New Supplier" : "Edit Supplier Profile"}</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Maintain verified vendor contact info, tax registration, and standard payment terms
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <form onSubmit={saveSupplier} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="label">Supplier Code *</label>
                  <input
                    className="input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Supplier / Company Name *</label>
                  <input
                    className="input"
                    value={form.name}
                    placeholder="e.g. Al-Yamama Ready Mix Concrete Co."
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Name (Arabic) / الاسم بالعربي</label>
                  <input
                    className="input"
                    dir="rtl"
                    value={form.name_ar}
                    placeholder="شركة اليمامة للخرسانة الجاهزة"
                    onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Commercial Registration (CR #)</label>
                  <input
                    className="input"
                    placeholder="10-digit Saudi CR"
                    value={form.cr_number}
                    onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">ZATCA VAT Number</label>
                  <input
                    className="input"
                    placeholder="15-digit ZATCA VAT ID"
                    value={form.vat_number}
                    onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">City / Region</label>
                  <select
                    className="input"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  >
                    <option value="Riyadh">Riyadh (الرياض)</option>
                    <option value="Jeddah">Jeddah (جدة)</option>
                    <option value="Dammam">Dammam (الدمام)</option>
                    <option value="Khobar">Khobar (الخبر)</option>
                    <option value="Neom">NEOM (نيوم)</option>
                    <option value="Madinah">Madinah (المدينة)</option>
                    <option value="Makkah">Makkah (مكة)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    placeholder="+966 5X XXX XXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="sales@supplier.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Payment Terms</label>
                  <select
                    className="input"
                    value={form.payment_terms}
                    onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  >
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Immediate / COD">Immediate / Cash on Delivery</option>
                    <option value="100% Advance">100% Advance</option>
                  </select>
                </div>
                <div>
                  <label className="label">Supplier Rating</label>
                  <select
                    className="input"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  >
                    <option value={5}>★★★★★ (Grade A - Preferred)</option>
                    <option value={4}>★★★★☆ (Grade B - Qualified)</option>
                    <option value={3}>★★★☆☆ (Grade C - Standard)</option>
                    <option value={2}>★★☆☆☆ (Grade D - Conditional)</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Address / Plant Location</label>
                  <input
                    className="input"
                    placeholder="Industrial City Phase 2, Exit 18, Riyadh"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setDrawer(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
