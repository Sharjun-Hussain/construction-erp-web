"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

function EditIcon({ size = 13, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BuildingIcon({ size = 14, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function CheckCircleIcon({ size = 14, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

const SAUDI_CITIES = [
  "Riyadh",
  "Jeddah",
  "Dammam",
  "Mecca",
  "Medina",
  "Khobar",
  "Neom",
  "Tabuk",
  "Al-Ula",
  "Dhahran",
  "Yanbu",
  "Jizan",
  "Jubail",
  "Abha",
];

const emptyForm = {
  // Company & ZATCA details
  name: "",
  name_ar: "",
  cr_number: "",
  vat_number: "",
  city: "Riyadh",
  address: "",
  national_address: "",
  email: "",
  phone: "",
  currency: "SAR",
  language_default: "en",

  // Modules Enabled
  projects_enabled: true,
  estimation_enabled: true,
  zatca_enabled: true,
  hrm_enabled: true,
  accounting_enabled: true,

  // Initial Org Admin Credentials
  admin_name: "",
  admin_email: "",
  admin_password: "",
  admin_phone: "",
};

export default function Organizations() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [counts, setCounts] = useState({ active: 0, inactive: 0 });
  const [search, setSearch] = useState("");
  const [activeF, setActiveF] = useState("");

  // URL Parameter state: ?new=1, ?view=<id>, ?edit=<id>
  const [showNew, setShowNew] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  // New Provisioning Form State
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("tab-company");
  const [tempPw, setTempPw] = useState("");
  const [copiedPw, setCopiedPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Synchronize state with URL parameters
  const updateUrlParam = useCallback((setMap = {}, removeKeys = []) => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    removeKeys.forEach((k) => sp.delete(k));
    Object.entries(setMap).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
      else sp.delete(k);
    });
    const qs = sp.toString();
    const newUrl = window.location.pathname + (qs ? "?" + qs : "");
    window.history.pushState(null, "", newUrl);
  }, []);

  const syncFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("new");
    const v = sp.get("view");
    const e = sp.get("edit");

    setShowNew(n === "1" || n === "true");
    setViewId(v || null);
    setEditId(e || null);
  }, []);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [syncFromUrl]);

  // Load organizations
  const load = (p = page, l = limit, sQuery = search, activeStatus = activeF) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (sQuery) q.push("search=" + encodeURIComponent(sQuery));
    if (activeStatus !== undefined && activeStatus !== "") q.push("is_active=" + activeStatus);
    api.get("/organizations?" + q.join("&"))
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    api.get("/organizations?limit=1&is_active=true").then((r) => setCounts((c) => ({ ...c, active: r.data.meta?.total || 0 }))).catch(() => {});
    api.get("/organizations?limit=1&is_active=false").then((r) => setCounts((c) => ({ ...c, inactive: r.data.meta?.total || 0 }))).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    load(1, limit, search, activeF);
    setPage(1);
    setSelected([]);
  }, [activeF]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1, limit, search, activeF);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Drawer handlers
  const openNew = () => {
    setForm(emptyForm);
    setTempPw("");
    setCopiedPw(false);
    setShowNew(true);
    setViewId(null);
    setEditId(null);
    updateUrlParam({ new: "1" }, ["view", "edit"]);
  };

  const closeNew = () => {
    setShowNew(false);
    updateUrlParam({}, ["new"]);
  };

  const openView = (id) => {
    setViewId(id);
    setShowNew(false);
    setEditId(null);
    updateUrlParam({ view: id }, ["new", "edit"]);
  };

  const closeView = () => {
    setViewId(null);
    setViewData(null);
    updateUrlParam({}, ["view"]);
  };

  const openEdit = (id) => {
    setEditId(id);
    setShowNew(false);
    setViewId(null);
    updateUrlParam({ edit: id }, ["new", "view"]);
  };

  const closeEdit = () => {
    setEditId(null);
    updateUrlParam({}, ["edit"]);
  };

  // Fetch View Organization
  useEffect(() => {
    if (!viewId) {
      setViewData(null);
      return;
    }
    setViewLoading(true);
    api.get("/organizations/" + viewId)
      .then((r) => setViewData(r.data.data))
      .catch(() => setViewData(null))
      .finally(() => setViewLoading(false));
  }, [viewId]);

  // Fetch Edit Organization
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    api.get("/organizations/" + editId)
      .then((r) => {
        const d = r.data.data || {};
        setEditForm({
          name: d.name || "",
          name_ar: d.name_ar || "",
          cr_number: d.cr_number || "",
          vat_number: d.vat_number || "",
          city: d.city || "Riyadh",
          address: d.address || "",
          national_address: d.national_address || "",
          email: d.email || "",
          phone: d.phone || "",
          currency: d.currency || "SAR",
          language_default: d.language_default || "en",
          projects_enabled: d.projects_enabled ?? true,
          estimation_enabled: d.estimation_enabled ?? true,
          zatca_enabled: d.zatca_enabled ?? true,
          hrm_enabled: d.hrm_enabled ?? true,
          accounting_enabled: d.accounting_enabled ?? true,
        });
      })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }, [editId]);

  const fs = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const fsBool = (k) => (e) => setForm({ ...form, [k]: e.target.checked });
  const fEdit = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.value });
  const fEditBool = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.checked });

  // Provision Tenant submit
  const provisionOrg = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/organizations", form);
      const created = r.data.data;
      if (created.admin_user?.temp_password) {
        setTempPw(created.admin_user.temp_password);
      }
      setMsg(`Client Organization "${created.name}" provisioned successfully`);
      load();
      openView(created.id);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to provision organization");
    } finally {
      setBusy(false);
    }
  };

  // Update Tenant submit
  const updateOrg = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.put("/organizations/" + editId, editForm);
      setMsg("Organization settings updated successfully");
      closeEdit();
      load();
      if (viewId === editId) {
        openView(editId);
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to update organization");
    } finally {
      setBusy(false);
    }
  };

  // Activate / Suspend Tenant
  const flipActive = async (org, active) => {
    try {
      await api.post(`/organizations/${org.id}/${active ? "activate" : "deactivate"}`);
      if (viewData?.id === org.id) {
        setViewData({ ...viewData, is_active: active });
      }
      setMsg(`Organization "${org.name}" ${active ? "activated" : "suspended"}`);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Action failed");
    }
  };

  // Bulk Flip
  const bulkFlip = (active) => async (ids) => {
    await Promise.all(ids.map((id) => api.post(`/organizations/${id}/${active ? "activate" : "deactivate"}`).catch(() => null)));
    setSelected([]);
    setMsg(`${ids.length} organizations ${active ? "activated" : "suspended"}`);
    load();
  };

  const copyPassword = () => {
    if (!tempPw) return;
    navigator.clipboard.writeText(tempPw);
    setCopiedPw(true);
    setTimeout(() => setCopiedPw(false), 2000);
  };

  const columns = [
    {
      key: "name",
      label: "Client Tenant / Organization",
      sortable: true,
      render: (o) => (
        <button
          type="button"
          className="bigin-cell-link"
          onClick={() => openView(o.id)}
          title={`Click to preview ${o.name}`}
          style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "start" }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: o.is_active ? "#f0fdf4" : "#fef2f2",
              color: o.is_active ? "#0ba360" : "#dc2626",
              border: `1px solid ${o.is_active ? "#bbf7d0" : "#fecaca"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BuildingIcon size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 750, color: "#0f172a" }}>{o.name}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>
              {o.name_ar || o.email || "Saudi Contractor"}
            </div>
          </div>
        </button>
      ),
    },
    {
      key: "city",
      label: "Location",
      render: (o) => (
        <span style={{ fontSize: 13, color: "#334155" }}>
          {o.city || "Riyadh"}, SA
        </span>
      ),
    },
    {
      key: "cr_vat",
      label: "CR & VAT No.",
      render: (o) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: "#0f172a", fontWeight: 600 }}>CR: {o.cr_number || "—"}</div>
          <div style={{ color: "#64748b", fontSize: 11 }}>VAT: {o.vat_number || "—"}</div>
        </div>
      ),
    },
    {
      key: "metrics",
      label: "Active Usage",
      render: (o) => (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
          {o.project_count ?? 0} Projects · {o.user_count ?? 0} Users
        </span>
      ),
    },
    {
      key: "status",
      label: "Tenant Status",
      render: (o) => (
        <span className={"badge " + (o.is_active ? "InProgress" : "Draft")}>
          {o.is_active ? "Active" : "Suspended"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (o) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openView(o.id)}
            title="Preview Tenant (?view)"
          >
            {t(lang, "viewDetails") || "Open"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openEdit(o.id)}
            title="Configure Tenant (?edit)"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <EditIcon size={12} />
            <span>Configure</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {msg && (
        <div className="alert ok" style={{ margin: "10px 24px" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}

      {/* 1. MAIN BORDERLESS DATA TABLE */}
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        onPage={(p) => { setPage(p); load(p, limit, search, activeF); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l, search, activeF); }}
        selected={selected}
        onSelect={setSelected}
        keyOf={(o) => o.id}
        loading={loading}
        title="Client Organization Tenants"
        activeFilter={
          activeF === "true"
            ? "Active Tenants"
            : activeF === "false"
            ? "Suspended Tenants"
            : "All Organizations"
        }
        filterOptions={[
          { label: "All Organizations", value: "" },
          { label: "Active Tenants", value: "true" },
          { label: "Suspended Tenants", value: "false" },
        ]}
        onFilterSelect={(val) => setActiveF(val)}
        counts={{
          all: total,
          active: counts.active,
          done: counts.inactive,
        }}
        searchPlaceholder="Search by company name, CR, VAT, city..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "Organization",
          onClick: openNew,
          title: "Provision New Client Tenant (?new=1)",
        }}
        bulkActions={[
          {
            label: "Activate Selected",
            onClick: bulkFlip(true),
          },
          {
            label: "Suspend Selected",
            onClick: bulkFlip(false),
            danger: true,
          },
          {
            label: "Export Selected",
            onClick: (ids) => {
              const csv = [
                ["ID", "Name", "City", "CR Number", "VAT Number", "Projects Count", "Users Count", "Status"],
                ...rows
                  .filter((r) => ids.includes(r.id))
                  .map((r) => [r.id, r.name, r.city || "", r.cr_number || "", r.vat_number || "", r.project_count || 0, r.user_count || 0, r.is_active ? "Active" : "Suspended"]),
              ].map((line) => line.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `organizations-export-${ids.length}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            },
          },
        ]}
      />

      {/* 2. PROVISION CLIENT ORGANIZATION DRAWER (?new=1) */}
      {showNew && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeNew} />
          <div className="bigin-drawer sheet-wide">
            {/* Header */}
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Super Admin Console</span>
                <div>
                  <h3 className="bigin-drawer-title">Provision Client Organization Tenant</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Setup database tenant, initial HQ branch, modules, and issue Admin credentials
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeNew} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Section Tabs */}
            <div className="bigin-sheet-tabs">
              {[
                { id: "tab-company", label: "1. Company & ZATCA Registration" },
                { id: "tab-admin", label: "2. Client Org Admin Account" },
                { id: "tab-modules", label: "3. Enterprise Modules" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={"bigin-tab-pill" + (activeTab === tab.id ? " active" : "")}
                  onClick={() => {
                    setActiveTab(tab.id);
                    document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={provisionOrg} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                {/* Section 1: Company Profile */}
                <div className="bigin-drawer-sec" id="tab-company">
                  <div className="bigin-drawer-sec-title">1. Contracting Company & Legal Registration</div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Company Name (English) *</label>
                      <input
                        className="input"
                        placeholder="e.g. Al-Bawani Contracting Co."
                        value={form.name}
                        onChange={fs("name")}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Company Name (Arabic)</label>
                      <input
                        className="input"
                        placeholder="اسم الشركة بالعربية (مثال: شركة البواني للمقاولات)"
                        value={form.name_ar}
                        onChange={fs("name_ar")}
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="label">Commercial Registration (CR No.)</label>
                      <input
                        className="input"
                        placeholder="e.g. 1010XXXXXX"
                        value={form.cr_number}
                        onChange={fs("cr_number")}
                      />
                    </div>
                    <div>
                      <label className="label">ZATCA Tax ID / VAT Number (15 Digits)</label>
                      <input
                        className="input"
                        placeholder="e.g. 3000XXXXXXXX003"
                        value={form.vat_number}
                        onChange={fs("vat_number")}
                      />
                    </div>
                    <div>
                      <label className="label">Primary HQ City</label>
                      <input
                        className="input"
                        value={form.city}
                        onChange={fs("city")}
                        placeholder="City"
                      />
                      <div className="city-chips-wrap">
                        {SAUDI_CITIES.slice(0, 7).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={"city-chip" + (form.city === c ? " selected" : "")}
                            onClick={() => setForm({ ...form, city: c })}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Official Company Phone</label>
                      <input
                        className="input"
                        placeholder="+966 11 XXX XXXX"
                        value={form.phone}
                        onChange={fs("phone")}
                        dir="ltr"
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">National Address / Street Address</label>
                      <input
                        className="input"
                        placeholder="e.g. King Fahd Rd, Building 402, Olaya District, Riyadh"
                        value={form.address}
                        onChange={fs("address")}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Client Admin Credentials */}
                <div className="bigin-drawer-sec" id="tab-admin">
                  <div className="bigin-drawer-sec-title">2. Initial Organization Admin Account</div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Client Admin Full Name *</label>
                      <input
                        className="input"
                        placeholder="e.g. Eng. Khalid Al-Mutairi"
                        value={form.admin_name}
                        onChange={fs("admin_name")}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Client Admin Official Email *</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="admin@albawani.com"
                        value={form.admin_email}
                        onChange={fs("admin_email")}
                        dir="ltr"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Direct Mobile / Phone</label>
                      <input
                        className="input"
                        placeholder="+966 5X XXX XXXX"
                        value={form.admin_phone}
                        onChange={fs("admin_phone")}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="label">Initial Password</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Leave blank to auto-generate secure password"
                        value={form.admin_password}
                        onChange={fs("admin_password")}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Modules Enabled */}
                <div className="bigin-drawer-sec" id="tab-modules">
                  <div className="bigin-drawer-sec-title">3. Enterprise Modules Provisioned</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                    <label className={"access-card-pill" + (form.projects_enabled ? " selected" : "")}>
                      <input type="checkbox" checked={form.projects_enabled} onChange={fsBool("projects_enabled")} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Projects & Commercial QS</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>FIDIC Project Master, commercial terms</div>
                      </div>
                    </label>

                    <label className={"access-card-pill" + (form.estimation_enabled ? " selected" : "")}>
                      <input type="checkbox" checked={form.estimation_enabled} onChange={fsBool("estimation_enabled")} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>BOQ & Detailed Estimation</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Cost heads, tender rate markups</div>
                      </div>
                    </label>

                    <label className={"access-card-pill" + (form.zatca_enabled ? " selected" : "")}>
                      <input type="checkbox" checked={form.zatca_enabled} onChange={fsBool("zatca_enabled")} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>IPC Billing & ZATCA E-Invoicing</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Progress claims, 15% VAT, retention</div>
                      </div>
                    </label>

                    <label className={"access-card-pill" + (form.hrm_enabled ? " selected" : "")}>
                      <input type="checkbox" checked={form.hrm_enabled} onChange={fsBool("hrm_enabled")} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Site DPR & Daily Execution</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Daily progress logs, milestones, site team</div>
                      </div>
                    </label>

                    <label className={"access-card-pill" + (form.accounting_enabled ? " selected" : "")}>
                      <input type="checkbox" checked={form.accounting_enabled} onChange={fsBool("accounting_enabled")} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Procurement & Subcontracts</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>POs, 3-way GRN match, payment certs</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="bigin-drawer-foot">
                <button type="button" className="btn ghost" onClick={closeNew}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy} style={{ background: "#0ba360" }}>
                  {busy ? "Provisioning Tenant..." : "✓ Provision Client Tenant"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 3. VIEW CLIENT ORGANIZATION OVERVIEW DRAWER (?view=<id>) */}
      {viewId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeView} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                {viewData && (
                  <span className={"badge " + (viewData.is_active ? "InProgress" : "Draft")}>
                    {viewData.is_active ? "Active Tenant" : "Suspended"}
                  </span>
                )}
                <div>
                  <h3 className="bigin-drawer-title">{viewData ? viewData.name : "Loading organization..."}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Tenant ID: {viewData?.id ? viewData.id.slice(0, 13) + "..." : "—"}
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => openEdit(viewId)}
                  title="Configure tenant"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <EditIcon size={13} />
                  <span>Configure</span>
                </button>
                <button type="button" className="bigin-drawer-close" onClick={closeView} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            <div className="bigin-drawer-body">
              {viewLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Loading tenant profile...</div>
              ) : viewData ? (
                <>
                  {/* Temp Password Revealed Banner */}
                  {tempPw && (
                    <div
                      style={{
                        padding: 14,
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 750, color: "#166534" }}>Admin Credentials Issued</div>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", color: "#0f172a", marginTop: 2 }}>
                          {tempPw}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          Share with client admin. Shown once.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={copyPassword}
                        style={{ background: "#ffffff", border: "1px solid #86efac", color: "#166534" }}
                      >
                        {copiedPw ? "✓ Copied" : "Copy Password"}
                      </button>
                    </div>
                  )}

                  {/* Tenant Profile Card */}
                  <div className="user-card-preview">
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: viewData.is_active ? "#f0fdf4" : "#fef2f2",
                        color: viewData.is_active ? "#0ba360" : "#dc2626",
                        border: `1px solid ${viewData.is_active ? "#bbf7d0" : "#fecaca"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BuildingIcon size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{viewData.name}</div>
                      <div style={{ fontSize: 12.5, color: "#64748b" }}>
                        {viewData.name_ar ? `${viewData.name_ar} · ` : ""}{viewData.city || "Riyadh"}, Saudi Arabia
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                        CR: {viewData.cr_number || "Unregistered"} · VAT: {viewData.vat_number || "Unregistered"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={"btn sm " + (viewData.is_active ? "ghost" : "")}
                      onClick={() => flipActive(viewData, !viewData.is_active)}
                      style={{
                        borderColor: viewData.is_active ? "#fecaca" : "#bbf7d0",
                        color: viewData.is_active ? "#dc2626" : "#0ba360",
                      }}
                    >
                      {viewData.is_active ? "Suspend Tenant" : "Activate Tenant"}
                    </button>
                  </div>

                  {/* KPI Mini Banner */}
                  <div className="bigin-kpi-banner">
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Active Projects</span>
                      <span className="bigin-kpi-val">{viewData.project_count ?? 0}</span>
                      <span className="bigin-kpi-sub">Commercial QS</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Licensed Users</span>
                      <span className="bigin-kpi-val">{(viewData.users || []).length} Members</span>
                      <span className="bigin-kpi-sub">Active Logins</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Office Branches</span>
                      <span className="bigin-kpi-val">{(viewData.branches || []).length} Branches</span>
                      <span className="bigin-kpi-sub">Cost Centers</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">ZATCA Integration</span>
                      <span className="bigin-kpi-val" style={{ fontSize: 13 }}>
                        {viewData.zatca_registered ? "Phase 2 Active" : "Phase 1 Ready"}
                      </span>
                      <span className="bigin-kpi-sub">15% Tax Invoicing</span>
                    </div>
                  </div>

                  {/* Commercial & Contact Information */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Commercial & Legal Details</div>
                    <div className="bigin-drawer-grid">
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Commercial Registration (CR)</span>
                        <span className="bigin-drawer-val">{viewData.cr_number || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">ZATCA VAT Tax ID</span>
                        <span className="bigin-drawer-val">{viewData.vat_number || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Primary HQ City</span>
                        <span className="bigin-drawer-val">{viewData.city || "Riyadh"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Currency & Language</span>
                        <span className="bigin-drawer-val">
                          {viewData.currency || "SAR"} · {viewData.language_default === "ar" ? "العربية" : "English"}
                        </span>
                      </div>
                      {viewData.address && (
                        <div className="bigin-drawer-field" style={{ gridColumn: "1 / -1" }}>
                          <span className="bigin-drawer-label">National Address</span>
                          <span className="bigin-drawer-val">{viewData.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Provisioned Modules */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Provisioned Enterprise Modules</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { label: "Projects & Commercial QS", on: viewData.projects_enabled },
                        { label: "BOQ & Detailed Estimation", on: viewData.estimation_enabled },
                        { label: "ZATCA E-Invoicing & IPC", on: viewData.zatca_enabled },
                        { label: "Site DPR & Execution", on: viewData.hrm_enabled },
                        { label: "Procurement & Subcontract", on: viewData.accounting_enabled },
                      ].map((m) => (
                        <span
                          key={m.label}
                          className={"badge " + (m.on ? "InProgress" : "Draft")}
                          style={{ fontSize: 12, padding: "4px 10px" }}
                        >
                          {m.on ? "✓ " : "✕ "}{m.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Registered Users Preview */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">
                      Client Team Members ({(viewData.users || []).length})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                      {(viewData.users || []).map((u) => (
                        <div
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 12px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                          }}
                        >
                          <BiginAvatar name={u.name} size={28} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }} dir="ltr">{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#cf3d3d" }}>Organization not found</div>
              )}
            </div>

            <div className="bigin-drawer-foot">
              <button type="button" className="btn ghost" onClick={closeView}>
                Close
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => openEdit(viewId)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <EditIcon size={14} />
                <span>Configure Organization</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4. EDIT CLIENT ORGANIZATION DRAWER (?edit=<id>) */}
      {editId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeEdit} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge Draft">Configure Tenant</span>
                <div>
                  <h3 className="bigin-drawer-title">Configure Organization: {editForm.name || editId}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Update company registration and enabled modules</span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeEdit} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            {editLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Loading organization...</div>
            ) : (
              <form onSubmit={updateOrg} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="bigin-drawer-body">
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Company Registration</div>
                    <div className="form-grid">
                      <div>
                        <label className="label">Company Name (English) *</label>
                        <input className="input" value={editForm.name} onChange={fEdit("name")} required />
                      </div>
                      <div>
                        <label className="label">Company Name (Arabic)</label>
                        <input className="input" value={editForm.name_ar} onChange={fEdit("name_ar")} dir="rtl" />
                      </div>
                      <div>
                        <label className="label">Commercial Registration (CR)</label>
                        <input className="input" value={editForm.cr_number} onChange={fEdit("cr_number")} />
                      </div>
                      <div>
                        <label className="label">ZATCA VAT Tax ID</label>
                        <input className="input" value={editForm.vat_number} onChange={fEdit("vat_number")} />
                      </div>
                      <div>
                        <label className="label">Primary HQ City</label>
                        <input className="input" value={editForm.city} onChange={fEdit("city")} />
                      </div>
                      <div>
                        <label className="label">Official Phone</label>
                        <input className="input" value={editForm.phone} onChange={fEdit("phone")} dir="ltr" />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label className="label">Address</label>
                        <input className="input" value={editForm.address} onChange={fEdit("address")} />
                      </div>
                    </div>
                  </div>

                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Enterprise Modules Provisioned</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                      <label className={"access-card-pill" + (editForm.projects_enabled ? " selected" : "")}>
                        <input type="checkbox" checked={editForm.projects_enabled} onChange={fEditBool("projects_enabled")} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Projects & Commercial QS</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>FIDIC Project Master, commercial terms</div>
                        </div>
                      </label>

                      <label className={"access-card-pill" + (editForm.estimation_enabled ? " selected" : "")}>
                        <input type="checkbox" checked={editForm.estimation_enabled} onChange={fEditBool("estimation_enabled")} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>BOQ & Detailed Estimation</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>Cost heads, tender rate markups</div>
                        </div>
                      </label>

                      <label className={"access-card-pill" + (editForm.zatca_enabled ? " selected" : "")}>
                        <input type="checkbox" checked={editForm.zatca_enabled} onChange={fEditBool("zatca_enabled")} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>IPC Billing & ZATCA E-Invoicing</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>Progress claims, 15% VAT, retention</div>
                        </div>
                      </label>

                      <label className={"access-card-pill" + (editForm.hrm_enabled ? " selected" : "")}>
                        <input type="checkbox" checked={editForm.hrm_enabled} onChange={fEditBool("hrm_enabled")} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Site DPR & Daily Execution</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>Daily progress logs, milestones, site team</div>
                        </div>
                      </label>

                      <label className={"access-card-pill" + (editForm.accounting_enabled ? " selected" : "")}>
                        <input type="checkbox" checked={editForm.accounting_enabled} onChange={fEditBool("accounting_enabled")} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Procurement & Subcontracts</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>POs, 3-way GRN match, payment certs</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bigin-drawer-foot">
                  <button type="button" className="btn ghost" onClick={closeEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? "Saving..." : "Save Organization Settings"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
