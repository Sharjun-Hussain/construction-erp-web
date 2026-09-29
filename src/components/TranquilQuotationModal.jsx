"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";

export default function TranquilQuotationModal({ isOpen, onClose, onSaved, editData = null }) {
  const { lang } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Metadata dropdowns
  const [customers, setCustomers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Form State
  const [vatExempt, setVatExempt] = useState(false);
  const [enquiryId, setEnquiryId] = useState("");
  const [revision, setRevision] = useState(0);
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [deliveryPeriod, setDeliveryPeriod] = useState("30 Days");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [reference, setReference] = useState("");
  const [priceList, setPriceList] = useState("Standard Price List");
  const [contactPerson, setContactPerson] = useState("");

  // Commercial Parameters
  const [deliveryMethod, setDeliveryMethod] = useState("Shipping");
  const [paymentTerms, setPaymentTerms] = useState("Cash On Delivery");
  const [termsAndConditions, setTermsAndConditions] = useState("Default");
  const [salesman, setSalesman] = useState("Super Admin");
  const [costCenter, setCostCenter] = useState("Default");
  const [companyBankAccount, setCompanyBankAccount] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Overall Discount & Round off
  const [discountType, setDiscountType] = useState("percent"); // "percent" or "amount"
  const [discountVal, setDiscountVal] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  // Line Items
  const [items, setItems] = useState([
    {
      id: "row_1",
      item: "Structural Steel Works & Framing",
      quantity: 1,
      uom: "TON",
      unitPrice: 4200,
      discountCurrency: "SAR",
      discount: 0,
      vatType: "15",
      vatAmount: 630,
      totalAmount: 4830,
      deliveryPeriod: "14 Days",
    },
  ]);

  // Lock background scroll when open
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

  // Load Metadata
  useEffect(() => {
    if (!isOpen) return;

    api.get("/customers?limit=100").then((r) => setCustomers(r.data.data || [])).catch(() => {});
    api.get("/prebid/enquiries?limit=100").then((r) => setEnquiries(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/uom").then((r) => setUoms(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/payment_terms").then((r) => setPaymentTermsList(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/delivery_method").then((r) => setDeliveryMethods(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/cost_center").then((r) => setCostCenters(r.data.data || [])).catch(() => {});
    api.get("/masters/banks").then((r) => setBankAccounts(r.data.data || [])).catch(() => {});
    api.get("/users?limit=100").then((r) => setUsersList(r.data.data || [])).catch(() => {});
  }, [isOpen]);

  // Populate if editing
  useEffect(() => {
    if (editData && isOpen) {
      setVatExempt(Boolean(editData.vat_exempt));
      setEnquiryId(editData.enquiry_id || "");
      setRevision(editData.revision || 0);
      setQuotationDate(editData.created_at ? editData.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setExpiryDate(editData.valid_until || "");
      setDeliveryPeriod(editData.delivery_period || "30 Days");
      setCustomerId(editData.customer_id || "");
      setCustomerName(editData.client_name || "");
      setReference(editData.reference_no || editData.title || "");
      setPriceList(editData.price_list || "Standard Price List");
      setContactPerson(editData.contact_person || "");
      setDeliveryMethod(editData.delivery_method || "Shipping");
      setPaymentTerms(editData.payment_terms || "Cash On Delivery");
      setTermsAndConditions(editData.terms_conditions || "Default");
      setSalesman(editData.salesman || "Super Admin");
      setCostCenter(editData.cost_center || "Default");
      setCompanyBankAccount(editData.bank_account || "");
      setShippingAddress(editData.shipping_address || "");
      setNotes(editData.notes || "");
      setDiscountVal(Number(editData.discount_percent || editData.discount_amount || 0));
      setRoundOff(Number(editData.round_off || 0));
      if (editData.items && Array.isArray(editData.items) && editData.items.length) {
        setItems(editData.items);
      }
    }
  }, [editData, isOpen]);

  // Handle Customer Selection
  const handleCustomerSelect = (e) => {
    const cId = e.target.value;
    setCustomerId(cId);
    const found = customers.find((c) => String(c.id) === String(cId));
    if (found) {
      setCustomerName(found.name);
      if (found.address) setShippingAddress(found.address);
      if (found.payment_terms) setPaymentTerms(found.payment_terms);
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

  // Re-calculate all items when vatExempt changes
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

  // Add & Remove rows
  const addRow = () => {
    const newId = `row_${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        item: "",
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

  const removeRow = (index) => {
    if (items.length <= 1) {
      alert("At least one line item is required in the quotation.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Summary Totals
  const { totalAmount, totalVat, calculatedNet } = useMemo(() => {
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

    const netBeforeRound = Math.max(0, totAmt - overallDiscount + totVat);
    const net = netBeforeRound + (parseFloat(roundOff) || 0);

    return {
      totalAmount: totAmt,
      totalVat: totVat,
      calculatedNet: Math.max(0, net),
    };
  }, [items, discountType, discountVal, roundOff]);

  // Save Quotation Handler
  const handleSave = async (printAfter = false) => {
    setErrorMsg("");
    if (!customerName.trim()) {
      setErrorMsg("Please select or specify a Customer name.");
      return;
    }
    if (!items.length || items.every((it) => !it.item)) {
      setErrorMsg("Please add at least one line item with a description.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: reference.trim() || `Commercial Quotation for ${customerName}`,
        client_name: customerName,
        customer_id: customerId || null,
        enquiry_id: enquiryId || null,
        revision: Number(revision) || 0,
        amount: calculatedNet,
        subtotal: totalAmount,
        vat_exempt: vatExempt,
        vat_amount: totalVat,
        discount_amount: discountType === "amount" ? Number(discountVal) : 0,
        discount_percent: discountType === "percent" ? Number(discountVal) : 0,
        round_off: Number(roundOff) || 0,
        delivery_period: deliveryPeriod,
        delivery_method: deliveryMethod,
        terms_conditions: termsAndConditions,
        salesman: salesman,
        cost_center: costCenter,
        bank_account: companyBankAccount,
        shipping_address: shippingAddress,
        notes: notes,
        contact_person: contactPerson,
        price_list: priceList,
        reference_no: reference,
        items: items,
        valid_until: expiryDate,
        payment_terms: paymentTerms,
      };

      const qtnPayload = {
        ...payload,
        quotation_no: editData?.quotation_no || undefined,
        customer_name: customerName,
        quotation_date: quotationDate,
        expiry_date: expiryDate,
        total_amount: totalAmount,
        total_vat: totalVat,
        net_amount: calculatedNet,
        discount_type: discountType,
        discount_val: parseFloat(discountVal) || 0,
        reference: reference,
      };

      if (editData?.id) {
        try {
          await api.put(`/quotations/${editData.id}`, qtnPayload);
        } catch {
          await api.put(`/prebid/proposals/${editData.id}`, payload);
        }
      } else {
        try {
          await api.post("/quotations", qtnPayload);
        } catch {
          await api.post("/prebid/proposals", payload);
        }
      }

      onSaved?.();
      if (printAfter) {
        window.print();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Failed to save quotation. Please verify all fields.");
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tranquil-modal-overlay" onClick={onClose}>
      <div
        className="tranquil-modal-window quotation-modal-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "96vw",
          maxWidth: 1480,
          height: "92vh",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
        }}
      >
        {/* 1. TOP HEADER BAR */}
        <div
          style={{
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "linear-gradient(135deg, #0ba360 0%, #057a44 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Q
            </span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {editData ? "Edit Quotation" : "New Quotation"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 4,
            }}
            title="Close Quotation"
          >
            ×
          </button>
        </div>

        {/* 2. SCROLLABLE FORM BODY (Single Scrollbar) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 22px 24px",
            background: "#f8fafc",
          }}
        >
          {errorMsg && (
            <div
              className="alert err"
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

          {/* VAT Exempt Checkbox */}
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
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            >
              <input
                type="checkbox"
                checked={vatExempt}
                onChange={(e) => setVatExempt(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#0ba360" }}
              />
              <span>VAT Exempt (Saudi ZATCA Zero-Rated / Exempt)</span>
            </label>
          </div>

          {/* Header Fields Section */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px 18px",
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
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Enquiry No.
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={enquiryId}
                  onChange={(e) => setEnquiryId(e.target.value)}
                >
                  <option value="">— Direct / Standalone Enquiry —</option>
                  {enquiries.map((enq) => (
                    <option key={enq.id} value={enq.id}>
                      {enq.number} - {enq.title || enq.client_name || "Enquiry"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Revision
                </label>
                <input
                  type="number"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  min="0"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Quotation Date *
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Expiry Date *
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Delivery Period
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  placeholder="e.g. 30 Days"
                  value={deliveryPeriod}
                  onChange={(e) => setDeliveryPeriod(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Customer *
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    className="select"
                    style={{ flex: 1, height: 35, fontSize: 13 }}
                    value={customerId}
                    onChange={handleCustomerSelect}
                  >
                    <option value="">— Select Customer —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cr_number ? `(${c.cr_number})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="input"
                    style={{ flex: 1, height: 35, fontSize: 13 }}
                    placeholder="Or type client name..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Reference
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  placeholder="Client RFQ / Reference No."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Price List
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                >
                  <option>Standard Price List</option>
                  <option>Contractor Tier A</option>
                  <option>Wholesale Discount</option>
                  <option>Government Tender Rate</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                  Contact Person
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 35, fontSize: 13 }}
                  placeholder="Engineer / Buyer"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. LINE ITEMS SCHEDULE TABLE */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
              overflowX: "auto",
              marginBottom: 16,
            }}
          >
            <table
              className="tbl"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ width: 45, textAlign: "center", padding: "10px 8px" }}>Sl No.</th>
                  <th style={{ minWidth: 260, padding: "10px 10px" }}>Item Description *</th>
                  <th style={{ width: 90, textAlign: "right", padding: "10px 8px" }}>Quantity</th>
                  <th style={{ width: 95, padding: "10px 8px" }}>UOM</th>
                  <th style={{ width: 110, textAlign: "right", padding: "10px 8px" }}>Unit Price</th>
                  <th style={{ width: 100, textAlign: "right", padding: "10px 8px" }}>Discount</th>
                  <th style={{ width: 115, padding: "10px 8px" }}>VAT Type</th>
                  <th style={{ width: 105, textAlign: "right", padding: "10px 8px" }}>VAT Amount</th>
                  <th style={{ width: 125, textAlign: "right", padding: "10px 8px" }}>Total Amount</th>
                  <th style={{ width: 120, padding: "10px 8px" }}>Delivery Period</th>
                  <th style={{ width: 45, textAlign: "center", padding: "10px 8px" }}></th>
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
                        style={{ width: "100%", height: 32, fontSize: 12.5 }}
                        placeholder="Material, scope of works or trade item..."
                        value={row.item}
                        onChange={(e) => updateItem(idx, "item", e.target.value)}
                        required
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input"
                        style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12.5 }}
                        value={row.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        min="0"
                        step="any"
                      />
                    </td>

                    <td>
                      <select
                        className="select"
                        style={{ width: "100%", height: 32, fontSize: 12 }}
                        value={row.uom}
                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                      >
                        {uoms.length > 0 ? (
                          uoms.map((u) => (
                            <option key={u.id} value={u.code}>
                              {u.code} - {u.name}
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
                        style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12.5 }}
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
                        style={{ width: "100%", height: 32, textAlign: "right", fontSize: 12.5 }}
                        value={row.discount}
                        onChange={(e) => updateItem(idx, "discount", e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </td>

                    <td>
                      <select
                        className="select"
                        style={{ width: "100%", height: 32, fontSize: 12 }}
                        value={vatExempt ? "0" : row.vatType}
                        disabled={vatExempt}
                        onChange={(e) => updateItem(idx, "vatType", e.target.value)}
                      >
                        <option value="15">Standard 15%</option>
                        <option value="0">Zero 0%</option>
                        <option value="0">Exempt 0%</option>
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
                        style={{ width: "100%", height: 32, fontSize: 12 }}
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

            {/* Table Action Buttons Underneath */}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 14px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                className="btn sm"
                onClick={addRow}
                style={{
                  background: "#ea580c",
                  borderColor: "#ea580c",
                  color: "#ffffff",
                  fontWeight: 650,
                }}
              >
                + Add Row
              </button>

              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  const desc = prompt("Enter package or resource title to insert:");
                  if (desc) {
                    setItems((prev) => [
                      ...prev,
                      {
                        id: `row_${Date.now()}`,
                        item: desc,
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
                  }
                }}
                style={{
                  background: "#f0fdf4",
                  borderColor: "#bbf7d0",
                  color: "#0ba360",
                  fontWeight: 600,
                }}
              >
                🔍 Advance Item Search
              </button>

              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  const count = parseInt(prompt("How many blank rows to add?", "3") || "0", 10);
                  if (count > 0 && count <= 20) {
                    const newRows = Array.from({ length: count }, (_, k) => ({
                      id: `bulk_${Date.now()}_${k}`,
                      item: "",
                      quantity: 1,
                      uom: "NOS",
                      unitPrice: 0,
                      discountCurrency: "SAR",
                      discount: 0,
                      vatType: vatExempt ? "0" : "15",
                      vatAmount: 0,
                      totalAmount: 0,
                      deliveryPeriod: "As per schedule",
                    }));
                    setItems((prev) => [...prev, ...newRows]);
                  }
                }}
                style={{
                  background: "#f0f9ff",
                  borderColor: "#bae6fd",
                  color: "#0284c7",
                  fontWeight: 600,
                }}
              >
                📋 Bulk Entry
              </button>
            </div>
          </div>

          {/* 4. LOWER SPLIT: COMMERCIAL TERMS (LEFT) & FINANCIAL SUMMARY (RIGHT) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1.2fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* LEFT: Commercial Terms & Notes */}
            <div
              style={{
                background: "#ffffff",
                padding: "16px 18px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                    Delivery Method
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 34, fontSize: 12.5 }}
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                  >
                    {deliveryMethods.length > 0 ? (
                      deliveryMethods.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option>Shipping</option>
                        <option>Road Transport / Site Laydown</option>
                        <option>Ex-Works Yard</option>
                        <option>Courier Express</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                    Payment Terms
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 34, fontSize: 12.5 }}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    {paymentTermsList.length > 0 ? (
                      paymentTermsList.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option>Cash On Delivery</option>
                        <option>Net 30 Days</option>
                        <option>Net 60 Days</option>
                        <option>50% Advance, 50% Certification</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                    Terms and Conditions
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 34, fontSize: 12.5 }}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                  >
                    <option>Default Standard Terms</option>
                    <option>FMC Contracting Special Terms</option>
                    <option>Civil Infrastructure Package Terms</option>
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                    Salesman
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 34, fontSize: 12.5 }}
                    value={salesman}
                    onChange={(e) => setSalesman(e.target.value)}
                  >
                    {usersList.length > 0 ? (
                      usersList.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.roles?.[0]?.name || "Sales"})
                        </option>
                      ))
                    ) : (
                      <>
                        <option>Super Admin</option>
                        <option>Estimation Engineer</option>
                        <option>Commercial Manager</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                    Cost Center
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 34, fontSize: 12.5 }}
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                  >
                    {costCenters.length > 0 ? (
                      costCenters.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option>Default</option>
                        <option>Commercial HQ</option>
                        <option>Civil Works Division</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                    Company Bank Account
                  </label>
                  <select
                    className="select"
                    style={{ width: "100%", height: 34, fontSize: 12.5 }}
                    value={companyBankAccount}
                    onChange={(e) => setCompanyBankAccount(e.target.value)}
                  >
                    <option value="">Select Account</option>
                    {bankAccounts.length > 0 ? (
                      bankAccounts.map((b) => (
                        <option key={b.id} value={b.account_number || b.name}>
                          {b.bank_name || b.name} - {b.account_number}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="SNB_SAR_01">SNB Main Operations (SAR)</option>
                        <option value="ALRAJHI_01">Al Rajhi Corporate (SAR)</option>
                        <option value="RIYAD_USD_01">Riyad Bank Commercial (USD)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 3: Textareas with mock toolbar */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="label" style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                      Shipping Address
                    </label>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>B I U • 11</span>
                  </div>
                  <textarea
                    className="input"
                    rows={3}
                    style={{ width: "100%", fontSize: 12, resize: "vertical" }}
                    placeholder="Project delivery site location, contact details & gate entry..."
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="label" style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: "#475569" }}>
                      Notes & Exclusions
                    </label>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>B I U • 11</span>
                  </div>
                  <textarea
                    className="input"
                    rows={3}
                    style={{ width: "100%", fontSize: 12, resize: "vertical" }}
                    placeholder="Quotation caveats, technical assumptions & validity scope..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: Financial Summary Card */}
            <div
              style={{
                background: "#ffffff",
                padding: "18px 20px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Total Amount</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                </span>
              </div>

              {/* Discount Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <select
                    className="select"
                    style={{ height: 30, fontSize: 12, padding: "2px 6px" }}
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                  >
                    <option value="percent">Discount %</option>
                    <option value="amount">Discount SAR</option>
                  </select>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 70, height: 30, textAlign: "right", fontSize: 12, padding: "2px 6px" }}
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    min="0"
                    step="any"
                  />
                </div>
                <span style={{ fontWeight: 600, color: "#ef4444" }}>
                  {discountType === "percent"
                    ? `- ${(totalAmount * (parseFloat(discountVal) || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `- ${parseFloat(discountVal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} SAR
                </span>
              </div>

              {/* Total VAT */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Total VAT</span>
                <span style={{ fontWeight: 700, color: vatExempt ? "#94a3b8" : "#0ba360" }}>
                  {totalVat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                </span>
              </div>

              {/* Round Off */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Round Off</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: 90, height: 30, textAlign: "right", fontSize: 12, padding: "2px 6px" }}
                  value={roundOff}
                  onChange={(e) => setRoundOff(e.target.value)}
                  step="0.01"
                />
              </div>

              <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />

              {/* Net Amount Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Net Quotation Amount
                  </div>
                  <div style={{ fontSize: 10, color: "#047857" }}>Includes VAT & Commercial Scope</div>
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#0ba360" }}>
                  {calculatedNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. PINNED BOTTOM FOOTER BAR */}
        <div
          style={{
            background: "#f1f5f9",
            borderTop: "1px solid #e2e8f0",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {/* Attachments */}
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => alert("Attachments modal: upload drawings, specification sheets, and tender documents.")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#475569" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span>Attachments (0)</span>
          </button>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
              disabled={busy}
              style={{ fontWeight: 600 }}
            >
              Close
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => handleSave(false)}
              disabled={busy}
              style={{
                background: "#0284c7",
                borderColor: "#0284c7",
                color: "#ffffff",
                fontWeight: 650,
                minWidth: 90,
              }}
            >
              {busy ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => handleSave(true)}
              disabled={busy}
              style={{
                background: "#0ba360",
                borderColor: "#0ba360",
                color: "#ffffff",
                fontWeight: 650,
                minWidth: 120,
              }}
            >
              {busy ? "Saving..." : "Save & Print"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
