import React, { useState, useEffect } from "react";
import { getDatabase, ref, get, update } from "firebase/database";
import "./AdminDeliver.css";
import { createPortal } from "react-dom";

export default function AdminDeliver({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();
  const [staffList, setStaffList] = useState([]);
  const [images, setImages] = useState({ qrUrl: "" });
  const [pendingDelete, setPendingDelete] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [form, setForm] = useState({
    dateDeliver: "",
    timeDeliver: "",
    userName: "",
  });
  const [remark, setRemark] = useState("");
  const [zoomImage, setZoomImage] = useState(null);

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
    const modifier = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, "0")}:${mm} ${modifier}`;
  };

  useEffect(() => {
    if (!fgNumber || !nodeName) return;

    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
    const staffRef = ref(db, "Staff");

    get(nodeRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setForm({
            dateDeliver: data.dateDeliver ? androidToISODate(data.dateDeliver) : "",
            timeDeliver: data.timeDeliver ? androidTimeTo24(data.timeDeliver) : "",
            userName: data.userName || "",
          });
          setImages({ qrUrl: data.qrImageUrl || "" });
          if (data.remark) setRemark(data.remark);
        } else {
          const now = new Date();
          setForm({
            dateDeliver: now.toISOString().split("T")[0],
            timeDeliver: now.toTimeString().slice(0, 5),
            userName: "",
          });
        }
      })
      .catch(console.error);

    get(staffRef)
      .then((snap) => {
        const staff = [];
        snap.forEach((child) => {
          const name = child.child("name").val();
          if (name) staff.push(name);
        });
        setStaffList(staff);
      })
      .catch(console.error);
  }, [fgNumber, nodeName, db]);

  const handleSave = async () => {
    if (!fgNumber || !nodeName) return;

    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
    const updates = {};
    if (form.dateDeliver) updates.dateDeliver = isoToAndroidDate(form.dateDeliver);
    if (form.timeDeliver) updates.timeDeliver = time24ToAndroid(form.timeDeliver);
    if (form.userName) updates.userName = form.userName;

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

  return (
    <div className="admin-deliver-root">
      <div className="card">
        <h2 className="title">{nodeName} for {fgNumber}</h2>
<p className={`remark ${remark ? "has-remark" : ""}`}>
  Remark: {remark || "No remark"}
</p>
        <div className="images-row">
          <div className="image-box" onClick={() => setZoomImage(images.qrUrl)}>
            <img src={images.qrUrl} alt="QR" />
            <div className="image-label">QR Code</div>
          </div>
        </div>
{zoomImage &&
  createPortal(
    <div className="image-zoom-overlay" onClick={() => setZoomImage(null)}>
      <div className="image-zoom-wrapper">
        <img src={zoomImage} alt="Zoomed" />
      </div>
    </div>,
    document.body
  )}
        <div className="form">
          <div className="date-time-row">
            <label className="label">Deliver Date:</label>
            <input
              type="date"
              value={form.dateDeliver}
              onChange={(e) => setForm({ ...form, dateDeliver: e.target.value })}
            />
          </div>

          <div className="date-time-row">
            <label className="label">Deliver Time:</label>
            <input
              type="time"
              value={form.timeDeliver}
              onChange={(e) => setForm({ ...form, timeDeliver: e.target.value })}
            />
          </div>

          <label className="form-row">
            <span className="label">User:</span>
            <select
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
            >
              <option value="">Select User</option>
              {staffList.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="actions">
            <button className="btn-back" onClick={() => onBack && onBack()}>⬅ Back</button>
            <button className="btn-save" onClick={handleSave}>💾 Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
