"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";

export default function TranquilSalesOrderModal({ isOpen, onClose, onSaved, editData = null }) {
  const { lang } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Metadata Dropdowns
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Form State Header
  const [vatExempt, setVatExempt] = useState(false);
  const [quotationNo, setQuotationNo] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryPeriod, setDeliveryPeriod] = useState("30 Days");
  const [customerPoNo, setCustomerPoNo] = useState("");
  const [poDate, setPoDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [reference, setReference] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [priceList, setPriceList] = useState("Standard Price List");

  // Customer Credit Info Ribbon
  const [creditLimit, setCreditLimit] = useState(0.00);
  const [pendingAmount, setPendingAmount] = useState(0.00);
  const [totalOutstanding, setTotalOutstanding] = useState(0.00);
  const [advanceAmount, setAdvanceAmount] = useState(0.00);
  const [availableCreditLimit, setAvailableCreditLimit] = useState(0.00);

  // Commercial Terms
  const [deliveryMethod, setDeliveryMethod] = useState("Shipping");
  const [paymentTerms, setPaymentTerms] = useState("Cash On Delivery");
  const [termsAndConditions, setTermsAndConditions] = useState("Default");
  const [salesman, setSalesman] = useState("Super Admin");
  const [costCenter, setCostCenter] = useState("Default");
  const [companyBankAccount, setCompanyBankAccount] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Totals & Financials
  const [shippingCharge, setShippingCharge] = useState(0);
  const [discountType, setDiscountType] = useState("percent"); // "percent" or "amount"
  const [discountVal, setDiscountVal] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  // Line Items Table State
  const [items, setItems] = useState([
    {
      id: "row_1",
      poSlNo: "1",
      item: "Structural Steel Beam 200mm Heavy Grade",
      warehouse: "Main Riyadh Warehouse",
      quantity: 10,
      uom: "TON",
      unitPrice: 3800,
      discountCurrency: "SAR",
      discount: 0,
      vatType: "15",
      vatAmount: 5700,
      totalAmount: 43700,
      deliveryPeriod: "14 Days",
    },
  ]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fetch dropdown metadata
  useEffect(() => {
    if (!isOpen) return;

    api.get("/customers?limit=100").then((r) => setCustomers(r.data.data || [])).catch(() => {});
    api.get("/quotations?limit=100").then((r) => setQuotations(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/uom").then((r) => setUoms(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/payment_terms").then((r) => setPaymentTermsList(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/delivery_method").then((r) => setDeliveryMethods(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/cost_center").then((r) => setCostCenters(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/warehouse").then((r) => setWarehouses(r.data.data || [])).catch(() => {});
    api.get("/masters/banks").then((r) => setBankAccounts(r.data.data || [])).catch(() => {});
    api.get("/users?limit=100").then((r) => setUsersList(r.data.data || [])).catch(() => {});
  }, [isOpen]);

  // Load edit data if provided
  useEffect(() => {
    if (editData && isOpen) {
      setVatExempt(Boolean(editData.vat_exempt));
      setQuotationNo(editData.quotation_no || "");
      setOrderDate(editData.order_date ? editData.order_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDeliveryPeriod(editData.delivery_period || "30 Days");
      setCustomerPoNo(editData.customer_po_no || "");
      setPoDate(editData.po_date ? editData.po_date.slice(0, 10) : "");
      setCustomerId(editData.customer_id || "");
      setCustomerName(editData.customer_name || "");
      setReference(editData.reference || "");
      setContactPerson(editData.contact_person || "");
      setPriceList(editData.price_list || "Standard Price List");

      setCreditLimit(Number(editData.credit_limit || 0));
      setPendingAmount(Number(editData.pending_amount || 0));
      setTotalOutstanding(Number(editData.total_outstanding || 0));
      setAdvanceAmount(Number(editData.advance_amount || 0));
      setAvailableCreditLimit(Number(editData.available_credit_limit || 0));

      setDeliveryMethod(editData.delivery_method || "Shipping");
      setPaymentTerms(editData.payment_terms || "Cash On Delivery");
      setTermsAndConditions(editData.terms_conditions || "Default");
      setSalesman(editData.salesman || "Super Admin");
      setCostCenter(editData.cost_center || "Default");
      setCompanyBankAccount(editData.bank_account || "");
      setShippingAddress(editData.shipping_address || "");
      setNotes(editData.notes || "");

      setShippingCharge(Number(editData.shipping_charge || 0));
      setDiscountType(editData.discount_type || "percent");
      setDiscountVal(Number(editData.discount_val || editData.discount_amount || 0));
      setRoundOff(Number(editData.round_off || 0));

      if (editData.items && Array.isArray(editData.items) && editData.items.length) {
        setItems(editData.items);
      }
    }
  }, [editData, isOpen]);

  // Handle Customer Select & autofill credit limits
  const handleCustomerSelect = (e) => {
    const cId = e.target.value;
    setCustomerId(cId);
    const found = customers.find((c) => String(c.id) === String(cId));
    if (found) {
      setCustomerName(found.name);
      if (found.address) setShippingAddress(found.address);
      if (found.payment_terms) setPaymentTerms(found.payment_terms);
      if (found.credit_limit) setCreditLimit(Number(found.credit_limit));
      if (found.available_credit) setAvailableCreditLimit(Number(found.available_credit));
    }
  };

  // Populate order fields from selected Quotation
  const handleQuotationSelect = (qNo) => {
    setQuotationNo(qNo);
    const found = quotations.find((q) => q.quotation_no === qNo || String(q.id) === String(qNo));
    if (found) {
      if (found.customer_name) setCustomerName(found.customer_name);
      if (found.customer_id) setCustomerId(found.customer_id);
      if (found.delivery_period) setDeliveryPeriod(found.delivery_period);
      if (found.payment_terms) setPaymentTerms(found.payment_terms);
      if (found.items && Array.isArray(found.items)) {
        setItems(
          found.items.map((it, idx) => ({
            id: `row_${idx + 1}`,
            poSlNo: String(idx + 1),
            item: it.item || it.description || "",
            warehouse: warehouses[0]?.name || "Main Riyadh Warehouse",
            quantity: it.quantity || 1,
            uom: it.uom || "NOS",
            unitPrice: it.unitPrice || it.unit_price || 0,
            discountCurrency: "SAR",
            discount: it.discount || 0,
            vatType: it.vatType || "15",
            vatAmount: it.vatAmount || 0,
            totalAmount: it.totalAmount || 0,
            deliveryPeriod: it.deliveryPeriod || "As per schedule",
          }))
        );
      }
    }
  };

  // Line Item Calculations
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const disc = parseFloat(item.discount) || 0;
      const baseTotal = Math.max(0, qty * price - disc);

      const vatRate = vatExempt ? 0 : parseFloat(item.vatType) || 0;
      const vatAmt = (baseTotal * vatRate) / 100;
      const totAmt = baseTotal + vatAmt;

      item.vatAmount = Math.round(vatAmt * 100) / 100;
      item.totalAmount = Math.round(totAmt * 100) / 100;

      next[index] = item;
      return next;
    });
  };

  // Recalculate line items when VAT Exempt toggle changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const disc = parseFloat(item.discount) || 0;
        const baseTotal = Math.max(0, qty * price - disc);

        const vatRate = vatExempt ? 0 : parseFloat(item.vatType) || 0;
        const vatAmt = (baseTotal * vatRate) / 100;
        const totAmt = baseTotal + vatAmt;

        return {
          ...item,
          vatAmount: Math.round(vatAmt * 100) / 100,
          totalAmount: Math.round(totAmt * 100) / 100,
        };
      })
    );
  }, [vatExempt]);

  // Add Row
  const addRow = () => {
    const newId = `row_${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        poSlNo: String(prev.length + 1),
        item: "",
        warehouse: warehouses[0]?.name || "Main Riyadh Warehouse",
        quantity: 1,
        uom: "NOS",
        unitPrice: 0,
        discountCurrency: "SAR",
        discount: 0,
        vatType: vatExempt ? "0" : "15",
        vatAmount: 0,
        totalAmount: 0,
        deliveryPeriod: "As per schedule",
      },
    ]);
  };

  // Remove Row
  const removeRow = (index) => {
    if (items.length <= 1) {
      alert("At least one line item is required in the sales order.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Summary Totals
  const { subtotal, totalVat, calculatedNet } = useMemo(() => {
    let totAmt = 0;
    let totVat = 0;

    items.forEach((it) => {
      const qty = parseFloat(it.quantity) || 0;
      const price = parseFloat(it.unitPrice) || 0;
      const disc = parseFloat(it.discount) || 0;
      const base = Math.max(0, qty * price - disc);
      totAmt += base;
      totVat += it.vatAmount || 0;
    });

    let overallDiscount = 0;
    if (discountType === "percent") {
      overallDiscount = (totAmt * (parseFloat(discountVal) || 0)) / 100;
    } else {
      overallDiscount = parseFloat(discountVal) || 0;
    }

    const shipCharge = parseFloat(shippingCharge) || 0;
    const netBeforeRound = Math.max(0, totAmt - overallDiscount + totVat + shipCharge);
    const net = netBeforeRound + (parseFloat(roundOff) || 0);

    return {
      subtotal: totAmt,
      totalVat: totVat,
      calculatedNet: Math.max(0, net),
    };
  }, [items, discountType, discountVal, shippingCharge, roundOff]);

  // Save Order Handler
  const handleSave = async (printAfter = false) => {
    setErrorMsg("");
    if (!customerName.trim()) {
      setErrorMsg("Please select or specify a Customer name.");
      return;
    }
    if (!items.length || items.every((it) => !it.item)) {
      setErrorMsg("Please add at least one line item with description.");
      return;
    }

    setBusy(true);
    try {
      const orderPayload = {
        quotation_no: quotationNo,
        order_date: orderDate,
        delivery_period: deliveryPeriod,
        customer_po_no: customerPoNo,
        po_date: poDate || null,
        customer_id: customerId || null,
        customer_name: customerName,
        reference: reference,
        contact_person: contactPerson,
        price_list: priceList,

        credit_limit: creditLimit,
        pending_amount: pendingAmount,
        total_outstanding: totalOutstanding,
        advance_amount: advanceAmount,
        available_credit_limit: availableCreditLimit,

        vat_exempt: vatExempt,
        subtotal: subtotal,
        shipping_charge: parseFloat(shippingCharge) || 0,
        discount_type: discountType,
        discount_val: parseFloat(discountVal) || 0,
        discount_amount: discountType === "amount" ? parseFloat(discountVal) : 0,
        total_vat: totalVat,
        round_off: parseFloat(roundOff) || 0,
        net_amount: calculatedNet,

        delivery_method: deliveryMethod,
        payment_terms: paymentTerms,
        terms_conditions: termsAndConditions,
        salesman: salesman,
        cost_center: costCenter,
        bank_account: companyBankAccount,
        shipping_address: shippingAddress,
        notes: notes,
        items: items,
        status: editData?.status || "Confirmed",
      };

      if (editData?.id) {
        await api.put(`/sales-orders/${editData.id}`, orderPayload);
      } else {
        await api.post("/sales-orders", orderPayload);
      }

      onSaved?.();
      if (printAfter) {
        window.print();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Failed to save sales order. Please check all fields.");
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tranquil-modal-overlay" onClick={onClose}>
      <div
        className="tranquil-modal-window sales-order-modal-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "98vw",
          maxWidth: 1540,
          height: "94vh",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.4)",
          overflow: "hidden",
        }}
      >
        {/* 1. DARK SLATE HEADER BAR */}
        <div
          style={{
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              SO
            </span>
            <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {editData ? "Edit Sales Order" : "Sales Order"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 4,
            }}
            title="Close Sales Order"
          >
            ×
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
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
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

          {/* Top Checkbox: VAT EXEMPT */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                fontWeight: 650,
                color: "#334155",
                cursor: "pointer",
                background: "#ffffff",
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
              }}
            >
              <input
                type="checkbox"
                checked={vatExempt}
                onChange={(e) => setVatExempt(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#0ba360" }}
              />
              <span>VAT EXEMPT</span>
            </label>
          </div>

          {/* SECTION A: HEADER FORM FIELDS */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px 20px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
              marginBottom: 16,
            }}
          >
            {/* Row 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Quotation No.
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={quotationNo}
                  onChange={(e) => handleQuotationSelect(e.target.value)}
                >
                  <option value="">Select Quotation</option>
                  {quotations.map((q) => (
                    <option key={q.id} value={q.quotation_no || q.id}>
                      {q.quotation_no || `QTN-${q.id}`} - {q.customer_name || q.client_name || "Quotation"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Date *
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Delivery Period
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={deliveryPeriod}
                  onChange={(e) => setDeliveryPeriod(e.target.value)}
                  placeholder="e.g. 30 Days"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Customer PO #
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={customerPoNo}
                  onChange={(e) => setCustomerPoNo(e.target.value)}
                  placeholder="PO Number"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  PO Date
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Customer *
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    className="select"
                    style={{ flex: 1, height: 35, fontSize: 13 }}
                    value={customerId}
                    onChange={handleCustomerSelect}
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cr_number ? `(${c.cr_number})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    style={{
                      background: "#f97316",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      width: 36,
                      height: 35,
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Add Customer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Reference
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  placeholder="Reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Contact Person
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Manager">Manager</option>
                  <option value="Procurement Officer">Procurement Officer</option>
                  <option value="Site Engineer">Site Engineer</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Price List
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                >
                  <option value="Select">Select</option>
                  <option value="Standard Price List">Standard Price List</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Contractor Tier A">Contractor Tier A</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION B: CREDIT LIMIT & OUTSTANDING RIBBON */}
          <div
            style={{
              background: "#e8f5e9",
              border: "1px solid #c8e6c9",
              borderRadius: 8,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              fontSize: 12,
              fontWeight: 700,
              color: "#2e7d32",
            }}
          >
            <div>
              <span style={{ color: "#475569", fontWeight: 600 }}>CREDIT LIMIT</span>{" "}
              <span style={{ color: "#d97706", marginLeft: 6 }}>﷼ {creditLimit.toFixed(2)}</span>
            </div>

            <div>
              <span style={{ color: "#475569", fontWeight: 600 }}>PENDING</span>{" "}
              <span style={{ color: "#d97706", marginLeft: 6 }}>﷼ {pendingAmount.toFixed(2)}</span>
            </div>

            <div>
              <span style={{ color: "#475569", fontWeight: 600 }}>TOTAL OUTSTANDING</span>{" "}
              <span style={{ color: "#d97706", marginLeft: 6 }}>﷼ {totalOutstanding.toFixed(2)}</span>
            </div>

            <div>
              <span style={{ color: "#475569", fontWeight: 600 }}>ADVANCE</span>{" "}
              <span style={{ color: "#d97706", marginLeft: 6 }}>﷼ {advanceAmount.toFixed(2)}</span>
            </div>

            <div>
              <span style={{ color: "#475569", fontWeight: 600 }}>AVAILABLE CREDIT LIMIT</span>{" "}
              <span style={{ color: "#d97706", marginLeft: 6 }}>﷼ {availableCreditLimit.toFixed(2)}</span>
            </div>
          </div>

          {/* SECTION C: LINE ITEMS TABLE */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
              overflowX: "auto",
              marginBottom: 12,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ width: 45, textAlign: "center", padding: "10px 6px" }}>SL NO.</th>
                  <th style={{ width: 65, textAlign: "left", padding: "10px 6px" }}>PO SL #</th>
                  <th style={{ minWidth: 220, padding: "10px 10px" }}>ITEM</th>
                  <th style={{ width: 150, padding: "10px 8px" }}>WAREHOUSE</th>
                  <th style={{ width: 80, textAlign: "right", padding: "10px 8px" }}>QUANTITY</th>
                  <th style={{ width: 85, padding: "10px 8px" }}>UOM</th>
                  <th style={{ width: 100, textAlign: "right", padding: "10px 8px" }}>UNIT PRICE</th>
                  <th style={{ width: 95, textAlign: "right", padding: "10px 8px" }}>DISCOUNT</th>
                  <th style={{ width: 105, padding: "10px 8px" }}>VAT</th>
                  <th style={{ width: 95, textAlign: "right", padding: "10px 8px" }}>VAT AMOUNT</th>
                  <th style={{ width: 110, textAlign: "right", padding: "10px 8px" }}>TOTAL</th>
                  <th style={{ width: 115, padding: "10px 8px" }}>DELIVERY PERIOD</th>
                  <th style={{ width: 40, textAlign: "center", padding: "10px 6px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                      {idx + 1}
                    </td>

                    <td>
                      <input
                        type="text"
                        className="input"
                        style={{ width: "100%", height: 32, fontSize: 12 }}
                        value={row.poSlNo || ""}
                        onChange={(e) => updateItem(idx, "poSlNo", e.target.value)}
                      />
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="text"
                          className="input"
                          style={{ flex: 1, height: 32, fontSize: 12 }}
                          placeholder="Select or enter item..."
                          value={row.item}
                          onChange={(e) => updateItem(idx, "item", e.target.value)}
                          required
                        />
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#0284c7",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Item Info"
                        >
                          i
                        </span>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#f59e0b",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Item Specs"
                        >
                          ?
                        </span>
                      </div>
                    </td>

                    <td>
                      <select
                        className="select"
                        style={{ width: "100%", height: 32, fontSize: 12 }}
                        value={row.warehouse}
                        onChange={(e) => updateItem(idx, "warehouse", e.target.value)}
                      >
                        {warehouses.length > 0 ? (
                          warehouses.map((w) => (
                            <option key={w.id} value={w.name}>
                              {w.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Main Riyadh Warehouse">Main Riyadh Warehouse</option>
                            <option value="Jeddah Central Store">Jeddah Central Store</option>
                            <option value="Dammam Site Depot">Dammam Site Depot</option>
                          </>
                        )}
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input"
                        style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12 }}
                        value={row.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        min="0"
                        step="any"
                      />
                    </td>

                    <td>
                      <select
                        className="select"
                        style={{ width: "100%", height: 32, fontSize: 11.5 }}
                        value={row.uom}
                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                      >
                        {uoms.length > 0 ? (
                          uoms.map((u) => (
                            <option key={u.id} value={u.code}>
                              {u.code}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="NOS">NOS</option>
                            <option value="M">M</option>
                            <option value="M2">M2</option>
                            <option value="M3">M3</option>
                            <option value="KG">KG</option>
                            <option value="TON">TON</option>
                            <option value="LS">LS</option>
                            <option value="SET">SET</option>
                          </>
                        )}
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input"
                        style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12 }}
                        value={row.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input"
                        style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12 }}
                        value={row.discount}
                        onChange={(e) => updateItem(idx, "discount", e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </td>

                    <td>
                      <select
                        className="select"
                        style={{ width: "100%", height: 32, fontSize: 11.5 }}
                        value={vatExempt ? "0" : row.vatType}
                        disabled={vatExempt}
                        onChange={(e) => updateItem(idx, "vatType", e.target.value)}
                      >
                        <option value="15">15%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>

                    <td style={{ textAlign: "right", fontWeight: 600, color: "#475569" }}>
                      {(row.vatAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                      {(row.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td>
                      <input
                        type="text"
                        className="input"
                        style={{ width: "100%", height: 32, fontSize: 11.5 }}
                        value={row.deliveryPeriod}
                        onChange={(e) => updateItem(idx, "deliveryPeriod", e.target.value)}
                      />
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 16,
                          lineHeight: 1,
                          padding: "2px 4px",
                        }}
                        title="Delete Row"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TABLE ACTION BUTTONS */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              type="button"
              onClick={addRow}
              style={{
                background: "#f97316",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              + Add Row
            </button>

            <button
              type="button"
              style={{
                background: "#0ba360",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🔍 Advance Item Search
            </button>

            <button
              type="button"
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📊 Bulk Entry
            </button>
          </div>

          {/* SECTION D: COMMERCIAL TERMS & FINANCIAL SUMMARY */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* LEFT: COMMERCIAL TERMS */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 10,
                padding: "16px 20px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Delivery Method
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 35, fontSize: 12.5 }}
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                  >
                    <option value="Shipping">Shipping</option>
                    <option value="Customer Pickup">Customer Pickup</option>
                    <option value="Air Freight">Air Freight</option>
                    <option value="Site Delivery">Site Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Payment Terms
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 35, fontSize: 12.5 }}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Cash On Delivery">Cash On Delivery</option>
                    <option value="30 Days Net">30 Days Net</option>
                    <option value="50% Advance 50% On Delivery">50% Advance 50% On Delivery</option>
                    <option value="Letter of Credit (LC)">Letter of Credit (LC)</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Terms and Conditions
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 35, fontSize: 12.5 }}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                  >
                    <option value="Default">Default</option>
                    <option value="Standard Supply Terms">Standard Supply Terms</option>
                    <option value="Turnkey Terms">Turnkey Terms</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Salesman
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 35, fontSize: 12.5 }}
                    value={salesman}
                    onChange={(e) => setSalesman(e.target.value)}
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Ahmed Al-Mansoor">Ahmed Al-Mansoor</option>
                    <option value="Tariq Ziad">Tariq Ziad</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Cost Center
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 35, fontSize: 12.5 }}
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                  >
                    <option value="Default">Default</option>
                    <option value="Riyadh Project Division">Riyadh Project Division</option>
                    <option value="Jeddah Infra Division">Jeddah Infra Division</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Company Bank Account
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 35, fontSize: 12.5 }}
                    value={companyBankAccount}
                    onChange={(e) => setCompanyBankAccount(e.target.value)}
                  >
                    <option value="">Select Account</option>
                    <option value="Al Rajhi Bank (IBAN SA458000...)">Al Rajhi Bank (IBAN SA458000...)</option>
                    <option value="SNB Al Ahli (IBAN SA921000...)">SNB Al Ahli (IBAN SA921000...)</option>
                  </select>
                </div>
              </div>

              {/* Text Areas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Shipping Address
                  </label>
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ background: "#f8fafc", padding: "4px 8px", borderBottom: "1px solid #cbd5e1", fontSize: 12, color: "#64748b", display: "flex", gap: 8 }}>
                      <span><b>B</b></span> <span><i>I</i></span> <span><u>U</u></span> <span>11 ▾</span>
                    </div>
                    <textarea
                      rows={3}
                      style={{ width: "100%", padding: 8, border: "none", outline: "none", fontSize: 12.5, resize: "vertical" }}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Delivery site destination address..."
                    />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Notes
                  </label>
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ background: "#f8fafc", padding: "4px 8px", borderBottom: "1px solid #cbd5e1", fontSize: 12, color: "#64748b", display: "flex", gap: 8 }}>
                      <span><b>B</b></span> <span><i>I</i></span> <span><u>U</u></span> <span>11 ▾</span>
                    </div>
                    <textarea
                      rows={3}
                      style={{ width: "100%", padding: 8, border: "none", outline: "none", fontSize: 12.5, resize: "vertical" }}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional commercial notes or remarks..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: FINANCIAL SUMMARY CARD */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 10,
                padding: "18px 20px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Total Subtotal */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 700, color: "#475569" }}>
                  <span>TOTAL</span>
                  <span>{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Shipping Charge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 650, color: "#64748b" }}>SHIPPING CHARGE</span>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 130, height: 32, textAlign: "right", fontSize: 12 }}
                    value={shippingCharge}
                    onChange={(e) => setShippingCharge(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Discount */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      className="select"
                      style={{ height: 32, fontSize: 12 }}
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <option value="percent">Discount %</option>
                      <option value="amount">Discount SAR</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 130, height: 32, textAlign: "right", fontSize: 12 }}
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    min="0"
                    step="any"
                  />
                </div>

                {/* Total VAT */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 650, color: "#64748b" }}>
                  <span>TOTAL VAT</span>
                  <span>{totalVat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Round Off */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 650, color: "#64748b" }}>ROUND OFF</span>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 130, height: 32, textAlign: "right", fontSize: 12 }}
                    value={roundOff}
                    onChange={(e) => setRoundOff(e.target.value)}
                    step="any"
                  />
                </div>

                <div style={{ borderTop: "2px dashed #cbd5e1", margin: "4px 0" }} />

                {/* Net Amount */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, fontWeight: 800, color: "#0284c7" }}>
                  <span>NET AMOUNT</span>
                  <span>﷼ {calculatedNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PINNED BOTTOM FOOTER BAR */}
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📎 Attachments (0)
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 650,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={busy}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 24px",
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Saving..." : "SAVE"}
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={busy}
              style={{
                background: "#0ba360",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 24px",
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              SAVE & PRINT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
