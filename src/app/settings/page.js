"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const GROUPS = ["company", "tax", "projects", "numbering", "inventory"];
const NUM = (v) => (v === "" || v === null || v === undefined ? "" : v);

export default function Settings() {
  const router = useRouter();
  const { lang, setLang } = useAppStore();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("company");
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data.data)).catch(() => {});
    api.get("/settings").then((r) => setCfg(r.data.data)).catch((e) => {
      if (e?.response?.status === 403) setMsg(t(lang, "noAccess"));
      else setMsg("Error");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canEdit = (user?.roles || []).some((r) => (r.permissions || []).some((p) => p.name === "setting:edit" || p.name === "*" || p.name === "Admin:*"))
    || (user?.roles || []).some((r) => r.name === "Organization Admin" || r.name === "Super Admin");
  const setG = (g, k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setCfg({ ...cfg, [g]: { ...cfg[g], [k]: v } });
  };
  const save = async () => {
    setBusy(true); setMsg(""); setOk("");
    try {
      const num = (g, k) => (cfg[g][k] === "" ? cfg[g][k] : Number(cfg[g][k]));
      const body = {
        company: { ...cfg.company },
        tax: { vat_pct: num("tax", "vat_pct"), zatca_enabled: !!cfg.tax.zatca_enabled },
        projects: {
          default_retention_pct: num("projects", "default_retention_pct"),
          default_vat_pct: num("projects", "default_vat_pct"),
          default_advance_pct: num("projects", "default_advance_pct"),
          default_currency: cfg.projects.default_currency,
          default_billing_type: cfg.projects.default_billing_type,
          default_payment_terms: cfg.projects.default_payment_terms,
        },
        numbering: { ...cfg.numbering, padding: num("numbering", "padding") },
        inventory: { default_min_qty: num("inventory", "default_min_qty") },
      };
      const r = await api.put("/settings", body);
      setCfg(r.data.data);
      setOk(t(lang, "savedLbl"));
    } catch (e) { setMsg(e?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const logout = () => {
    localStorage.removeItem("qulf_access");
    document.cookie = "qulf_access=; path=/; max-age=0; SameSite=Lax";
    router.replace("/login");
    router.refresh();
  };

  const F = ({ g, k, type, options }) => (
    <div>
      <label className="label">{t(lang, "set_" + g + "_" + k)}</label>
      {type === "check" ? (
        <label className="check-row"><input type="checkbox" checked={!!cfg[g][k]} onChange={setG(g, k)} /><span>{t(lang, "enabledLbl")}</span></label>
      ) : options ? (
        <select className="select" value={cfg[g][k]} onChange={setG(g, k)}>{options.map((o) => (<option key={o}>{o}</option>))}</select>
      ) : (
        <input className="input" type={type || "text"} value={NUM(cfg[g][k])} onChange={setG(g, k)} dir={type === "number" ? "ltr" : undefined} />
      )}
    </div>
  );

  return (
    <div>
      <div className="page-head"><h2>{t(lang, "settings")}</h2><span className="spacer" />
        {cfg && canEdit && <button className="btn" onClick={save} disabled={busy}>{busy ? "..." : t(lang, "save")}</button>}
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="card">
          <h3>{t(lang, "account")}</h3>
          <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: 13 }}>{user?.organization?.name || "-"}</p>
          <p style={{ margin: "4px 0" }}><b>{user?.name || "-"}</b></p>
          <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: 13 }}>{user?.email || "-"}</p>
        </div>
        <div className="card">
          <h3>{t(lang, "preferences")}</h3>
          <label className="label">{t(lang, "language")}</label>
          <div className="tabs">
            <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>English</button>
            <button type="button" className={lang === "ar" ? "on" : ""} onClick={() => setLang("ar")}>العربية</button>
          </div>
          <button className="btn ghost" onClick={logout}>{t(lang, "logout")}</button>
        </div>
        <div className="card">
          <h3>Qulf ERP</h3>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>v0.5 · {t(lang, "appVersion")}</p>
        </div>
      </div>

      {cfg && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="tabs" style={{ maxWidth: 720, marginBottom: 16 }}>
            {GROUPS.map((g) => (
              <button key={g} type="button" className={tab === g ? "on" : ""} onClick={() => setTab(g)}>{t(lang, "setg_" + g)}</button>
            ))}
          </div>
          {!canEdit && <div className="alert err">{t(lang, "noAccess")}</div>}
          <fieldset disabled={!canEdit} style={{ border: "none", padding: 0, margin: 0 }}>
            {tab === "company" && (
              <div className="form-grid">
                <F g="company" k="name" /><F g="company" k="name_ar" /><F g="company" k="phone" /><F g="company" k="email" />
                <F g="company" k="city" /><F g="company" k="commercial_registration" /><F g="company" k="tax_number" />
                <div style={{ gridColumn: "1 / -1" }}><F g="company" k="address" /></div>
              </div>
            )}
            {tab === "tax" && (
              <div className="form-grid">
                <F g="tax" k="vat_pct" type="number" /><F g="tax" k="zatca_enabled" type="check" />
              </div>
            )}
            {tab === "projects" && (
              <div className="form-grid">
                <F g="projects" k="default_retention_pct" type="number" /><F g="projects" k="default_vat_pct" type="number" />
                <F g="projects" k="default_advance_pct" type="number" />
                <F g="projects" k="default_currency" options={["SAR", "AED", "QAR", "KWD", "BHD", "OMR", "USD"]} />
                <F g="projects" k="default_billing_type" options={["Monthly", "Milestone", "Percentage"]} />
                <F g="projects" k="default_payment_terms" />
              </div>
            )}
            {tab === "numbering" && (
              <div className="form-grid">
                {["project", "boq", "estimation", "tender", "ipc", "po", "grn", "indent", "quotation", "advance"].map((k) => (
                  <F key={k} g="numbering" k={k} />
                ))}
                <F g="numbering" k="padding" type="number" />
              </div>
            )}
            {tab === "inventory" && (
              <div className="form-grid">
                <F g="inventory" k="default_min_qty" type="number" />
              </div>
            )}
          </fieldset>
        </div>
      )}
    </div>
  );
}
