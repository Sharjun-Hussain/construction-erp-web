"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

export default function LoginForm() {
  const router = useRouter();
  const { lang, setLang } = useAppStore();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", org_name: "", name: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const fillDemo = () => {
    setTab("login");
    setForm((prev) => ({
      ...prev,
      email: "admin@qulf.sa",
      password: "Admin@123",
    }));
    setMsg("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (tab === "login" && (!form.email || !form.password)) {
      setMsg(t(lang, "needAll"));
      return;
    }
    if (tab === "register" && (!form.org_name || !form.name || !form.email || !form.password)) {
      setMsg(t(lang, "needAll"));
      return;
    }
    setBusy(true);
    try {
      const url = tab === "login" ? "/auth/login" : "/auth/register-org";
      const r = await api.post(url, form);
      const token = r.data.data.access_token;
      
      // Store in localStorage for client-side API requests
      localStorage.setItem("qulf_access", token);
      
      // Store in secure cookie for server-side auth & middleware protection
      document.cookie = `qulf_access=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setMsg(err?.response?.data?.message || t(lang, "loginFail"));
    } finally {
      setBusy(false);
    }
  };

  const isRtl = lang === "ar";

  return (
    <div className="login-wrap" dir={isRtl ? "rtl" : "ltr"}>
      {/* Brand & Showcase Side */}
      <div className="login-side">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <span>{t(lang, "app")}</span>
        </div>
        <h1>{t(lang, "tagline")}</h1>
        <p>BOQ · Estimation · Tender · Procurement · DPR · IPC — multi-tenant, bilingual, ZATCA-ready.</p>
        <div className="login-pills"><span>EN / AR</span><span>SAR · VAT 15%</span><span>ZATCA-READY</span></div>
        <div className="feat">
          <div><span className="feat-dot"></span>{t(lang, "feat1")}</div>
          <div><span className="feat-dot"></span>{t(lang, "feat2")}</div>
          <div><span className="feat-dot"></span>{t(lang, "feat3")}</div>
          <div><span className="feat-dot"></span>{t(lang, "feat4")}</div>
        </div>
        <div className="login-proof">
          <div><b>09</b><span>{t(lang, "modules")}</span></div>
          <div><b>02</b><span>EN / AR</span></div>
          <div><b>15%</b><span>VAT</span></div>
        </div>
      </div>

      {/* Auth Card Side */}
      <div className="login-form">
        <div className="login-card">
          {/* Top Bar with Language Switcher */}
          <div className="login-top-bar">
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
              {t(lang, "app")} v0.1
            </span>
            <button
              type="button"
              className="langbtn"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              title="Change Language"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </button>
          </div>

          <div className="login-box">
            {/* Header info */}
            <div className="login-header">
              <h2>{tab === "login" ? t(lang, "welcomeBack") : t(lang, "register")}</h2>
              <p>{tab === "login" ? t(lang, "welcomeSub") : t(lang, "registerSub")}</p>
            </div>

            {/* Quick Demo Pill Helper */}
            {tab === "login" && (
              <button
                type="button"
                className="demo-pill-btn"
                onClick={fillDemo}
                title={t(lang, "demoHint")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span>{t(lang, "quickDemo")}</span>
                </div>
                <span className="demo-pill-badge">admin@qulf.sa</span>
              </button>
            )}

            {/* Tabs */}
            <div className="tabs">
              <button
                type="button"
                className={tab === "login" ? "on" : ""}
                onClick={() => { setTab("login"); setMsg(""); }}
              >
                {t(lang, "login")}
              </button>
              <button
                type="button"
                className={tab === "register" ? "on" : ""}
                onClick={() => { setTab("register"); setMsg(""); }}
              >
                {t(lang, "register")}
              </button>
            </div>

            {/* Alert Message */}
            {msg && (
              <div className="alert err" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{msg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
              {tab === "register" && (
                <>
                  <div>
                    <label className="label">{t(lang, "orgName")}</label>
                    <input
                      className="input"
                      placeholder="e.g. Al-Bawani Contracting Co."
                      value={form.org_name}
                      onChange={set("org_name")}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{t(lang, "yourName")}</label>
                    <input
                      className="input"
                      placeholder="e.g. Tariq Al-Mansoor"
                      value={form.name}
                      onChange={set("name")}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="label">{t(lang, "email")}</label>
                <input
                  className="input"
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={set("email")}
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="label">{t(lang, "password")}</label>
                <div className="input-wrapper">
                  <input
                    className="input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? t(lang, "hidePassword") : t(lang, "showPassword")}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button className="btn-submit" disabled={busy} type="submit">
                {busy && <span className="spin-loader"></span>}
                <span>
                  {busy
                    ? "..."
                    : tab === "login"
                    ? t(lang, "signIn")
                    : t(lang, "createAccount")}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
