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

function KeyIcon({ size = 13, style = {} }) {
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
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function ShieldIcon({ size = 13, style = {} }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  branch_id: "",
  language: "en",
  role_ids: [],
  branch_ids: [],
};

const fdate = (d, lang) => {
  if (!d) return "Never logged in";
  try {
    return new Date(d).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Never logged in";
  }
};

export default function Users() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [counts, setCounts] = useState({ active: 0, inactive: 0 });
  const [search, setSearch] = useState("");
  const [activeF, setActiveF] = useState("");
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  // URL Parameter state: ?new=1, ?view=<id>, ?edit=<id>
  const [showNew, setShowNew] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  // New User Form State
  const [form, setForm] = useState(emptyForm);
  const [newTab, setNewTab] = useState("tab-identity");
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

  // Load user records
  const load = (p = page, l = limit, sb = sortBy, sd = sortDir, sQuery = search, activeStatus = activeF) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (sQuery) q.push("search=" + encodeURIComponent(sQuery));
    if (activeStatus !== undefined && activeStatus !== "") q.push("is_active=" + activeStatus);
    api.get("/users?" + q.join("&"))
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    api.get("/users?limit=1&is_active=true").then((r) => setCounts((c) => ({ ...c, active: r.data.meta?.total || 0 }))).catch(() => {});
    api.get("/users?limit=1&is_active=false").then((r) => setCounts((c) => ({ ...c, inactive: r.data.meta?.total || 0 }))).catch(() => {});
  };

  const loadRefs = () => {
    api.get("/roles").then((r) => setRoles(r.data.data || [])).catch(() => {});
    api.get("/branches").then((r) => setBranches(r.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    loadRefs();
  }, []);

  useEffect(() => {
    load(1, limit, sortBy, sortDir, search, activeF);
    setPage(1);
    setSelected([]);
  }, [activeF]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1, limit, sortBy, sortDir, search, activeF);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Drawer open / close handlers
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

  // Fetch View User details
  useEffect(() => {
    if (!viewId) {
      setViewData(null);
      return;
    }
    setViewLoading(true);
    api.get("/users/" + viewId)
      .then((r) => setViewData(r.data.data))
      .catch(() => setViewData(null))
      .finally(() => setViewLoading(false));
  }, [viewId]);

  // Fetch Edit User details
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    api.get("/users/" + editId)
      .then((r) => {
        const d = r.data.data || {};
        setEditForm({
          name: d.name || "",
          email: d.email || "",
          password: "",
          phone: d.phone || "",
          branch_id: d.branch_id || "",
          language: d.language || "en",
          role_ids: (d.roles || []).map((x) => x.id),
          branch_ids: (d.branches || []).map((x) => x.id),
        });
      })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }, [editId]);

  const fs = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const fEdit = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.value });

  const toggleRole = (targetForm, setter, id) => {
    const list = targetForm.role_ids || [];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    setter({ ...targetForm, role_ids: next });
  };

  const toggleBranch = (targetForm, setter, id) => {
    const list = targetForm.branch_ids || [];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    const mainBranch = targetForm.branch_id === id ? (next[0] || "") : (targetForm.branch_id || next[0] || "");
    setter({ ...targetForm, branch_ids: next, branch_id: mainBranch });
  };

  // Create User submit
  const createUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      if (!body.branch_id && body.branch_ids.length) body.branch_id = body.branch_ids[0];

      const r = await api.post("/users", body);
      const created = r.data.data;
      if (created.temp_password) {
        setTempPw(created.temp_password);
      }
      setMsg("User account created successfully");
      load();
      openView(created.id);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  // Update User submit
  const updateUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const body = { ...editForm };
      if (!body.password) delete body.password;
      if (!body.branch_id && body.branch_ids.length) body.branch_id = body.branch_ids[0];

      await api.put("/users/" + editId, body);
      setMsg("User updated successfully");
      closeEdit();
      load();
      if (viewId === editId) {
        openView(editId);
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to update user");
    } finally {
      setBusy(false);
    }
  };

  // Status toggle
  const flipActive = async (u, active) => {
    try {
      await api.post(`/users/${u.id}/${active ? "activate" : "deactivate"}`);
      if (viewData?.id === u.id) {
        setViewData({ ...viewData, is_active: active });
      }
      setMsg(`User ${active ? "activated" : "deactivated"} successfully`);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Action failed");
    }
  };

  // Password reset
  const resetPassword = async (uid) => {
    try {
      const r = await api.post(`/users/${uid}/reset-password`, {});
      setTempPw(r.data.temp_password);
      setCopiedPw(false);
      setMsg("Password reset successfully. A temporary password has been generated.");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to reset password");
    }
  };

  const copyPassword = () => {
    if (!tempPw) return;
    navigator.clipboard.writeText(tempPw);
    setCopiedPw(true);
    setTimeout(() => setCopiedPw(false), 2000);
  };

  // Delete user
  const deleteUser = async (uid) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
      await api.delete("/users/" + uid);
      setMsg("User deleted");
      closeView();
      closeEdit();
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Delete failed");
    }
  };

  // Bulk actions
  const bulkFlip = (active) => async (ids) => {
    await Promise.all(ids.map((id) => api.post(`/users/${id}/${active ? "activate" : "deactivate"}`).catch(() => null)));
    setSelected([]);
    setMsg(`${ids.length} users ${active ? "activated" : "deactivated"}`);
    load();
  };

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k);
    setSortDir(nd);
    load(page, limit, k, nd);
  };

  const columns = [
    {
      key: "name",
      label: "User / Member",
      sortable: true,
      render: (u) => (
        <button
          type="button"
          className="bigin-cell-link"
          onClick={() => openView(u.id)}
          title={`Click to preview ${u.name}`}
          style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "start" }}
        >
          <BiginAvatar name={u.name} color={u.is_active ? "#0ba360" : "#94a3b8"} />
          <div>
            <div style={{ fontWeight: 750, color: "#0f172a" }}>{u.name}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }} dir="ltr">{u.email}</div>
          </div>
        </button>
      ),
    },
    {
      key: "roles",
      label: "Assigned Roles",
      render: (u) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(u.roles || []).length > 0 ? (
            u.roles.map((r) => (
              <span key={r.id} className="badge InProgress" style={{ fontSize: 11, padding: "2px 7px" }}>
                {r.name}
              </span>
            ))
          ) : (
            <span style={{ color: "#94a3b8", fontSize: 12 }}>No role</span>
          )}
        </div>
      ),
    },
    {
      key: "branches",
      label: "Branch Access",
      render: (u) => (
        <span style={{ fontSize: 12.5, color: "#475569" }}>
          {(u.branches || []).map((b) => b.name).join(", ") || (u.branch ? u.branch.name : "All Branches")}
        </span>
      ),
    },
    {
      key: "last_login_at",
      label: "Last Active",
      sortable: true,
      render: (u) => (
        <span style={{ fontSize: 12, color: u.last_login_at ? "#334155" : "#94a3b8" }}>
          {fdate(u.last_login_at, lang)}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (u) => (
        <span className={"badge " + (u.is_active ? "InProgress" : "Draft")}>
          {u.is_active ? "Active" : "Suspended"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (u) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openView(u.id)}
            title="Preview Details (?view)"
          >
            {t(lang, "viewDetails") || "Open"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openEdit(u.id)}
            title="Edit User (?edit)"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <EditIcon size={12} />
            <span>Edit</span>
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
        onPage={(p) => { setPage(p); load(p, limit, sortBy, sortDir); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l, sortBy, sortDir); }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        keyOf={(u) => u.id}
        loading={loading}
        title="Organization Users"
        activeFilter={activeF === "true" ? "Active Users" : activeF === "false" ? "Suspended Users" : "All Users"}
        filterOptions={[
          { label: "All Users", value: "" },
          { label: "Active Users", value: "true" },
          { label: "Suspended Users", value: "false" },
        ]}
        onFilterSelect={(val) => setActiveF(val)}
        counts={{
          all: total,
          active: counts.active,
          done: counts.inactive,
        }}
        searchPlaceholder="Search users by name or email..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "User",
          onClick: openNew,
          title: "Create New User Account (?new=1)",
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
                ["ID", "Name", "Email", "Phone", "Status", "Last Login"],
                ...rows.filter((r) => ids.includes(r.id)).map((r) => [r.id, r.name, r.email, r.phone || "", r.is_active ? "Active" : "Suspended", r.last_login_at || "Never"]),
              ].map((line) => line.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `users-export-${ids.length}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            },
          },
        ]}
      />

      {/* 2. NEW USER SLIDE-OVER DRAWER (?new=1) */}
      {showNew && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeNew} />
          <div className="bigin-drawer sheet-wide">
            {/* Drawer Header */}
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Access Control</span>
                <div>
                  <h3 className="bigin-drawer-title">Add Organization User</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Provision user credentials, roles, and branch assignments</span>
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
                { id: "tab-identity", label: "1. Identity & Credentials" },
                { id: "tab-roles", label: `2. Roles (${form.role_ids.length})` },
                { id: "tab-branches", label: `3. Branches (${form.branch_ids.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={"bigin-tab-pill" + (newTab === tab.id ? " active" : "")}
                  onClick={() => {
                    setNewTab(tab.id);
                    document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={createUser} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                {/* Section 1: User Identity */}
                <div className="bigin-drawer-sec" id="tab-identity">
                  <div className="bigin-drawer-sec-title">1. Account Information & Credentials</div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Full Name *</label>
                      <input className="input" placeholder="e.g. Eng. Tariq Al-Otaibi" value={form.name} onChange={fs("name")} required />
                    </div>
                    <div>
                      <label className="label">Official Email Address *</label>
                      <input className="input" type="email" placeholder="tariq@organization.com" value={form.email} onChange={fs("email")} dir="ltr" required />
                    </div>
                    <div>
                      <label className="label">Direct Phone / WhatsApp</label>
                      <input className="input" placeholder="+966 5X XXX XXXX" value={form.phone} onChange={fs("phone")} dir="ltr" />
                    </div>
                    <div>
                      <label className="label">Initial Password</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Leave blank to auto-generate secure password"
                        value={form.password}
                        onChange={fs("password")}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="label">Preferred Language</label>
                      <select className="select" value={form.language} onChange={fs("language")}>
                        <option value="en">English (Default)</option>
                        <option value="ar">العربية (Arabic)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Role Assignments */}
                <div className="bigin-drawer-sec" id="tab-roles">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div className="bigin-drawer-sec-title" style={{ margin: 0, border: "none" }}>2. Assign Security Roles</div>
                    <span style={{ fontSize: 11.5, color: "#0ba360", fontWeight: 700 }}>
                      {form.role_ids.length} Selected
                    </span>
                  </div>
                  <div className="access-multi-grid">
                    {roles.map((r) => {
                      const sel = form.role_ids.includes(r.id);
                      return (
                        <label key={r.id} className={"access-card-pill" + (sel ? " selected" : "")}>
                          <input type="checkbox" checked={sel} onChange={() => toggleRole(form, setForm, r.id)} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#166534" : "#0f172a" }}>
                              {r.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {(r.permissions || []).length} Permissions
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Branch Access */}
                <div className="bigin-drawer-sec" id="tab-branches">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div className="bigin-drawer-sec-title" style={{ margin: 0, border: "none" }}>3. Regional Branch Access</div>
                    <span style={{ fontSize: 11.5, color: "#0ba360", fontWeight: 700 }}>
                      {form.branch_ids.length} Branches
                    </span>
                  </div>
                  <div className="access-multi-grid">
                    {branches.map((b) => {
                      const sel = form.branch_ids.includes(b.id) || form.branch_id === b.id;
                      return (
                        <label key={b.id} className={"access-card-pill" + (sel ? " selected" : "")}>
                          <input type="checkbox" checked={sel} onChange={() => toggleBranch(form, setForm, b.id)} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#166534" : "#0f172a" }}>
                              {b.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {b.is_main ? "★ Primary HQ Branch" : "Regional Office"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="bigin-drawer-foot">
                <button type="button" className="btn ghost" onClick={closeNew}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy} style={{ background: "#0ba360" }}>
                  {busy ? "Provisioning..." : "✓ Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 3. USER PROFILE PREVIEW DRAWER (?view=<id>) */}
      {viewId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeView} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                {viewData && (
                  <span className={"badge " + (viewData.is_active ? "InProgress" : "Draft")}>
                    {viewData.is_active ? "Active" : "Suspended"}
                  </span>
                )}
                <div>
                  <h3 className="bigin-drawer-title">{viewData ? viewData.name : "Loading user..."}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>{viewData?.email || "—"}</span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => openEdit(viewId)}
                  title="Edit user"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <EditIcon size={13} />
                  <span>Edit</span>
                </button>
                <button type="button" className="bigin-drawer-close" onClick={closeView} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            <div className="bigin-drawer-body">
              {viewLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Loading user profile...</div>
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
                        <div style={{ fontSize: 12, fontWeight: 750, color: "#166534" }}>Temporary Password Generated</div>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", color: "#0f172a", marginTop: 2 }}>
                          {tempPw}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Shown once. Send securely to the user.</div>
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

                  {/* Profile Header Card */}
                  <div className="user-card-preview">
                    <div
                      className="user-avatar-large"
                      style={{ background: viewData.is_active ? "#0ba360" : "#94a3b8" }}
                    >
                      {(viewData.name || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{viewData.name}</div>
                      <div style={{ fontSize: 12.5, color: "#64748b" }} dir="ltr">{viewData.email}</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                        {viewData.phone || "No phone registered"} · Language: {viewData.language === "ar" ? "العربية" : "English"}
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
                      {viewData.is_active ? "Suspend Account" : "Activate Account"}
                    </button>
                  </div>

                  {/* KPI Summary Banner */}
                  <div className="bigin-kpi-banner">
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Security Status</span>
                      <span className="bigin-kpi-val" style={{ color: viewData.is_active ? "#0ba360" : "#94a3b8" }}>
                        {viewData.is_active ? "Active" : "Suspended"}
                      </span>
                      <span className="bigin-kpi-sub">Standard Auth</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Assigned Roles</span>
                      <span className="bigin-kpi-val">{(viewData.roles || []).length} Roles</span>
                      <span className="bigin-kpi-sub">Security Groups</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Branch Access</span>
                      <span className="bigin-kpi-val">{(viewData.branches || []).length || 1} Branches</span>
                      <span className="bigin-kpi-sub">{viewData.branch ? viewData.branch.name : "HQ"}</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Last Login</span>
                      <span className="bigin-kpi-val" style={{ fontSize: 12.5 }}>
                        {viewData.last_login_at ? viewData.last_login_at.slice(0, 10) : "Never"}
                      </span>
                      <span className="bigin-kpi-sub">Audit Tracked</span>
                    </div>
                  </div>

                  {/* Roles Details */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Role Permissions & Governance</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(viewData.roles || []).length > 0 ? (
                        viewData.roles.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: 16,
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#166534",
                            }}
                          >
                            <ShieldIcon size={12} />
                            <span>{r.name}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>No roles currently assigned. User will have standard restricted access.</span>
                      )}
                    </div>
                  </div>

                  {/* Regional Branches */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Authorized Branches & Locations</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(viewData.branches || []).length > 0 ? (
                        viewData.branches.map((b) => (
                          <div
                            key={b.id}
                            style={{
                              padding: "6px 12px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 8,
                              fontSize: 12.5,
                              color: "#334155",
                              fontWeight: 600,
                            }}
                          >
                            {b.name} {b.id === viewData.branch_id && " (Primary Branch)"}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Primary Branch: {viewData.branch ? viewData.branch.name : "Central Organization HQ"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security Operations */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Security & Account Management</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Reset User Password</div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>Generate a new temporary password and invalidate active sessions</div>
                        </div>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => resetPassword(viewData.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <KeyIcon size={13} />
                          <span>Reset Password</span>
                        </button>
                      </div>

                      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Delete User Account</div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>Permanently remove access for this team member</div>
                        </div>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => deleteUser(viewData.id)}
                          style={{ color: "#dc2626", borderColor: "#fecaca" }}
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#cf3d3d" }}>User not found</div>
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
                <span>Edit User Profile</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4. EDIT USER DRAWER (?edit=<id>) */}
      {editId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeEdit} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge Draft">Edit Account</span>
                <div>
                  <h3 className="bigin-drawer-title">Edit User: {editForm.name || editId}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Update profile details, roles, and branch assignments</span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeEdit} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            {editLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Loading user details...</div>
            ) : (
              <form onSubmit={updateUser} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="bigin-drawer-body">
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Personal & Contact Details</div>
                    <div className="form-grid">
                      <div>
                        <label className="label">Full Name *</label>
                        <input className="input" value={editForm.name} onChange={fEdit("name")} required />
                      </div>
                      <div>
                        <label className="label">Email Address (Locked)</label>
                        <input className="input" value={editForm.email} disabled dir="ltr" style={{ background: "#f8fafc" }} />
                      </div>
                      <div>
                        <label className="label">Phone Number</label>
                        <input className="input" value={editForm.phone} onChange={fEdit("phone")} dir="ltr" />
                      </div>
                      <div>
                        <label className="label">Change Password (Optional)</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Leave empty to keep existing password"
                          value={editForm.password}
                          onChange={fEdit("password")}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="label">Language</label>
                        <select className="select" value={editForm.language} onChange={fEdit("language")}>
                          <option value="en">English</option>
                          <option value="ar">العربية</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Role Memberships</div>
                    <div className="access-multi-grid">
                      {roles.map((r) => {
                        const sel = editForm.role_ids.includes(r.id);
                        return (
                          <label key={r.id} className={"access-card-pill" + (sel ? " selected" : "")}>
                            <input type="checkbox" checked={sel} onChange={() => toggleRole(editForm, setEditForm, r.id)} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#166534" : "#0f172a" }}>
                                {r.name}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {(r.permissions || []).length} Permissions
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Branch Access</div>
                    <div className="access-multi-grid">
                      {branches.map((b) => {
                        const sel = editForm.branch_ids.includes(b.id) || editForm.branch_id === b.id;
                        return (
                          <label key={b.id} className={"access-card-pill" + (sel ? " selected" : "")}>
                            <input type="checkbox" checked={sel} onChange={() => toggleBranch(editForm, setEditForm, b.id)} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#166534" : "#0f172a" }}>
                                {b.name}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {b.is_main ? "★ Primary Branch" : "Regional Office"}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bigin-drawer-foot">
                  <button type="button" className="btn ghost" onClick={closeEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? "Saving..." : "Save Changes"}
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
