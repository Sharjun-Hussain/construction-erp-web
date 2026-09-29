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

function ShieldIcon({ size = 14, style = {} }) {
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

function LockIcon({ size = 13, style = {} }) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function Roles() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState(""); // "" | "system" | "custom"
  const [matrix, setMatrix] = useState([]);

  // URL Parameter state: ?new=1, ?view=<id>, ?edit=<id>
  const [showNew, setShowNew] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPermIds, setEditPermIds] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // New Role Form State
  const [name, setName] = useState("");
  const [permIds, setPermIds] = useState([]);
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

  // Load roles & permissions matrix
  const load = () => {
    setLoading(true);
    api.get("/roles")
      .then((r) => {
        setRows(r.data.data || []);
        setTotal((r.data.data || []).length);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    api.get("/roles/permissions/matrix")
      .then((r) => setMatrix(r.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered rows for search & system/custom
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterType === "system" && !r.is_system) return false;
      if (filterType === "custom" && r.is_system) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (r.name || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filterType, search]);

  const allPermIds = useMemo(() => {
    const ids = [];
    matrix.forEach((g) => {
      (g.permissions || []).forEach((p) => ids.push(p.id));
    });
    return ids;
  }, [matrix]);

  // Drawer open / close handlers
  const openNew = () => {
    setName("");
    setPermIds([]);
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

  // Fetch View Role details
  useEffect(() => {
    if (!viewId) {
      setViewData(null);
      return;
    }
    setViewLoading(true);
    api.get("/roles/" + viewId)
      .then((r) => setViewData(r.data.data))
      .catch(() => setViewData(null))
      .finally(() => setViewLoading(false));
  }, [viewId]);

  // Fetch Edit Role details
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    api.get("/roles/" + editId)
      .then((r) => {
        const d = r.data.data;
        setEditRole(d);
        setEditName(d.name || "");
        setEditPermIds((d.permissions || []).map((p) => p.id));
      })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }, [editId]);

  // Permission selection helpers
  const togglePerm = (currentList, setter, id) => {
    setter(currentList.includes(id) ? currentList.filter((x) => x !== id) : [...currentList, id]);
  };

  const toggleGroup = (currentList, setter, g) => {
    const gIds = (g.permissions || []).map((p) => p.id);
    const allIn = gIds.every((id) => currentList.includes(id));
    if (allIn) {
      setter(currentList.filter((id) => !gIds.includes(id)));
    } else {
      setter([...new Set([...currentList, ...gIds])]);
    }
  };

  // Presets
  const applyPreset = (setter, mode) => {
    if (mode === "all") {
      setter([...allPermIds]);
    } else if (mode === "none") {
      setter([]);
    } else if (mode === "view_only") {
      const viewIds = [];
      matrix.forEach((g) => {
        (g.permissions || []).forEach((p) => {
          if (p.name.endsWith(":view") || p.name.includes("read") || p.name.includes("list")) {
            viewIds.push(p.id);
          }
        });
      });
      setter(viewIds);
    } else if (mode === "pm") {
      const pmGroups = ["project", "boq", "site", "estimation", "tender"];
      const pmIds = [];
      matrix.forEach((g) => {
        if (pmGroups.some((grp) => g.group.toLowerCase().includes(grp))) {
          (g.permissions || []).forEach((p) => pmIds.push(p.id));
        }
      });
      setter(pmIds);
    } else if (mode === "qs") {
      const qsGroups = ["boq", "ipc", "estimation", "variation", "contract"];
      const qsIds = [];
      matrix.forEach((g) => {
        if (qsGroups.some((grp) => g.group.toLowerCase().includes(grp))) {
          (g.permissions || []).forEach((p) => qsIds.push(p.id));
        }
      });
      setter(qsIds);
    }
  };

  // Create Role submit
  const createRole = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/roles", {
        name,
        permission_ids: permIds,
      });
      setMsg("Role created successfully");
      closeNew();
      load();
      openView(r.data.data.id);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create role");
    } finally {
      setBusy(false);
    }
  };

  // Update Role submit
  const updateRole = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const body = { permission_ids: editPermIds };
      if (!editRole.is_system) {
        body.name = editName;
      }
      await api.put("/roles/" + editId, body);
      setMsg("Role permissions updated successfully");
      closeEdit();
      load();
      if (viewId === editId) {
        openView(editId);
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to update role");
    } finally {
      setBusy(false);
    }
  };

  // Delete Role
  const delRole = async (id, roleName) => {
    if (!window.confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await api.delete("/roles/" + id);
      setMsg("Role deleted successfully");
      closeView();
      closeEdit();
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Delete failed");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Role / Access Profile",
      sortable: true,
      render: (r) => (
        <button
          type="button"
          className="bigin-cell-link"
          onClick={() => openView(r.id)}
          title={`Click to preview permissions for ${r.name}`}
          style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "start" }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: r.is_system ? "#eff6ff" : "#f0fdf4",
              color: r.is_system ? "#2563eb" : "#0ba360",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {r.is_system ? <LockIcon size={14} /> : <ShieldIcon size={14} />}
          </div>
          <div>
            <div style={{ fontWeight: 750, color: "#0f172a" }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>
              {r.is_system ? "System Built-in" : "Custom Organization Role"}
            </div>
          </div>
        </button>
      ),
    },
    {
      key: "type",
      label: "Scope",
      render: (r) => (
        <span className={"badge " + (r.is_system ? "InProgress" : "Draft")}>
          {r.is_system ? "System Core" : "Custom"}
        </span>
      ),
    },
    {
      key: "permissions",
      label: "Permissions Granted",
      render: (r) => {
        const count = (r.permissions || []).length;
        const totalPerms = allPermIds.length || 50;
        const pct = Math.round((count / totalPerms) * 100);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 160 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>{count} Granted</span>
              <span style={{ color: "#64748b" }}>{pct}%</span>
            </div>
            <div className="tranquil-progress-bar" style={{ margin: 0 }}>
              <div
                className="tranquil-progress-fill"
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? "#dc2626" : pct > 40 ? "#0ba360" : "#2563eb",
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "users",
      label: "Assigned Users",
      render: (r) => (
        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
          {r.user_count ?? 0} {r.user_count === 1 ? "Member" : "Members"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openView(r.id)}
            title="Preview Details (?view)"
          >
            {t(lang, "viewDetails") || "Open"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openEdit(r.id)}
            title="Configure Permissions (?edit)"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <EditIcon size={12} />
            <span>Configure</span>
          </button>
          {!r.is_system && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => delRole(r.id, r.name)}
              title="Delete role"
              style={{ color: "#dc2626" }}
            >
              ✕
            </button>
          )}
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
        rows={filteredRows}
        total={filteredRows.length}
        page={1}
        limit={100}
        onPage={() => {}}
        onLimit={() => {}}
        selected={selected}
        onSelect={setSelected}
        keyOf={(r) => r.id}
        loading={loading}
        title="Security Roles & Permissions"
        activeFilter={
          filterType === "system"
            ? "System Roles"
            : filterType === "custom"
            ? "Custom Roles"
            : "All Roles"
        }
        filterOptions={[
          { label: "All Roles", value: "" },
          { label: "System Roles", value: "system" },
          { label: "Custom Roles", value: "custom" },
        ]}
        onFilterSelect={(val) => setFilterType(val)}
        counts={{
          all: rows.length,
          active: rows.filter((r) => !r.is_system).length,
          done: rows.filter((r) => r.is_system).length,
        }}
        searchPlaceholder="Search roles by title..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "Role",
          onClick: openNew,
          title: "Create Custom Role (?new=1)",
        }}
        onAdd={openNew}
        addLabel="+ Role"
        bulkActions={[
          {
            label: "Export Selected",
            onClick: (ids) => {
              const csv = [
                ["ID", "Name", "Is System", "Permissions Count", "Users Count"],
                ...rows
                  .filter((r) => ids.includes(r.id))
                  .map((r) => [r.id, r.name, r.is_system ? "Yes" : "No", (r.permissions || []).length, r.user_count || 0]),
              ].map((line) => line.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `roles-export-${ids.length}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            },
          },
        ]}
      />

      {/* 2. NEW ROLE SLIDE-OVER DRAWER (?new=1) */}
      {showNew && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeNew} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Access Matrix</span>
                <div>
                  <h3 className="bigin-drawer-title">Create Security Role</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Define customized capabilities and module privileges
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeNew} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={createRole} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                {/* Basic Information */}
                <div className="bigin-drawer-sec">
                  <div className="bigin-drawer-sec-title">1. Role Information</div>
                  <div>
                    <label className="label">Role Title / Designation *</label>
                    <input
                      className="input"
                      placeholder="e.g. Senior Estimation Specialist / Site Quality Auditor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Permissions Matrix with Quick Presets */}
                <div className="bigin-drawer-sec">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div className="bigin-drawer-sec-title" style={{ margin: 0, border: "none" }}>
                        2. Permissions Matrix
                      </div>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>
                        Select the granular actions allowed for this role
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0ba360" }}>
                      {permIds.length} / {allPermIds.length} Selected
                    </span>
                  </div>

                  {/* Fast Presets Toolbar */}
                  <div className="quick-preset-bar">
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Quick Presets:</span>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => applyPreset(setPermIds, "all")}
                    >
                      ✓ Select All
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => applyPreset(setPermIds, "none")}
                    >
                      ✕ Clear All
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => applyPreset(setPermIds, "view_only")}
                    >
                      👁 Read-Only Preset
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => applyPreset(setPermIds, "pm")}
                    >
                      💼 Project Manager
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => applyPreset(setPermIds, "qs")}
                    >
                      💰 QS & Commercial
                    </button>
                  </div>

                  {/* Grouped Permission Matrix */}
                  <div className="matrix">
                    {matrix.map((g) => {
                      const gIds = (g.permissions || []).map((p) => p.id);
                      const selCount = gIds.filter((id) => permIds.includes(id)).length;
                      const allIn = gIds.length > 0 && selCount === gIds.length;

                      return (
                        <div key={g.group} className="matrix-group">
                          <label className="matrix-head">
                            <div className="matrix-head-left">
                              <input
                                type="checkbox"
                                checked={allIn}
                                onChange={() => toggleGroup(permIds, setPermIds, g)}
                              />
                              <strong style={{ fontSize: 13, color: "#0f172a" }}>
                                {g.group.toUpperCase()}
                              </strong>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: allIn ? "#166534" : selCount > 0 ? "#2563eb" : "#94a3b8",
                              }}
                            >
                              {selCount}/{gIds.length}
                            </span>
                          </label>

                          <div className="matrix-perms">
                            {g.permissions.map((p) => {
                              const checked = permIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={"perm-chip" + (checked ? " on" : "")}
                                  title={p.name}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePerm(permIds, setPermIds, p.id)}
                                  />
                                  <span>{p.name.split(":")[1] || p.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
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
                  {busy ? "Creating Role..." : "✓ Create Security Role"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 3. VIEW ROLE DETAILS DRAWER (?view=<id>) */}
      {viewId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeView} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                {viewData && (
                  <span className={"badge " + (viewData.is_system ? "InProgress" : "Draft")}>
                    {viewData.is_system ? "System Core" : "Custom"}
                  </span>
                )}
                <div>
                  <h3 className="bigin-drawer-title">{viewData ? viewData.name : "Loading role..."}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    {viewData?.is_system ? "Protected System Role" : "Enterprise Custom Role"}
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => openEdit(viewId)}
                  title="Configure role"
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
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                  Loading role details...
                </div>
              ) : viewData ? (
                <>
                  {/* KPI Summary Banner */}
                  <div className="bigin-kpi-banner">
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Permissions</span>
                      <span className="bigin-kpi-val">{(viewData.permissions || []).length} Actions</span>
                      <span className="bigin-kpi-sub">
                        {allPermIds.length > 0
                          ? `${Math.round(((viewData.permissions || []).length / allPermIds.length) * 100)}% Coverage`
                          : "Granular"}
                      </span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Assigned Users</span>
                      <span className="bigin-kpi-val">{(viewData.users || []).length} Members</span>
                      <span className="bigin-kpi-sub">Active Accounts</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Role Type</span>
                      <span className="bigin-kpi-val" style={{ fontSize: 13 }}>
                        {viewData.is_system ? "System Protected" : "Custom Editable"}
                      </span>
                      <span className="bigin-kpi-sub">{viewData.is_system ? "Name Locked" : "Full Control"}</span>
                    </div>
                  </div>

                  {/* Users Assigned to this Role */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">
                      Users Assigned to This Role ({(viewData.users || []).length})
                    </div>
                    {(viewData.users || []).length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                        {viewData.users.map((u) => (
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
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: 13 }}>
                        No users currently assigned to this role.
                      </div>
                    )}
                  </div>

                  {/* Active Permissions Breakdown */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">
                      Active Permissions Breakdown ({(viewData.permissions || []).length})
                    </div>
                    <div className="matrix">
                      {matrix.map((g) => {
                        const gPerms = (viewData.permissions || []).filter((p) => p.group_name === g.group);
                        if (!gPerms.length) return null;
                        return (
                          <div key={g.group} className="matrix-group">
                            <div className="matrix-head" style={{ cursor: "default" }}>
                              <strong style={{ fontSize: 13, color: "#0f172a" }}>
                                {g.group.toUpperCase()}
                              </strong>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#0ba360" }}>
                                {gPerms.length} Active
                              </span>
                            </div>
                            <div className="matrix-perms">
                              {gPerms.map((p) => (
                                <span
                                  key={p.id}
                                  className="perm-chip on"
                                  style={{ cursor: "default" }}
                                >
                                  ✓ {p.name.split(":")[1] || p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#cf3d3d" }}>Role not found</div>
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
                <span>Configure Permissions</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4. EDIT ROLE & PERMISSIONS MATRIX DRAWER (?edit=<id>) */}
      {editId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeEdit} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge Draft">Configure</span>
                <div>
                  <h3 className="bigin-drawer-title">
                    Configure Role: {editRole?.name || editName || editId}
                  </h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    {editRole?.is_system ? "System role (Name locked, permissions customizable)" : "Custom enterprise role"}
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeEdit} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            {editLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                Loading role permissions...
              </div>
            ) : (
              <form onSubmit={updateRole} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="bigin-drawer-body">
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">Role Title</div>
                    <div>
                      <label className="label">
                        Role Title {editRole?.is_system && "(Locked for System Roles)"}
                      </label>
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={editRole?.is_system}
                        style={{ background: editRole?.is_system ? "#f8fafc" : "#ffffff" }}
                        required
                      />
                    </div>
                  </div>

                  {/* Permissions Matrix with Quick Presets */}
                  <div className="bigin-drawer-sec">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div className="bigin-drawer-sec-title" style={{ margin: 0, border: "none" }}>
                          Permissions Matrix
                        </div>
                        <span style={{ fontSize: 11.5, color: "#64748b" }}>
                          Toggle specific capabilities for this security group
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0ba360" }}>
                        {editPermIds.length} / {allPermIds.length} Selected
                      </span>
                    </div>

                    {/* Presets Toolbar */}
                    <div className="quick-preset-bar">
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Presets:</span>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => applyPreset(setEditPermIds, "all")}
                      >
                        ✓ Select All
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => applyPreset(setEditPermIds, "none")}
                      >
                        ✕ Clear All
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => applyPreset(setEditPermIds, "view_only")}
                      >
                        👁 Read-Only
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => applyPreset(setEditPermIds, "pm")}
                      >
                        💼 PM
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => applyPreset(setEditPermIds, "qs")}
                      >
                        💰 QS / Commercial
                      </button>
                    </div>

                    <div className="matrix">
                      {matrix.map((g) => {
                        const gIds = (g.permissions || []).map((p) => p.id);
                        const selCount = gIds.filter((id) => editPermIds.includes(id)).length;
                        const allIn = gIds.length > 0 && selCount === gIds.length;

                        return (
                          <div key={g.group} className="matrix-group">
                            <label className="matrix-head">
                              <div className="matrix-head-left">
                                <input
                                  type="checkbox"
                                  checked={allIn}
                                  onChange={() => toggleGroup(editPermIds, setEditPermIds, g)}
                                />
                                <strong style={{ fontSize: 13, color: "#0f172a" }}>
                                  {g.group.toUpperCase()}
                                </strong>
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: allIn ? "#166534" : selCount > 0 ? "#2563eb" : "#94a3b8",
                                }}
                              >
                                {selCount}/{gIds.length}
                              </span>
                            </label>

                            <div className="matrix-perms">
                              {g.permissions.map((p) => {
                                const checked = editPermIds.includes(p.id);
                                return (
                                  <label
                                    key={p.id}
                                    className={"perm-chip" + (checked ? " on" : "")}
                                    title={p.name}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePerm(editPermIds, setEditPermIds, p.id)}
                                    />
                                    <span>{p.name.split(":")[1] || p.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bigin-drawer-foot">
                  <button type="button" className="btn ghost" onClick={closeEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={busy} style={{ background: "#0ba360" }}>
                    {busy ? "Saving..." : "Save Role Permissions"}
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
