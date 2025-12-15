import React, { useState, useEffect } from "react";
import { getDatabase, ref, get, update, remove, push } from "firebase/database";
import "./AdminPaint.css";
import { createPortal } from "react-dom";

export default function AdminPaint({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();

  const noteOptions = ["Rust", "Visible Dust", "Oily", "Other"];
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [otherText, setOtherText] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchDeleteKeys, setBatchDeleteKeys] = useState([]);

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

    // New: batch list state
  const [batchList, setBatchList] = useState([]);

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
          // Batch
          if (data.batch) {
            const batchArr = Object.keys(data.batch).map((key) => ({
              label: data.batch[key].batchLabel || "",
              quantity: data.batch[key].quantity || "",
              firebaseKey: key,
            }));
            setBatchList(batchArr);
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

// ----------------- Save -----------------
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
    // Update main form data
    await update(nodeRef, updates);

    // ----------------- Batch Handling -----------------
    // 1️⃣ Remove deleted batches
    for (const key of batchDeleteKeys) {
      await remove(ref(db, `${nodeName}/${fgNumber}/batch/${key}`));
    }
    setBatchDeleteKeys([]); // reset after deletion

    // 2️⃣ Update existing or add new batch rows
    for (const row of batchList) {
      if (!row.label && !row.quantity) continue; // skip empty rows

      if (row.firebaseKey) {
        // Update existing row
        await update(ref(db, `${nodeName}/${fgNumber}/batch/${row.firebaseKey}`), {
          batchLabel: row.label,
          quantity: row.quantity,
        });
      } else {
        // Add new row
        await push(ref(db, `${nodeName}/${fgNumber}/batch`), {
          batchLabel: row.label,
          quantity: row.quantity,
        });
      }
    }

    // Reset pending delete notes
    if (pendingDelete) {
      setForm((prev) => ({ ...prev, note: "" }));
      setSelectedNotes([]);
      setPendingDelete(false);
    }

    // Clear remark if needed
    await update(nodeRef, { remark: null }).catch(() => {});

    // Go back
    onBack && onBack();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Failed to save — check console.");
  }
};

  // ------------------ Delete FG Handler ------------------
  const handleDeleteFG = () => {
    if (!fgNumber) {
      alert("FG Number not found.");
      return;
    }
  
    if (
      !window.confirm(
        `Are you sure you want to delete FG Number ${fgNumber}? This action cannot be undone.`
      )
    ) {
      return;
    }
  
    setIsDeleting(true); // 🌀 Show overlay
  
    const paintRef = ref(db, "Paint");
  
    get(paintRef)
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

  // ----------------- Batch Handlers -----------------
  const updateBatchRow = (index, field, value) => {
    setBatchList((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const deleteBatchRow = (index) => {
    setBatchList((prev) => {
      const row = prev[index];
      if (row.firebaseKey) {
        setBatchDeleteKeys((keys) => [...keys, row.firebaseKey]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addBatchRow = () => {
    setBatchList((prev) => [...prev, { label: "", quantity: "" }]);
  };

  return (
    <div className="admin-paint-root">
      <div className="card">
        <h2 className="title">{nodeName} for {fgNumber}</h2>
        <p className={`remark ${remark ? "red" : ""}`}>
          Remark: {remark || "No remark"}
        </p>
      {/* Delete FG button top-right */}
      <button className="delete-fg-btn" onClick={handleDeleteFG} title="Delete FG">
        Delete Paint 🗑
      </button>
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

                      {/* Batch Section */}
          <div className="batch-section">
            <h3>Batch List</h3>
            {batchList.map((row, idx) => (
              <div key={idx} className="batch-row">
                <input
                  type="text"
                  placeholder="Batch Label"
                  value={row.label}
                  onChange={(e) => updateBatchRow(idx, "label", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Quantity"
                  value={row.quantity}
                  onChange={(e) => updateBatchRow(idx, "quantity", e.target.value)}
                />
                <button type="button" onClick={() => deleteBatchRow(idx)}>🗑</button>
              </div>
            ))}
            <button type="button" onClick={addBatchRow}>➕ Add Batch</button>
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
        {isDeleting && (
  <div className="loading-overlay">
    <div className="spinner"></div>
    <p>Deleting FG Number...</p>
  </div>
)}
    </div>
  );
}
