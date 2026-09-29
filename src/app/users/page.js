"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const emptyForm = { name: "", email: "", password: "", phone: "", branch_id: "", language: "en", role_ids: [], branch_ids: [] };
const fdate = (d, lang) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "-"; }
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
  const [drawer, setDrawer] = useState(null);
  const [dtab, setDtab] = useState("info");
  const [form, setForm] = useState(emptyForm);
  const [tempPw, setTempPw] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (activeF) q.push("is_active=" + activeF);
    api.get("/users?" + q.join("&")).then((r) => {
      setRows(r.data.data || []);
      setTotal(r.data.meta?.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
    api.get("/users?limit=1&is_active=true").then((r) => setCounts((c) => ({ ...c, active: r.data.meta?.total || 0 }))).catch(() => {});
    api.get("/users?limit=1&is_active=false").then((r) => setCounts((c) => ({ ...c, inactive: r.data.meta?.total || 0 }))).catch(() => {});
  };
  const loadRefs = () => {
    api.get("/roles").then((r) => setRoles(r.data.data || [])).catch(() => {});
    api.get("/branches").then((r) => setBranches(r.data.data || [])).catch(() => {});
  };
  useEffect(() => { load(); loadRefs(); }, []);

  const openCreate = () => {
    setForm(emptyForm); setTempPw(""); setDtab("info"); setDrawer({ mode: "create" });
  };
  const openDetail = (u) => {
    api.get("/users/" + u.id).then((r) => {
      const d = r.data.data;
      setForm({
        name: d.name || "", email: d.email || "", password: "", phone: d.phone || "",
        branch_id: d.branch_id || "", language: d.language || "en",
        role_ids: (d.roles || []).map((x) => x.id), branch_ids: (d.branches || []).map((x) => x.id),
      });
      setTempPw(""); setDtab("info"); setDrawer({ mode: "edit", user: d });
    }).catch(() => {});
  };
  const close = () => { setDrawer(null); setTempPw(""); };
  const fs = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleId = (list, id) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      if (!body.branch_id) delete body.branch_id;
      if (drawer.mode === "create") {
        const r = await api.post("/users", body);
        if (r.data.data.temp_password) setTempPw(r.data.data.temp_password);
        setDrawer({ mode: "edit", user: r.data.data });
      } else {
        const r = await api.put("/users/" + drawer.user.id, body);
        setDrawer({ mode: "edit", user: r.data.data });
      }
      setSelected([]); load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const flipActive = async (u, active) => {
    try {
      await api.post(`/users/${u.id}/${active ? "activate" : "deactivate"}`);
      if (drawer?.user?.id === u.id) setDrawer({ ...drawer, user: { ...drawer.user, is_active: active } });
      load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const resetPw = async () => {
    try {
      const r = await api.post(`/users/${drawer.user.id}/reset-password`, {});
      setTempPw(r.data.temp_password);
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const delUser = async () => {
    if (!window.confirm(t(lang, "confirmDelete"))) return;
    try { await api.delete("/users/" + drawer.user.id); close(); load(); }
    catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const bulkFlip = (active) => async (ids) => {
    await Promise.all(ids.map((id) => api.post(`/users/${id}/${active ? "activate" : "deactivate"}`).catch(() => null)));
    setSelected([]); load();
  };

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k); setSortDir(nd); load(page, limit, k, nd);
  };

  const columns = [
    { key: "name", label: t(lang, "memberName"), sortable: true, render: (u) => <BiginAvatar name={u.name} color={u.is_active ? "#1d5bd8" : "#94a3b8"} /> },
    { key: "email", label: t(lang, "email"), sortable: true },
    { key: "roles", label: t(lang, "roles"), render: (u) => (u.roles || []).map((r) => r.name).join(", ") || "-" },
    { key: "branches", label: t(lang, "branchesLbl"), render: (u) => (u.branches || []).map((b) => b.name).join(", ") || "-" },
    { key: "last_login_at", label: t(lang, "lastLogin"), sortable: true, render: (u) => fdate(u.last_login_at, lang) },
    { key: "is_active", label: "Status", sortable: false, render: (u) => <span className={"badge " + (u.is_active ? "Active" : "Suspended")}>{u.is_active ? t(lang, "activeLbl") : t(lang, "inactiveLbl")}</span> },
    { key: "actions", label: "", render: (u) => <button className="btn ghost sm" onClick={() => openDetail(u)}>{t(lang, "viewDetails")}</button> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "users")}</h2></div><span className="spacer" />
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit, sortBy, sortDir); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l, sortBy, sortDir); }}
        sortBy={sortBy} sortDir={sortDir} onSort={onSort}
        selected={selected} onSelect={setSelected} keyOf={(u) => u.id}
        loading={loading}
        title={t(lang, "users")}
        activeFilter={activeF === "true" ? t(lang, "activeLbl") : activeF === "false" ? t(lang, "inactiveLbl") : t(lang, "allLbl")}
        filterOptions={[
          { label: t(lang, "allLbl"), value: "" },
          { label: t(lang, "activeLbl"), value: "true" },
          { label: t(lang, "inactiveLbl"), value: "false" },
        ]}
        onFilterChange={(v) => { setActiveF(v); setPage(1); setSelected([]); load(1, limit, sortBy, sortDir); }}
        search={search}
        onSearchChange={(val) => {
          setSearch(val); setPage(1);
          clearTimeout(window.__uq);
          window.__uq = setTimeout(() => load(1, limit, sortBy, sortDir, val), 300);
        }}
        onAdd={openCreate}
        addLabel={"+ " + t(lang, "newUser")}
        stats={[
          { label: t(lang, "totalUsers"), value: total },
          { label: t(lang, "activeLbl"), value: counts.active },
          { label: t(lang, "inactiveLbl"), value: counts.inactive },
        ]}
        bulkActions={[
          { key: "act", label: t(lang, "activateUser"), onClick: bulkFlip(true) },
          { key: "de", label: t(lang, "deactivateUser"), danger: true, onClick: bulkFlip(false) },
        ]}
      />

      {drawer && (
        <div className="drawer-ov" onClick={close}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.mode === "create" ? t(lang, "newUser") : drawer.user.name}</h3>
              <button className="btn ghost sm" onClick={close}>×</button>
            </div>
            {tempPw && <div className="alert ok">{t(lang, "tempPassword")}: <b dir="ltr">{tempPw}</b> — {t(lang, "showOnce")}</div>}
            <div className="tabs" style={{ marginBottom: 14 }}>
              {["info", "access", "security"].map((x) => (
                <button key={x} type="button" className={dtab === x ? "on" : ""} onClick={() => setDtab(x)}>{t(lang, "tab" + x[0].toUpperCase() + x.slice(1))}</button>
              ))}
            </div>
            <form onSubmit={save}>
              {dtab === "info" && (
                <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <div><label className="label">{t(lang, "memberName")} *</label><input className="input" value={form.name} onChange={fs("name")} required /></div>
                  <div><label className="label">{t(lang, "email")} *</label><input className="input" dir="ltr" value={form.email} onChange={fs("email")} required disabled={drawer.mode === "edit"} /></div>
                  <div><label className="label">{t(lang, "password")} {drawer.mode === "edit" && <span className="muted">({t(lang, "optionalLbl")})</span>}</label><input className="input" type="text" dir="ltr" value={form.password} onChange={fs("password")} placeholder={t(lang, "autoGenHint")} /></div>
                  <div><label className="label">{t(lang, "phone")}</label><input className="input" dir="ltr" value={form.phone} onChange={fs("phone")} /></div>
                  <div><label className="label">{t(lang, "language")}</label>
                    <select className="select" value={form.language} onChange={fs("language")}><option value="en">English</option><option value="ar">العربية</option></select></div>
                </div>
              )}
              {dtab === "access" && (
                <>
                  <label className="label">{t(lang, "roles")}</label>
                  <div className="check-list">
                    {roles.map((r) => (
                      <label key={r.id} className="check-row">
                        <input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={() => setForm({ ...form, role_ids: toggleId(form.role_ids, r.id) })} />
                        <span>{r.name}</span>
                      </label>
                    ))}
                  </div>
                  <label className="label" style={{ marginTop: 12 }}>{t(lang, "branchesLbl")}</label>
                  <div className="check-list">
                    {branches.map((b) => (
                      <label key={b.id} className="check-row">
                        <input type="checkbox" checked={(form.branch_ids.includes(b.id) || form.branch_id === b.id)} onChange={() => setForm({ ...form, branch_id: b.id, branch_ids: toggleId(form.branch_ids, b.id) })} />
                        <span>{b.name}{b.is_main ? " •" : ""}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {dtab === "security" && drawer.mode === "edit" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1 }}>{drawer.user.is_active ? t(lang, "activeLbl") : t(lang, "inactiveLbl")}</span>
                    <button type="button" className="btn ghost sm" onClick={() => flipActive(drawer.user, !drawer.user.is_active)}>
                      {drawer.user.is_active ? t(lang, "deactivateUser") : t(lang, "activateUser")}
                    </button>
                  </div>
                  <div className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1 }}>{t(lang, "resetPw")}</span>
                    <button type="button" className="btn ghost sm" onClick={resetPw}>{t(lang, "resetPw")}</button>
                  </div>
                  <button type="button" className="btn danger sm" onClick={delUser}>{t(lang, "deleteUser")}</button>
                </div>
              )}
              {dtab !== "security" && <div style={{ marginTop: 14 }}><button className="btn" type="submit" disabled={busy}>{busy ? "..." : t(lang, "save")}</button></div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
