"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

export default function DepartmentPage() {
  const { lang } = useAppStore();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    name_ar: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // Load departments
  const loadDepartments = () => {
    setLoading(true);
    api
      .get("/masters/lookup/department")
      .then((r) => {
        setDepartments(r.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setDepartments([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Filtered rows for DataTable
  const filteredRows = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.toLowerCase();
    return departments.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.name_ar?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q)
    );
  }, [departments, search]);

  // Open modal for New or Edit
  const handleOpenModal = (item = null) => {
    setErrorMsg("");
    if (item) {
      setEditItem(item);
      setModalForm({
        name: item.name || "",
        name_ar: item.name_ar || "",
        description: item.description || "",
      });
    } else {
      setEditItem(null);
      setModalForm({
        name: "",
        name_ar: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  // Submit Department Form
  const handleSaveDepartment = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!modalForm.name.trim()) {
      setErrorMsg("Please enter a Department Name.");
      return;
    }

    setSaving(true);
    try {
      const codeStr =
        editItem?.code ||
        modalForm.name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")
          .slice(0, 15) ||
        `DEP_${Date.now()}`;

      const payload = {
        code: codeStr,
        name: modalForm.name.trim(),
        name_ar: modalForm.name_ar.trim() || null,
        description: modalForm.description.trim() || null,
      };

      if (editItem) {
        await api.put(`/masters/lookup/department/${editItem.id}`, payload);
      } else {
        await api.post("/masters/lookup/department", payload);
      }

      handleCloseModal();
      loadDepartments();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Failed to save department. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active State
  const handleToggleActive = async (item) => {
    try {
      await api.put(`/masters/lookup/department/${item.id}`, {
        is_active: !item.is_active,
      });
      loadDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Department
  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete the department "${item.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/masters/lookup/department/${item.id}`);
      loadDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  // Columns definition for DataTable
  const columns = [
    {
      key: "name",
      label: "DEPARTMENT NAME",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar name={r.name || "Dept"} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5 }}>{r.name}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>Code: {r.code}</span>
          </div>
        </div>
      ),
    },
    {
      key: "name_ar",
      label: "DEPARTMENT NAME ARABIC",
      sortable: true,
      render: (r) => (
        <span dir="rtl" style={{ fontWeight: 650, color: "#334155", fontSize: 13.5 }}>
          {r.name_ar || "—"}
        </span>
      ),
    },
    {
      key: "description",
      label: "DESCRIPTION",
      sortable: true,
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "#475569" }}>
          {r.description || "—"}
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
            onClick={() => handleOpenModal(r)}
            title="Edit Department"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => handleToggleActive(r)}
            title={r.is_active ? "Deactivate" : "Activate"}
          >
            {r.is_active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: "#ef4444" }}
            onClick={() => handleDelete(r)}
            title="Delete Department"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {/* DATA TABLE LISTING */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DataTable
          title="Departments"
          subtitle="Corporate organization departments, Arabic naming & operational classifications"
          rows={filteredRows}
          columns={columns}
          loading={loading}
          total={filteredRows.length}
          searchPlaceholder="Search department name, Arabic name, code, description..."
          onSearchChange={(q) => setSearch(q)}
          onAdd={() => handleOpenModal(null)}
          addLabel="+ Add Department"
          rightActions={
            <button
              type="button"
              className="btn sm"
              onClick={() => handleOpenModal(null)}
              style={{
                background: "#0ba360",
                borderColor: "#0ba360",
                color: "#ffffff",
                fontWeight: 650,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 7,
              }}
            >
              <span>+</span> Add Department
            </button>
          }
        />
      </div>

      {/* 3. DEPARTMENT MODAL MATCHING USER SCREENSHOT EXACTLY */}
      {isModalOpen && (
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
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 620,
              background: "#ffffff",
              borderRadius: 8,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.35)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header Bar */}
            <div
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {editItem ? "Edit Department" : "Department"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
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

            {/* Modal Form Body */}
            <form onSubmit={handleSaveDepartment}>
              <div style={{ padding: "24px 28px", background: "#ffffff" }}>
                {errorMsg && (
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
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Field 1: DEPARTMENT NAME */}
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      color: "#475569",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    DEPARTMENT NAME *
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{
                      width: "100%",
                      height: 38,
                      fontSize: 13.5,
                      borderRadius: 5,
                      border: "1px solid #cbd5e1",
                    }}
                    value={modalForm.name}
                    onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                {/* Field 2: DEPARTMENT NAME ARABIC */}
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      color: "#475569",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    DEPARTMENT NAME ARABIC
                  </label>
                  <input
                    type="text"
                    className="input"
                    dir="rtl"
                    style={{
                      width: "100%",
                      height: 38,
                      fontSize: 13.5,
                      borderRadius: 5,
                      border: "1px solid #cbd5e1",
                    }}
                    value={modalForm.name_ar}
                    onChange={(e) => setModalForm({ ...modalForm, name_ar: e.target.value })}
                  />
                </div>

                {/* Field 3: DESCRIPTION */}
                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 750,
                      color: "#475569",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{
                      width: "100%",
                      height: 38,
                      fontSize: 13.5,
                      borderRadius: 5,
                      border: "1px solid #cbd5e1",
                    }}
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "14px 28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
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
      )}
    </div>
  );
}
