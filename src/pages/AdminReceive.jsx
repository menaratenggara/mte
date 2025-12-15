import React, { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { getDatabase, ref, get, update, onValue, remove } from "firebase/database";
import "./AdminReceive.css";

function AdminReceive({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();
  const [title, setTitle] = useState("");
  const [remark, setRemark] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [otherClicked, setOtherClicked] = useState(false);
  const [fgList, setFgList] = useState([]);
  const [includeFG, setIncludeFG] = useState("");
  const [selectedFG, setSelectedFG] = useState("");
  const [showManualFG, setShowManualFG] = useState(false);
  const [manualFG, setManualFG] = useState("");
  const [fgOptions, setFgOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);
  const [form, setForm] = useState({
    doNumber: "",
    labelType: "",
    quantity: "",
    manufacturingDate: "",
    receivingDate: "",
    receivingTime: "",
    note: "",
    userName: "",
  });
  const [notes, setNotes] = useState(["Rust", "Grease", "Dirty", "Other"]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [codeList, setCodeList] = useState([]);
  const [images, setImages] = useState({ checklistImageUrl: "", qrImageUrl: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  // ------------------ Date / Time helpers ------------------
  const normalizeDate = (val) => {
    if (!val) return "";
    const [day, month, year] = val.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const displayDate = (val) => {
    if (!val) return "";
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  const normalizeTime = (val) => {
    if (!val) return "";
    const [time, modifier] = val.split(" ");
    let [hours, minutes] = time.split(":");
    hours = parseInt(hours);
    if (modifier?.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  };

  const displayTime = (val) => {
    if (!val) return "";
    let [hours, minutes] = val.split(":");
    hours = parseInt(hours);
    const modifier = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${modifier}`;
  };

  // ------------------ Fetch FG Options ------------------
  useEffect(() => {
    const dbRef = ref(rtdb, "Receive");
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || {};
      const entries = Object.values(data).filter((item) => item.receivingDate);

      if (entries.length === 0) {
        setFgOptions([]);
        setLoading(false);
        return;
      }

      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split("/");
        return new Date(`${year}-${month}-${day}`);
      };

      const latestDate = entries
        .map((item) => parseDate(item.receivingDate))
        .sort((a, b) => b - a)[0];

      const recentFGs = entries
        .filter(
          (item) =>
            parseDate(item.receivingDate).getTime() === latestDate.getTime() &&
            item.fgNumber !== fgNumber
        )
        .map((item) => item.fgNumber)
        .filter(Boolean);

      setFgOptions(recentFGs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fgNumber]);

  // ------------------ Fetch Data for Node ------------------
  useEffect(() => {
    if (!fgNumber || !nodeName) return;
    setTitle(`${nodeName} for ${fgNumber}`);

    const nodeRef = ref(db, `${nodeName}/${fgNumber}`);

    const fetchData = async () => {
      try {
        const snap = await get(nodeRef);
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        const time = now.toTimeString().slice(0, 5);

        if (snap.exists()) {
          const data = snap.val();

          setForm({
            doNumber: data.doNumber || "",
            labelType: data.labelType || "",
            quantity: data.quantity || "",
            manufacturingDate: normalizeDate(data.manufacturingDate),
            receivingDate: normalizeDate(data.receivingDate),
            receivingTime: normalizeTime(data.receivingTime),
            note: data.note || "",
            userName: data.userName || "",
          });

          setRemark(data.remark || "No remark");
          setImages({
            checklistImageUrl: data.checklistImageUrl || "",
            qrImageUrl: data.qrImageUrl || "",
          });

          // ------------------ Notes ------------------
          if (data.note) {
            const arr = data.note.split(",").map((n) => n.trim());
            const predefined = arr.filter((n) => n !== "" && !n.startsWith("Other:"));
            const other = arr.find((n) => n.startsWith("Other:"))?.replace("Other:", "").trim() || "";

            setSelectedNotes(predefined);
            setOtherText(other);
            setOtherClicked(!!other);
          }

          // ------------------ Include FG ------------------
          if (data.includeWithFG) {
            // If value exists in dropdown options → select it
            if (!fgOptions.includes(data.includeWithFG)) {
              // Add it to dropdown options so it can be selected
              setFgOptions((prev) => [...prev, data.includeWithFG]);
            }
            setSelectedFG(data.includeWithFG);
            setShowManualFG(false); // keep manual input hidden
            setManualFG("");
          } else {
            // No FG saved yet
            setSelectedFG("");
            setShowManualFG(false);
            setManualFG("");
          }

        } else {
          setForm((prev) => ({
            ...prev,
            manufacturingDate: today,
            receivingDate: today,
            receivingTime: time,
          }));
          setSelectedFG("");
          setShowManualFG(false);
          setManualFG("");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    get(ref(db, "Products")).then((snap) => {
      const tempCodes = [];
      snap.forEach((child) => {
        const val = child.val();
        if (val.code) tempCodes.push(val.code);
      });
      setCodeList(tempCodes);
    });

    get(ref(db, "Staff")).then((snap) => {
      const tempStaff = [];
      snap.forEach((child) => {
        const name = child.child("name").val();
        if (name) tempStaff.push(name);
      });
      setStaffList(tempStaff);
    });
  }, [fgNumber, nodeName]);

  // ------------------ Save Handler ------------------
const handleSave = async () => {
    const fgToSave =
    showManualFG && manualFG.trim()
      ? manualFG.trim()
      : selectedFG && selectedFG !== "Other"
      ? selectedFG
      : "";

  const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
  const receiveRef = fgToSave ? ref(db, `Receive/${fgToSave}`) : null;

  const updates = {
    ...form,
    receivingDate: displayDate(form.receivingDate),
    manufacturingDate: displayDate(form.manufacturingDate),
    receivingTime: displayTime(form.receivingTime),
    includeWithFG: fgToSave || null,
    note: selectedNotes.join(", ") || form.note || null,
    remark: null,
  };

  try {
    await update(nodeRef, updates);

    if (receiveRef) {
      await update(receiveRef, {
        fgNumber: fgToSave,
        doNumber: form.doNumber,
        labelType: form.labelType,
        quantity: form.quantity,
        manufacturingDate: displayDate(form.manufacturingDate),
        receivingDate: displayDate(form.receivingDate),
        receivingTime: displayTime(form.receivingTime),
        userName: form.userName,
        note: selectedNotes.join(", ") || form.note || "",
      });
    }

    // Reset UI states
    setForm((prev) => ({ ...prev, note: "" }));
    setSelectedNotes([]);
    setOtherText("");
    setOtherClicked(false);
    setPendingDelete(false);
    setRemark("No remark");
    setSelectedFG("");
    setShowManualFG(false);
    setManualFG("");

    // No alerts. Silent auto-save.
    onBack && onBack();

  } catch (err) {
    console.error("Save failed:", err);
    alert("Failed to save — check console.");
  }
};
  // ------------------ Notes Handlers ------------------
  const handleNoteSelect = (note) => {
    setPendingDelete(false);
    let updatedNotes = [...selectedNotes];

    if (note === "Other") {
      if (!otherClicked) {
        updatedNotes.push(`Other: ${otherText || ""}`);
        setOtherClicked(true);
      } else {
        updatedNotes = updatedNotes.filter((n) => !n.startsWith("Other:"));
        setOtherClicked(false);
      }
    } else {
      updatedNotes = updatedNotes.includes(note)
        ? updatedNotes.filter((n) => n !== note)
        : [...updatedNotes, note];
    }

    setSelectedNotes(updatedNotes);
    setForm(prev => ({ ...prev, note: updatedNotes.join(", ") }));
  };

  const handleOtherChange = (value) => setOtherText(value);
  const handleOtherSave = () => {
    if (!otherText.trim()) return;
    const updatedNotes = [
      ...selectedNotes.filter((n) => !n.startsWith("Other:")),
      `Other: ${otherText.trim()}`,
    ];
    setSelectedNotes(updatedNotes);
    setForm((prev) => ({ ...prev, note: updatedNotes.join(", ") }));
  };

  const handleNoteTextChange = (text) => {
    setForm((prev) => ({ ...prev, note: text }));
    const arr = text.split(",").map((n) => n.trim()).filter(Boolean);
    setSelectedNotes(arr);
    const foundOther = arr.find((n) => n.startsWith("Other:"));
    setOtherText(foundOther ? foundOther.replace("Other:", "").trim() : "");
  };

  const handleDeleteNote = () => {
    if (window.confirm("Are you sure you want to delete all notes?")) {
      setPendingDelete(true);
      setSelectedNotes([]);
      setOtherText("");
      setOtherClicked(false);
      setForm((prev) => ({ ...prev, note: "" }));
    }
  };

    const handleDeleteFGSelection = () => {
    if (!selectedFG && !manualFG) return; // nothing to delete
    if (!window.confirm("Are you sure you want to remove the selected FG?")) return;

    setSelectedFG("");
    setManualFG("");
    setShowManualFG(false);
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

  const receiveRef = ref(db, "Receive");

  get(receiveRef)
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

  const handleImageClick = (src) => src && setZoomImage(src);
  const closeZoom = () => setZoomImage(null);

  if (loading) {
    return (
      <div className="admin-receive-root">
        <div className="admin-receive-container">
          <div className="header">
            <h2>{nodeName} for {fgNumber}</h2>
            <p>Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-receive-root">
  <div className="admin-receive-container">
    {/* Header */}
    <div className="header" style={{ position: "relative" }}>
      <h2>{title}</h2>
      <p className={`remark ${remark !== "No remark" ? "red" : ""}`}>
        Remark: {remark}
      </p>
      {/* Delete FG button top-right */}
      <button className="delete-fg-btn" onClick={handleDeleteFG} title="Delete FG">
        Delete Receive 🗑
      </button>
    </div>

    {/* Images */}
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

    {zoomImage && (
      <div className="image-zoom-overlay" onClick={closeZoom}>
        <div className="image-zoom-content">
          <img src={zoomImage} alt="Zoomed" />
        </div>
      </div>
    )}

    {/* Form */}
    <div className="form-container">
      {/* DO Number */}
      <div className="form-row">
        <label>DO Number:</label>
        <input
          type="text"
          value={form.doNumber}
          onChange={(e) => setForm({ ...form, doNumber: e.target.value })}
        />
      </div>

      {/* Label Type */}
      <div className="form-row">
        <label>Label Type:</label>
        <select
          value={form.labelType}
          onChange={(e) => setForm({ ...form, labelType: e.target.value })}
        >
          <option value="">Select Label</option>
          {codeList.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Quantity */}
      <div className="form-row">
        <label>Quantity:</label>
        <input
          type="number"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
      </div>

      {/* Manufacturing Date */}
      <div className="form-row">
        <label>Manufacturing Date:</label>
        <input
          type="date"
          value={form.manufacturingDate}
          onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })}
        />
      </div>

      {/* Receiving Date */}
      <div className="form-row">
        <label>Receiving Date:</label>
        <input
          type="date"
          value={form.receivingDate}
          onChange={(e) => setForm({ ...form, receivingDate: e.target.value })}
        />
      </div>

      {/* Receiving Time */}
      <div className="form-row">
        <label>Receiving Time:</label>
        <input
          type="time"
          value={form.receivingTime}
          onChange={(e) => setForm({ ...form, receivingTime: e.target.value })}
        />
      </div>

      {/* Include FG Section */}
      <div className="form-row">
        <label>Include with other FG:</label>
        <div className="form-inline">
          <select
            className="form-input"
            value={selectedFG}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedFG(val);
              setShowManualFG(val === "Other");
            }}
          >
            <option value="">Select FG</option>
            {fgOptions.map((fg) => (
              <option key={fg} value={fg}>{fg}</option>
            ))}
            <option value="Other">Other (Manual Input)</option>
          </select>

          {showManualFG && (
            <input
              type="text"
              className="form-input manual-fg-input"
              placeholder="Enter FG Number"
              value={manualFG}
              onChange={(e) => setManualFG(e.target.value)}
            />
          )}

          {/* Delete FG Button — only show if there is a value */}
          {(selectedFG || manualFG) && (
            <button
              type="button"
              className="delete-fg-btn-inline delete-fg-btn"
              onClick={() => {
                if (!window.confirm("Are you sure you want to remove the selected FG?")) return;
                setSelectedFG("");
                setManualFG("");
                setShowManualFG(false);
              }}
            >
              🗑 Remove
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="form-row">
        <label>New Notes:</label>
        <div className="note-section">
          <div className="note-options">
            {notes.map((note, i) => (
              <button
                key={i}
                className={
                  note === "Other"
                    ? otherClicked ? "selected" : ""
                    : selectedNotes.includes(note) ? "selected" : ""
                }
                onClick={() => {
                  if (note === "Other") setOtherClicked(prev => !prev);
                  handleNoteSelect(note);
                }}
              >
                {note}
              </button>
            ))}
            <button className="delete" onClick={handleDeleteNote}>
              🗑 Delete Note
            </button>
          </div>

          {selectedNotes.some((n) => n.startsWith("Other:")) && (
            <div className="other-input-row">
              <input
                type="text"
                className="other-input"
                placeholder="Specify..."
                value={otherText}
                onChange={(e) => handleOtherChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleOtherSave();
                  }
                }}
              />
              <button className="other-save-btn" onClick={handleOtherSave}>
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Handled By */}
      <div className="form-row">
        <label>Handled By:</label>
        <select
          value={form.userName}
          onChange={(e) => setForm({ ...form, userName: e.target.value })}
        >
          <option value="">Select User</option>
          {staffList.map((name, i) => <option key={i} value={name}>{name}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button onClick={onBack}>⬅ Back</button>
        <button onClick={handleSave}>💾 Save</button>
        {/* Remove this Delete FG button since we have top-right button */}
        {/* <button className="delete-btn" onClick={handleDeleteFG}>🗑 Delete FG</button> */}
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

export default AdminReceive;
