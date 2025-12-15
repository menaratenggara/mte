import React, { useEffect, useState } from "react";
import { getDatabase, ref, get, update, remove } from "firebase/database";
import "./AdminTreat.css";
import { createPortal } from "react-dom";

export default function AdminTreat({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();

  const [loading, setLoading] = useState(true);
  const [titleRemark, setTitleRemark] = useState("Remark: No remark");
  const [titleRemarkColorRed, setTitleRemarkColorRed] = useState(false);

  const [form, setForm] = useState({
    quantity: "",
    dateTreat: "",
    timeTreat: "",
    userName: "",
    note: "",
  });

  const [images, setImages] = useState({
    qrImageUrl: "",
    checklistImageUrl: "",
  });

  const noteOptions = ["Rust", "Visible Dust", "Oily", "Other"];
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [otherText, setOtherText] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!y) return "";
    return `${d}/${m}/${y}`;
  };

  const androidTimeTo24 = (val) => {
    if (!val) return "";
    const parts = val.split(" ");
    if (parts.length === 2) {
      const [time, modifier] = parts;
      let [h, mm] = time.split(":");
      let hour = parseInt(h, 10);
      const mod = modifier.toLowerCase();
      if (mod === "pm" && hour < 12) hour += 12;
      if (mod === "am" && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, "0")}:${mm}`;
    }
    return val;
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
    if (!fgNumber || !nodeName) {
      setLoading(false);
      return;
    }

    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
    const fetch = async () => {
      try {
        const snap = await get(nodeRef);
        const now = new Date();
        const todayISO = now.toISOString().split("T")[0];
        const time24 = now.toTimeString().slice(0, 5);

        if (snap.exists()) {
          const data = snap.val();
          setForm({
            quantity: data.quantity || "",
            dateTreat: data.dateTreat ? androidToISODate(data.dateTreat) : "",
            timeTreat: data.timeTreat ? androidTimeTo24(data.timeTreat) : "",
            userName: data.userName || "",
            note: data.note || "",
          });
          setImages({
            qrImageUrl: data.qrImageUrl || "",
            checklistImageUrl: data.imageUrl || "",
          });
          if (data.remark) {
            setTitleRemark(data.remark);
            setTitleRemarkColorRed(true);
          } else {
            setTitleRemark("Remark: No remark");
            setTitleRemarkColorRed(false);
          }
          if (data.note) {
            const arr = data.note.split(",").map((n) => n.trim()).filter(Boolean);
            setSelectedNotes(arr);
          }
        } else {
          setForm((prev) => ({
            ...prev,
            dateTreat: todayISO,
            timeTreat: time24,
          }));
        }
      } catch (err) {
        console.error("Error fetching record:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();

    const staffRef = ref(db, "Staff");
    get(staffRef)
      .then((snap) => {
        const s = [];
        snap.forEach((child) => {
          const name = child.child("name").val();
          if (name) s.push(name);
        });
        setStaffList(s);
      })
      .catch((err) => console.error("Error loading staff:", err));
  }, [fgNumber, nodeName, db]);

  useEffect(() => {
    if (pendingDelete) {
      setForm((prev) => ({ ...prev, note: "" }));
    } else {
      const display = selectedNotes.length ? selectedNotes.join("\n") : "";
      setForm((prev) => ({ ...prev, note: display }));
    }
  }, [selectedNotes, pendingDelete]);

    // ------------------ Delete FG Handler ------------------
    const handleDeleteFG = () => {
      if (!fgNumber) {
        alert("FG Number not found.");
        return;
      }
  
      if (!window.confirm(`Are you sure you want to delete FG Number ${fgNumber}? This action cannot be undone.`)) {
        return;
      }

      setIsDeleting(true); // 🌀 Show overlay
  
      const treatRef = ref(db, "Treat");
  
        get(treatRef)
          .then((snapshot) => {
            let found = false;
            const updates = [];
      
            snapshot.forEach((child) => {
              const data = child.val();
              if (data.fgNumber === fgNumber) {
                updates.push(remove(child.ref)); // ✅ fixed version
                found = true;
              }
            });
      
            if (found) {
              Promise.all(updates)
                .then(() => {
                  alert(`FG Number ${fgNumber} deleted successfully.`);
                  onBack && onBack();
                })
                .catch((err) => {
                  console.error("Remove failed:", err);
                  alert(`Failed to remove FG: ${err.message}`);
                })
                .finally(() => setIsDeleting(false)); // 🧹 Hide overlay
            } else {
              alert("No matching FG found.");
              setIsDeleting(false);
            }
          })
          .catch((err) => {
            console.error("Failed to delete:", err);
            alert(`Failed to delete: ${err.message}`);
            setIsDeleting(false);
          });
      };

  // ✅ Fixed toggleNote: reset pendingDelete when selecting new notes
  const toggleNote = (note) => {
    setPendingDelete(false); // reset delete mode when user adds/selects a new note

    if (note === "Other") {
      if (selectedNotes.some((n) => n.startsWith("Other:") || n === "Other")) {
        setSelectedNotes((prev) => prev.filter((n) => !n.startsWith("Other:") && n !== "Other"));
        setOtherText("");
      } else {
        setSelectedNotes((prev) => [...prev, "Other"]);
      }
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
      setForm((prev) => ({ ...prev, note: "" }));
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

    if (form.quantity && form.quantity.toString().trim() !== "")
      updates["quantity"] = form.quantity.toString().trim();
    if (form.dateTreat) updates["dateTreat"] = isoToAndroidDate(form.dateTreat);
    if (form.timeTreat) updates["timeTreat"] = time24ToAndroid(form.timeTreat);
    if (form.userName) updates["userName"] = form.userName;
    if (pendingDelete) updates["note"] = null;
    else if (selectedNotes.length)
      updates["note"] = selectedNotes.filter(Boolean).join(", ");

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

  if (loading) {
    return (
      <div className="admin-treat-root">
        <div className="card">
          <h2>{nodeName} for {fgNumber}</h2>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-treat-root">
      <div className="card">
        <h2 className="title">{nodeName} for {fgNumber}</h2>
        <p className={`remark ${titleRemarkColorRed ? "red" : ""}`}>
          Remark: {titleRemark || "No remark"}
        </p>
              {/* Delete FG button top-right */}
      <button className="delete-fg-btn" onClick={handleDeleteFG} title="Delete FG">
        Delete Treat 🗑
      </button>

        {/* --- Image Section --- */}
        <div className="image-section">
          <div className="img-box" onClick={() => handleImageClick(images.qrImageUrl)}>
            <img src={images.qrImageUrl} alt="QR" />
            <span>QR Code</span>
          </div>
          <div className="img-box" onClick={() => handleImageClick(images.checklistImageUrl)}>
            <img src={images.checklistImageUrl} alt="Checklist" />
            <span>Checklist Image</span>
          </div>
        </div>

{zoomImage &&
  createPortal(
    <div className="zoom-overlay" onClick={closeZoom}>
      <div className="image-zoom-wrapper">
        <img src={zoomImage} alt="Zoomed" className="zoomed-image" />
      </div>
    </div>,
    document.body // ✅ render outside parent layout for full-screen independence
  )}

        <div className="form">
          <label className="form-row">
            <span className="label">Quantity:</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </label>

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
                    className={`note-btn ${selectedNotes.some((n) =>
                      note === "Other"
                        ? n.startsWith("Other:") || n === "Other"
                        : n === note
                    ) ? "active" : ""}`}
                    onClick={() => toggleNote(note)}
                  >
                    {note}
                  </button>
                ))}
                <button 
                  className="delete-note-btn" 
                  onClick={handleDeleteNote}
                >
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

          <label className="form-row date-time-row">
            <span className="label">Treat Date:</span>
            <input
              type="date"
              value={form.dateTreat}
              onChange={(e) => setForm({ ...form, dateTreat: e.target.value })}
            />
          </label>

          <label className="form-row date-time-row">
            <span className="label">Treat Time:</span>
            <input
              type="time"
              value={form.timeTreat}
              onChange={(e) => setForm({ ...form, timeTreat: e.target.value })}
            />
          </label>

          <label className="form-row">
            <span className="label">User:</span>
            <select
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
            >
              <option value="">Select User</option>
              {staffList.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
            </select>
          </label>

          <div className="actions">
            <button className="btn-back" onClick={() => onBack && onBack()}>⬅ Back</button>
            <button className="btn-save" onClick={handleSave}>💾 Save</button>
          </div>
        </div>
      </div>
        {isDeleting && (
  <div className="loading-overlay">
    <div className="spinner"></div>
    <p>Deleting FG Number...</p>
  </div>
)}
    </div>
  );
}
