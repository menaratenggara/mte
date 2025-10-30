import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getDatabase, ref, get, update } from "firebase/database";
import "./AdminPack.css";

export default function AdminPack({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();

  // ---------------- STATES ----------------
  const noteOptions = [
    "Corrugated Rack",
    "Part Tag & Sticker",
    "DOT/Date Stamp",
    "Urgent Delivery Request",
    "Have NGs",
  ];
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(false);

  const [staffList, setStaffList] = useState([]);
  const [zoomImage, setZoomImage] = useState(null);
  const [form, setForm] = useState({
    quantity: "",
    datePack: "",
    timePack: "",
    userName: "",
    note: "",
    releaseNote: "",
    ngMaterial: "",
    ngManufacturing: "",
    dented: "",
    rusted: "",
  });
  const [images, setImages] = useState({
    qrUrl: "",
    checklistUrl: "",
  });
  const [remark, setRemark] = useState("");
  const [isHaveNGs, setIsHaveNGs] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---------------- EFFECT: BODY SCROLL LOCK WHEN ZOOM OPEN ----------------
  useEffect(() => {
    if (zoomImage) {
      const scrollBarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }, [zoomImage]);

  // ---------------- EFFECT: FETCH DATA ----------------
  const androidToISODate = (val) => {
    if (!val) return "";
    const parts = val.split("/");
    if (parts.length !== 3) return "";
    const [d, m, y] = parts.map((s) => s.padStart(2, "0"));
    return `${y}-${m}-${d}`;
  };

  const isoToAndroidDate = (val) => {
    if (!val) return "";
    const [y, m, d] = val.split("-");
    return `${d}/${m}/${y}`;
  };

  const androidTimeTo24 = (val) => {
    if (!val) return "";
    const [time, modifier] = val.split(" ");
    if (!time) return val;
    let [h, mm] = time.split(":");
    let hour = parseInt(h, 10);
    if (modifier?.toLowerCase() === "pm" && hour < 12) hour += 12;
    if (modifier?.toLowerCase() === "am" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${mm}`;
  };

  const time24ToAndroid = (val) => {
    if (!val) return "";
    const [h, mm] = val.split(":");
    let hour = parseInt(h, 10);
    const modifier = hour >= 12 ? "pm" : "am";
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, "0")}:${mm} ${modifier}`;
  };

  useEffect(() => {
    if (!fgNumber || !nodeName) return;

    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
    const staffRef = ref(db, "Staff");

    get(nodeRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setForm({
          quantity: data.quantity || "",
          datePack: data.datePack ? androidToISODate(data.datePack) : "",
          timePack: data.timePack ? androidTimeTo24(data.timePack) : "",
          userName: data.userName || "",
          note: data.note || "",
          releaseNote: data.releaseNote || "",
          ngMaterial: data.ngMaterial || "",
          ngManufacturing: data.ngManufacturing || "",
          dented: data.dented || "",
          rusted: data.rusted || "",
        });
        setImages({
          qrUrl: data.qrImageUrl || "",
          checklistUrl: data.imageUrl || "",
        });
        setRemark(data.remark || "");
        const parsedNotes = (data.note || "")
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);
        setSelectedNotes(parsedNotes);
        setIsHaveNGs(
          !!(
            data.releaseNote ||
            data.ngMaterial ||
            data.ngManufacturing ||
            data.dented ||
            data.rusted
          )
        );
      }
      setLoading(false);
    });

    get(staffRef).then((snap) => {
      const staff = [];
      snap.forEach((child) => {
        const name = child.val().name;
        if (name) staff.push(name);
      });
      setStaffList(staff);
    });
  }, [fgNumber, nodeName, db]);

  // ---------------- EFFECT: UPDATE FORM NOTE ----------------
  useEffect(() => {
    if (pendingDelete) {
      setForm((prev) => ({ ...prev, note: "" }));
    } else {
      setForm((prev) => ({ ...prev, note: selectedNotes.join("\n") }));
    }
  }, [selectedNotes, pendingDelete]);

  // ---------------- HANDLERS ----------------
  const toggleNote = (note) => {
    setPendingDelete(false);
    if (note === "Have NGs") setIsHaveNGs(!isHaveNGs);
    setSelectedNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  };

  const handleDeleteNote = () => {
    if (window.confirm("Are you sure you want to delete all notes?")) {
      setPendingDelete(true);
      setSelectedNotes([]);
      setIsHaveNGs(false);
      setForm((prev) => ({
        ...prev,
        releaseNote: "",
        ngMaterial: "",
        ngManufacturing: "",
        dented: "",
        rusted: "",
        note: "",
      }));
    }
  };

  const handleSave = async () => {
    if (!fgNumber || !nodeName) return;
    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
    const updates = {
      quantity: form.quantity,
      datePack: form.datePack ? isoToAndroidDate(form.datePack) : "",
      timePack: form.timePack ? time24ToAndroid(form.timePack) : "",
      userName: form.userName,
    };

    if (pendingDelete) {
      updates.note = null;
      updates.releaseNote = null;
      updates.ngMaterial = null;
      updates.ngManufacturing = null;
      updates.dented = null;
      updates.rusted = null;
    } else {
      updates.note = selectedNotes.filter((n) => n !== "Have NGs").join(", ");
      if (isHaveNGs) {
        updates.releaseNote = form.releaseNote;
        updates.ngMaterial = form.ngMaterial;
        updates.ngManufacturing = form.ngManufacturing;
        updates.dented = form.dented;
        updates.rusted = form.rusted;
      } else {
        updates.releaseNote =
          updates.ngMaterial =
          updates.ngManufacturing =
          updates.dented =
          updates.rusted =
            null;
      }
    }

    try {
      await update(nodeRef, updates);
      if (pendingDelete) {
        setForm((prev) => ({ ...prev, note: "" }));
        setSelectedNotes([]);
        setPendingDelete(false);
      }
      await update(nodeRef, { remark: null }).catch(() => {});
      onBack && onBack();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save — check console.");
    }
  };

  if (loading) return <p>Loading...</p>;

  // ---------------- RENDER ----------------
  return (
    <div className="admin-pack-root">
      <div className="card">
        <h2 className="title">
          {nodeName} – {fgNumber}
        </h2>
        <p className={`remark ${remark ? "red" : ""}`}>
          Remark: {remark || "No remark"}
        </p>

        {/* Images */}
        <div className="images-row">
          <div className="image-box" onClick={() => setZoomImage(images.qrUrl)}>
            <img src={images.qrUrl} alt="QR" />
            <div className="image-label">QR Code</div>
          </div>
          <div
            className="image-box"
            onClick={() => setZoomImage(images.checklistUrl)}
          >
            <img src={images.checklistUrl} alt="Checklist" />
            <div className="image-label">Checklist</div>
          </div>
        </div>

        {/* ✅ Fixed Zoom Overlay (Portalled) */}
        {zoomImage &&
          createPortal(
            <div className="image-zoom-overlay" onClick={() => setZoomImage(null)}>
              <div className="image-zoom-content">
                <img src={zoomImage} alt="Zoomed" />
              </div>
            </div>,
            document.body
          )}

        {/* Form */}
        <div className="form">
          <label className="form-row">
            <span className="label">Current Note:</span>
            <textarea readOnly value={form.note} className="current-note" />
          </label>

          <label className="form-row">
            <span className="label">New Note:</span>
            <div className="notes-controls">
              <div className="note-options">
                {noteOptions.map((note, idx) => (
                  <button
                    key={idx}
                    className={`note-btn ${
                      note === "Have NGs"
                        ? isHaveNGs
                          ? "active"
                          : ""
                        : selectedNotes.includes(note)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => toggleNote(note)}
                  >
                    {note}
                  </button>
                ))}
                <button className="delete-note-btn" onClick={handleDeleteNote}>
                  🗑 Delete Note
                </button>
              </div>
            </div>
          </label>

          {/* Quantity */}
          <div className="date-time-row">
            <label className="label">Quantity:</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          {/* ---------------- NG Section ---------------- */}
          {isHaveNGs && (
            <div className="card ng-card">
              <h3>NG Details</h3>

              <div className="ng-form-row">
                <span className="label">Release Note:</span>
                <input
                  type="text"
                  value={form.releaseNote}
                  onChange={(e) => setForm({ ...form, releaseNote: e.target.value })}
                />
              </div>

              <div className="ng-form-row">
                <span className="label">NG Material:</span>
                <input
                  type="text"
                  value={form.ngMaterial}
                  onChange={(e) => setForm({ ...form, ngMaterial: e.target.value })}
                />
              </div>

              <div className="ng-form-row">
                <span className="label">NG Manufacturing:</span>
                <input
                  type="text"
                  value={form.ngManufacturing}
                  onChange={(e) => setForm({ ...form, ngManufacturing: e.target.value })}
                />
              </div>

              <div className="ng-form-row">
                <span className="label">Dented:</span>
                <input
                  type="text"
                  value={form.dented}
                  onChange={(e) => setForm({ ...form, dented: e.target.value })}
                />
              </div>

              <div className="ng-form-row">
                <span className="label">Rusted:</span>
                <input
                  type="text"
                  value={form.rusted}
                  onChange={(e) => setForm({ ...form, rusted: e.target.value })}
                />
              </div>
            </div>
          )}
          {/* ---------------- End NG Section ---------------- */}

          {/* Pack Date */}
          <div className="date-time-row">
            <label className="label">Pack Date:</label>
            <input
              type="date"
              value={form.datePack}
              onChange={(e) => setForm({ ...form, datePack: e.target.value })}
            />
          </div>

          {/* Pack Time */}
          <div className="date-time-row">
            <label className="label">Pack Time:</label>
            <input
              type="time"
              value={form.timePack}
              onChange={(e) => setForm({ ...form, timePack: e.target.value })}
            />
          </div>

          {/* User */}
          <label className="form-row">
            <span className="label">User:</span>
            <select
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
            >
              <option value="">Select User</option>
              {staffList.map((s, idx) => (
                <option key={idx} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {/* Actions */}
          <div className="actions">
            <button className="btn-back" onClick={() => onBack && onBack()}>
              ⬅ Back
            </button>
            <button className="btn-save" onClick={handleSave}>
              💾 Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
