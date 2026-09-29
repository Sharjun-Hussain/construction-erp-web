"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

export default function Roles() {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [matrix, setMatrix] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [name, setName] = useState("");
  const [permIds, setPermIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/roles").then((r) => { setRows(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
    api.get("/roles/permissions/matrix").then((r) => setMatrix(r.data.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setName(""); setPermIds([]); setDrawer({ mode: "create" }); };
  const openEdit = (row) => {
    api.get("/roles/" + row.id).then((r) => {
      setName(r.data.data.name);
      setPermIds((r.data.data.permissions || []).map((p) => p.id));
      setDrawer({ mode: "edit", role: r.data.data });
    }).catch(() => {});
  };
  const toggle = (id) => setPermIds(permIds.includes(id) ? permIds.filter((x) => x !== id) : [...permIds, id]);
  const toggleGroup = (g) => {
    const ids = g.permissions.map((p) => p.id);
    const all = ids.every((id) => permIds.includes(id));
    setPermIds(all ? permIds.filter((id) => !ids.includes(id)) : [...new Set([...permIds, ...ids])]);
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      if (drawer.mode === "create") await api.post("/roles", { name, permission_ids: permIds });
      else await api.put("/roles/" + drawer.role.id, { permission_ids: permIds });
      setDrawer(null); load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const delRole = async (row) => {
    if (!window.confirm(t(lang, "confirmDelete"))) return;
    try { await api.delete("/roles/" + row.id); load(); }
    catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };

  const columns = [
    { key: "name", label: t(lang, "roleName"), render: (r) => <span>{r.name} {r.is_system && <span className="badge Draft" title="system">SYS</span>}</span> },
    { key: "permissions", label: t(lang, "permissionsLbl"), render: (r) => (r.permissions || []).length },
    { key: "users", label: t(lang, "users"), render: (r) => r.user_count ?? "-" },
    {
      key: "actions", label: "", render: (r) => (
        <span style={{ display: "flex", gap: 6 }}>
          <button className="btn ghost sm" onClick={() => openEdit(r)}>{t(lang, "editProject")}</button>
          {!r.is_system && <button className="btn ghost sm" onClick={() => delRole(r)}>×</button>}
        </span>
      ),
    },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "roles")}</h2></div><span className="spacer" />
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      <DataTable
        columns={columns} rows={rows} total={rows.length} page={1} limit={100}
        onPage={() => {}} onLimit={() => {}}
        selected={selected} onSelect={setSelected} keyOf={(r) => r.id}
        loading={loading}
        title={t(lang, "roles")}
        onAdd={openCreate}
        addLabel={"+ " + t(lang, "newRole")}
        stats={[{ label: t(lang, "roles"), value: rows.length }]}
      />

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.mode === "create" ? t(lang, "newRole") : drawer.role.name}</h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <form onSubmit={save}>
              {drawer.mode === "create" && (
                <div style={{ marginBottom: 12 }}>
                  <label className="label">{t(lang, "roleName")} *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <label className="label">{t(lang, "permissionsLbl")} ({permIds.length})</label>
              <div className="matrix">
                {matrix.map((g) => {
                  const ids = g.permissions.map((p) => p.id);
                  const all = ids.length > 0 && ids.every((id) => permIds.includes(id));
                  return (
                    <div key={g.group} className="matrix-group">
                      <label className="matrix-head">
                        <input type="checkbox" checked={all} onChange={() => toggleGroup(g)} />
                        <b>{g.group}</b><span className="muted">({g.permissions.filter((p) => permIds.includes(p.id)).length}/{g.permissions.length})</span>
                      </label>
                      <div className="matrix-perms">
                        {g.permissions.map((p) => (
                          <label key={p.id} className={"perm-chip" + (permIds.includes(p.id) ? " on" : "")} title={p.name}>
                            <input type="checkbox" checked={permIds.includes(p.id)} onChange={() => toggle(p.id)} />
                            <span>{p.name.split(":")[1] || p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14 }}><button className="btn" type="submit" disabled={busy}>{busy ? "..." : t(lang, "save")}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
