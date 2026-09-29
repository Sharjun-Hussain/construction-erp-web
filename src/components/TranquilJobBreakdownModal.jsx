"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";

export default function TranquilJobBreakdownModal({ isOpen, onClose, onSaved, jobData = null, projectData = null }) {
  const { lang } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Header State
  const [jobCategory, setJobCategory] = useState("Concrete Steel");
  const [jobName, setJobName] = useState("Pipe work");
  const [uom, setUom] = useState("kg");
  const [qty, setQty] = useState(120000);
  const [revenuePct, setRevenuePct] = useState(0);
  const [valuationMethod, setValuationMethod] = useState("Current Cost Price");
  const [defaultDiscount, setDefaultDiscount] = useState(0);
  const [defaultDiscountType, setDefaultDiscountType] = useState("%");

  // Descriptions
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");

  // 1. Material Items
  const [materials, setMaterials] = useState([
    {
      id: "mat_1",
      category: "Concrete",
      item: "PRD303 - Concrete C30",
      manufacturer: "Mishalr",
      quantity: 1.0,
      uom: "M3",
      unitCost: 280.0,
      discount: 0.0,
      unitRevenue: 280.0,
    },
  ]);

  // 2. Labour Items
  const [labourItems, setLabourItems] = useState([
    {
      id: "lab_1",
      labour: "Steel Fixer Grade A",
      task: "Fixing rebar cage",
      quantity: 2,
      totalDays: 5,
      hoursPerDay: 8,
      costPerHour: 25.0,
      unitRevenue: 30.0,
    },
  ]);

  // 3. Equipment Items
  const [equipmentItems, setEquipmentItems] = useState([
    {
      id: "eq_1",
      equipmentType: "Excavator",
      name: "CAT 320D Heavy Excavator",
      description: "Foundation trench excavation",
      uom: "HRS",
      totalDays: 3,
      hoursPerDay: 8,
      qty: 1,
      costPerHour: 150.0,
      unitRevenue: 180.0,
    },
  ]);

  // 4. Overhead Items
  const [overheadItems, setOverheadItems] = useState([
    {
      id: "ovh_1",
      costCenter: "Riyadh Site Office",
      description: "Site mobilization & supervision allocation",
      cost: 500.0,
      totalRevenue: 600.0,
    },
  ]);

  // 5. Subcontract Items
  const [subcontractItems, setSubcontractItems] = useState([
    {
      id: "sub_1",
      description: "Concrete Pumping & Testing Service",
      quantity: 1,
      uom: "LS",
      unitCost: 1200.0,
      unitRevenue: 1400.0,
    },
  ]);

  // Load Job data if editing
  useEffect(() => {
    if (jobData && isOpen) {
      setJobCategory(jobData.job_category || "Concrete Steel");
      setJobName(jobData.title || jobData.number || "Pipe work");
      setUom(jobData.uom || "kg");
      setQty(Number(jobData.scope_qty || 120000));
      setValuationMethod(jobData.material_cost_based_on || "Current Cost Price");
      setDefaultDiscount(Number(jobData.default_discount || 0));
      setDescription(jobData.description || "");

      if (jobData.breakdown_data) {
        if (jobData.breakdown_data.materials) setMaterials(jobData.breakdown_data.materials);
        if (jobData.breakdown_data.labour) setLabourItems(jobData.breakdown_data.labour);
        if (jobData.breakdown_data.equipment) setEquipmentItems(jobData.breakdown_data.equipment);
        if (jobData.breakdown_data.overhead) setOverheadItems(jobData.breakdown_data.overhead);
        if (jobData.breakdown_data.subcontract) setSubcontractItems(jobData.breakdown_data.subcontract);
      }
    }
  }, [jobData, isOpen]);

  // Calculations for all 5 tables
  const totals = useMemo(() => {
    let matCost = 0, matRev = 0;
    materials.forEach((m) => {
      const q = parseFloat(m.quantity) || 0;
      const c = parseFloat(m.unitCost) || 0;
      const r = parseFloat(m.unitRevenue) || 0;
      const disc = parseFloat(m.discount) || 0;
      matCost += Math.max(0, q * c - disc);
      matRev += q * r;
    });

    let labCost = 0, labRev = 0;
    labourItems.forEach((l) => {
      const q = parseFloat(l.quantity) || 0;
      const d = parseFloat(l.totalDays) || 0;
      const h = parseFloat(l.hoursPerDay) || 0;
      const totHrs = q * d * h;
      labCost += totHrs * (parseFloat(l.costPerHour) || 0);
      labRev += totHrs * (parseFloat(l.unitRevenue) || 0);
    });

    let eqCost = 0, eqRev = 0;
    equipmentItems.forEach((e) => {
      const q = parseFloat(e.qty) || 0;
      const d = parseFloat(e.totalDays) || 0;
      const h = parseFloat(e.hoursPerDay) || 0;
      const totHrs = q * d * h;
      eqCost += totHrs * (parseFloat(e.costPerHour) || 0);
      eqRev += totHrs * (parseFloat(e.unitRevenue) || 0);
    });

    let ovhCost = 0, ovhRev = 0;
    overheadItems.forEach((o) => {
      ovhCost += parseFloat(o.cost) || 0;
      ovhRev += parseFloat(o.totalRevenue) || 0;
    });

    let subCost = 0, subRev = 0;
    subcontractItems.forEach((s) => {
      const q = parseFloat(s.quantity) || 0;
      subCost += q * (parseFloat(s.unitCost) || 0);
      subRev += q * (parseFloat(s.unitRevenue) || 0);
    });

    const totalCost = matCost + labCost + eqCost + ovhCost + subCost;
    const totalRev = matRev + labRev + eqRev + ovhRev + subRev;

    return {
      matCost, matRev,
      labCost, labRev,
      eqCost, eqRev,
      ovhCost, ovhRev,
      subCost, subRev,
      totalCost,
      totalRevenue: totalRev,
    };
  }, [materials, labourItems, equipmentItems, overheadItems, subcontractItems]);

  const handleSave = async () => {
    setErrorMsg("");
    setBusy(true);
    try {
      const breakdownPayload = {
        materials,
        labour: labourItems,
        equipment: equipmentItems,
        overhead: overheadItems,
        subcontract: subcontractItems,
      };

      const payload = {
        job_category: jobCategory,
        title: jobName,
        uom: uom,
        scope_qty: qty,
        unit_price: totals.totalRevenue > 0 && qty > 0 ? (totals.totalRevenue / qty).toFixed(2) : 0,
        contract_amount: totals.totalRevenue,
        original_budget: totals.totalCost,
        material_cost_based_on: valuationMethod,
        default_discount: defaultDiscount,
        description,
        description_ar: descriptionAr,
        breakdown_data: breakdownPayload,
      };

      if (jobData?.id) {
        await api.put(`/jobs/${jobData.id}`, payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Failed to save Job breakdown.");
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tranquil-modal-overlay" onClick={onClose}>
      <div
        className="tranquil-modal-window job-breakdown-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "98vw",
          maxWidth: 1560,
          height: "94vh",
          background: "#ffffff",
          borderRadius: 10,
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.45)",
          overflow: "hidden",
        }}
      >
        {/* 1. ORANGE HEADER BAR MATCHING SCREENSHOT 5 */}
        <div
          style={{
            background: "#ea580c", // Bright Orange Header
            color: "#ffffff",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Job:{jobData?.number || "PR001-1"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* 2. SINGLE SCROLLABLE BODY */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 24px 24px",
            background: "#f8fafc",
          }}
        >
          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 14px",
                borderRadius: 6,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* HEADER PARAMETERS BAR (LIGHT BLUE BACKDROP MATCHING SCREENSHOT) */}
          <div
            style={{
              background: "#e0f2fe", // Light sky blue container
              padding: "14px 18px",
              borderRadius: 8,
              border: "1px solid #bae6fd",
              marginBottom: 16,
            }}
          >
            {/* Row 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1.2fr 1fr 1fr",
                gap: 12,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  JOB CATEGORY
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 32, fontSize: 12, background: "#fff" }}
                  value={jobCategory}
                  onChange={(e) => setJobCategory(e.target.value)}
                >
                  <option value="Concrete Steel">Concrete Steel</option>
                  <option value="Civil Works">Civil Works</option>
                  <option value="MEP Piping">MEP Piping</option>
                  <option value="Finishing & Joinery">Finishing & Joinery</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  JOB
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 32, fontSize: 12, background: "#fff" }}
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                >
                  <option value="Pipe work">Pipe work</option>
                  <option value="Concrete Pouring">Concrete Pouring</option>
                  <option value="Waterproofing Membrane">Waterproofing Membrane</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  UOM
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 32, fontSize: 12, background: "#fff" }}
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="M3">M3</option>
                  <option value="M2">M2</option>
                  <option value="LM">LM</option>
                  <option value="NOS">NOS</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  QTY
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12, background: "#fff" }}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  REVENUE PERCENTAGE
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12, background: "#fff" }}
                  value={revenuePct}
                  onChange={(e) => setRevenuePct(e.target.value)}
                />
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", display: "block" }}>TOTAL COST</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>
                  {totals.totalCost.toFixed(2)}
                </span>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", display: "block" }}>TOTAL REVENUE</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>
                  {totals.totalRevenue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ minWidth: 200 }}>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  MATERIAL COST BASED ON
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 32, fontSize: 12, background: "#fff" }}
                  value={valuationMethod}
                  onChange={(e) => setValuationMethod(e.target.value)}
                >
                  <option value="Current Cost Price">Current Cost Price</option>
                  <option value="Moving Average">Moving Average</option>
                  <option value="Last Purchase GRN">Last Purchase GRN</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 0 }}>
                  DEFAULT DISCOUNT
                </label>
                <select
                  className="select"
                  style={{ height: 32, fontSize: 12, background: "#fff", width: 55 }}
                  value={defaultDiscountType}
                  onChange={(e) => setDefaultDiscountType(e.target.value)}
                >
                  <option value="%">%</option>
                  <option value="SAR">SAR</option>
                </select>
                <input
                  type="number"
                  className="input"
                  style={{ width: 80, height: 32, textAlign: "right", fontSize: 12, background: "#fff" }}
                  value={defaultDiscount}
                  onChange={(e) => setDefaultDiscount(e.target.value)}
                />
                <button
                  type="button"
                  style={{
                    background: "#ea580c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    width: 28,
                    height: 32,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title="Apply Discount"
                >
                  ■
                </button>
              </div>
            </div>
          </div>

          {/* 5 RESOURCE BREAKDOWN TABLES */}

          {/* 1. MATERIAL TABLE */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 4 }}>Material</div>
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 40 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>CATEGORY</th>
                    <th style={{ padding: "8px 8px" }}>ITEM</th>
                    <th style={{ padding: "8px 8px" }}>MANUFACTURER / PART NO.</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>QUANTITY UOM</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>UNIT COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>DISCOUNT</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>UNIT REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PROFIT %</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => (
                    <tr key={m.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>{m.category}</td>
                      <td style={{ fontWeight: 650 }}>{m.item}</td>
                      <td>{m.manufacturer}</td>
                      <td style={{ textAlign: "right" }}>{m.quantity} {m.uom}</td>
                      <td style={{ textAlign: "right" }}>{m.unitCost.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{m.discount.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{m.unitRevenue.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.matCost.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.matRev.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>0.00</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                    <td colSpan={8} style={{ color: "#ea580c", padding: "6px 8px" }}>TOTAL</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.matCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.matRev.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. LABOUR TABLE */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 4 }}>Labour</div>
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 40 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>LABOUR</th>
                    <th style={{ padding: "8px 8px" }}>TASK</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>QUANTITY</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL DAYS</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>HOURS PER DAY</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL LABOUR HOUR</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>COST PER HOUR</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>UNIT REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PROFIT %</th>
                  </tr>
                </thead>
                <tbody>
                  {labourItems.map((l, idx) => (
                    <tr key={l.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>{l.labour}</td>
                      <td>{l.task}</td>
                      <td style={{ textAlign: "right" }}>{l.quantity}</td>
                      <td style={{ textAlign: "right" }}>{l.totalDays}</td>
                      <td style={{ textAlign: "right" }}>{l.hoursPerDay}</td>
                      <td style={{ textAlign: "right" }}>{l.quantity * l.totalDays * l.hoursPerDay}</td>
                      <td style={{ textAlign: "right" }}>{l.costPerHour.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{l.unitRevenue.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.labCost.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.labRev.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>0.00</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                    <td colSpan={9} style={{ color: "#ea580c", padding: "6px 8px" }}>TOTAL</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.labCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.labRev.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. EQUIPMENT TABLE */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 4 }}>Equipment</div>
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 40 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>EQUIPMENT TYPE</th>
                    <th style={{ padding: "8px 8px" }}>NAME</th>
                    <th style={{ padding: "8px 8px" }}>DESCRIPTION</th>
                    <th style={{ padding: "8px 8px" }}>UOM</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL DAYS</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>HOURS PER DAY</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>QTY</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>COST PER HOUR</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>UNIT REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PROFIT %</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentItems.map((e, idx) => (
                    <tr key={e.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>{e.equipmentType}</td>
                      <td>{e.name}</td>
                      <td>{e.description}</td>
                      <td>{e.uom}</td>
                      <td style={{ textAlign: "right" }}>{e.totalDays}</td>
                      <td style={{ textAlign: "right" }}>{e.hoursPerDay}</td>
                      <td style={{ textAlign: "right" }}>{e.qty}</td>
                      <td style={{ textAlign: "right" }}>{e.costPerHour.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{e.unitRevenue.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.eqCost.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.eqRev.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>0.00</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                    <td colSpan={10} style={{ color: "#ea580c", padding: "6px 8px" }}>TOTAL</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.eqCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.eqRev.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. OVERHEAD TABLE */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 4 }}>Overhead</div>
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 40 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>COST CENTER</th>
                    <th style={{ padding: "8px 8px" }}>DESCRIPTION</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PROFIT PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {overheadItems.map((o, idx) => (
                    <tr key={o.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>{o.costCenter}</td>
                      <td>{o.description}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{o.cost.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{o.totalRevenue.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>0.00</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                    <td colSpan={3} style={{ color: "#ea580c", padding: "6px 8px" }}>TOTAL</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.ovhCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.ovhRev.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. SUBCONTRACT TABLE */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 4 }}>Subcontract</div>
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 40 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>DESCRIPTION</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>QUANTITY UOM</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>UNIT COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>UNIT REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL COST</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>TOTAL REVENUE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PROFIT PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {subcontractItems.map((s, idx) => (
                    <tr key={s.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>{s.description}</td>
                      <td style={{ textAlign: "right" }}>{s.quantity} {s.uom}</td>
                      <td style={{ textAlign: "right" }}>{s.unitCost.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{s.unitRevenue.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.subCost.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{totals.subRev.toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>0.00</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                    <td colSpan={5} style={{ color: "#ea580c", padding: "6px 8px" }}>TOTAL</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.subCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c", padding: "6px 8px" }}>{totals.subRev.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DESCRIPTIONS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                DESCRIPTION
              </label>
              <textarea
                rows={3}
                className="input"
                style={{ width: "100%", padding: 8, fontSize: 12, background: "#e0f2fe", border: "1px solid #cbd5e1" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                DESCRIPTION ARABIC
              </label>
              <textarea
                rows={3}
                className="input"
                dir="rtl"
                style={{ width: "100%", padding: 8, fontSize: 12, background: "#e0f2fe", border: "1px solid #cbd5e1" }}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 3. PINNED FOOTER */}
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
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
              padding: "7px 20px",
              fontSize: 13,
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            style={{
              background: "#0ba360",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "7px 24px",
              fontSize: 13,
              fontWeight: 750,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Saving..." : "SAVE BREAKDOWN"}
          </button>
        </div>
      </div>
    </div>
  );
}
