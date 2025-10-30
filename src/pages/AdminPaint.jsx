import React, { useState, useEffect } from "react";
import { getDatabase, ref, get, update } from "firebase/database";
import "./AdminPaint.css";
import { createPortal } from "react-dom";

export default function AdminPaint({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();

  const noteOptions = ["Rust", "Visible Dust", "Oily", "Other"];
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [otherText, setOtherText] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({
    datePaint: "",
    timePaint: "",
    userName: "",
    note: "",
  });
  const [images, setImages] = useState({
    qrUrl: "",
    checklistUrl: "",
  });
  const [remark, setRemark] = useState("");

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

    // Fetch data
    get(nodeRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setForm({
            datePaint: data.datePaint ? androidToISODate(data.datePaint) : "",
            timePaint: data.timePaint ? androidTimeTo24(data.timePaint) : "",
            userName: data.userName || "",
            note: data.note || "",
          });
          setImages({
            qrUrl: data.qrImageUrl || "",
            checklistUrl: data.imageUrl || "",
          });
          if (data.remark) setRemark(data.remark);
          if (data.note) {
            const arr = data.note.split(",").map((n) => n.trim()).filter(Boolean);
            setSelectedNotes(arr);
          }
        } else {
          // default to today
          const now = new Date();
          const todayISO = now.toISOString().split("T")[0];
          const time24 = now.toTimeString().slice(0, 5);
          setForm((prev) => ({ ...prev, datePaint: todayISO, timePaint: time24 }));
        }
      })
      .catch((err) => console.error("Error fetching record:", err));

    // Fetch staff
    get(staffRef)
      .then((snap) => {
        const staff = [];
        snap.forEach((child) => {
          const name = child.child("name").val();
          if (name) staff.push(name);
        });
        setStaffList(staff);
      })
      .catch((err) => console.error("Error fetching staff:", err));
  }, [fgNumber, nodeName, db]);

  // Update form.note whenever selectedNotes or pendingDelete changes
  useEffect(() => {
    if (pendingDelete) {
      setForm((prev) => ({ ...prev, note: "" }));
    } else {
      setForm((prev) => ({ ...prev, note: selectedNotes.join("\n") }));
    }
  }, [selectedNotes, pendingDelete]);

useEffect(() => {
  if (zoomImage) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  } else {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
}, [zoomImage]);

  const toggleNote = (note) => {
    setPendingDelete(false);
    if (note === "Other") {
      if (selectedNotes.some((n) => n.startsWith("Other:") || n === "Other")) {
        setSelectedNotes((prev) => prev.filter((n) => !n.startsWith("Other:") && n !== "Other"));
        setOtherText("");
      } else setSelectedNotes((prev) => [...prev, "Other"]);
      return;
    }
    setSelectedNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  };

  const handleOtherSubmit = (e) => {
    e.preventDefault();
    if (!otherText.trim()) return;
    setSelectedNotes((prev) => [
      ...prev.filter((n) => !n.startsWith("Other")),
      `Other: ${otherText.trim()}`,
    ]);
    setOtherText("");
  };

  const handleDeleteNote = () => {
    if (window.confirm("Are you sure you want to delete all notes?")) {
      setPendingDelete(true);
      setSelectedNotes([]);
    }
  };
    const handleImageClick = (src) => {
    if (src) setZoomImage(src);
  };
    const closeZoom = () => {
    setZoomImage(null);
  };

  const handleSave = async () => {
    if (!fgNumber || !nodeName) return;

    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
    const updates = {};

    if (form.datePaint) updates.datePaint = isoToAndroidDate(form.datePaint);
    if (form.timePaint) updates.timePaint = time24ToAndroid(form.timePaint);
    if (form.userName) updates.userName = form.userName;
    if (pendingDelete) updates.note = null;
    else if (selectedNotes.length) updates.note = selectedNotes.join(", ");

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
    <div className="admin-paint-root">
      <div className="card">
        <h2 className="title">{nodeName} for {fgNumber}</h2>
        <p className={`remark ${remark ? "red" : ""}`}>
          Remark: {remark || "No remark"}
        </p>
        <div className="images-row">
          <div className="image-box" onClick={() => handleImageClick(images.qrUrl)}>
            <img src={images.qrUrl} alt="QR" />
            <div className="image-label">QR Code</div>
          </div>
          <div className="image-box" onClick={() => handleImageClick(images.checklistUrl)}>
            <img src={images.checklistUrl} alt="Checklist" />
            <div className="image-label">Checklist</div>
          </div>
        </div>

        {zoomImage &&
          createPortal(
            <div className="image-zoom-overlay" onClick={closeZoom}>
              <div className="image-zoom-content">
                <img src={zoomImage} alt="Zoomed" className="zoomed-image" />
              </div>
            </div>,
            document.body
          )}

        <div className="form">
          <label className="form-row">
            <span className="label">Current Note:</span>
            <textarea readOnly value={form.note} className="current-note" />
          </label>

          <label className="form-row">
            <span className="label">New Note:</span>
            <div className="notes-controls">
              <div className="note-options">
                {noteOptions.map((note, i) => (
                  <button
                    key={i}
                    className={`note-btn ${
                      selectedNotes.some((n) =>
                        note === "Other"
                          ? n.startsWith("Other:") || n === "Other"
                          : n === note
                      )
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

              {selectedNotes.includes("Other") && (
                <form onSubmit={handleOtherSubmit} className="other-input-row">
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="Enter other note..."
                  />
                  <button type="submit" className="add-note-btn">Add</button>
                </form>
              )}
            </div>
          </label>

            <div className="date-time-row">
            <label className="label">Paint Date:</label>
            <input
                type="date"
                value={form.datePaint}
                onChange={(e) => setForm({ ...form, datePaint: e.target.value })}
            />
            </div>

            <div className="date-time-row">
            <label className="label">Paint Time:</label>
            <input
                type="time"
                value={form.timePaint}
                onChange={(e) => setForm({ ...form, timePaint: e.target.value })}
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
