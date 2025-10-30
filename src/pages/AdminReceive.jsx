import React, { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { getDatabase, ref, get, update, onValue } from "firebase/database";
import "./AdminReceive.css";

function AdminReceive({ fgNumber, nodeName, onBack }) {
  const db = getDatabase();
  const [title, setTitle] = useState("");
  const [remark, setRemark] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [otherClicked, setOtherClicked] = useState(false);
  const [fgList, setFgList] = useState([]); // ✅ store FG numbers dynamically
  const [includeFG, setIncludeFG] = useState(""); // selected FG
  const [selectedFG, setSelectedFG] = useState("");
  const [showManualFG, setShowManualFG] = useState(false);
  const [manualFG, setManualFG] = useState("");
  const [fgOptions, setFgOptions] = useState([]);

useEffect(() => {
  const dbRef = ref(rtdb, "Receive");
  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.val() || {};
    const entries = Object.values(data).filter((item) => item.receivingDate);

    if (entries.length === 0) {
      setFgOptions([]); // renamed for dropdown options
      setLoading(false);
      return;
    }

    // ✅ Convert DD/MM/YYYY to Date for comparison
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split("/");
      return new Date(`${year}-${month}-${day}`);
    };

    const latestDate = entries
      .map((item) => parseDate(item.receivingDate))
      .sort((a, b) => b - a)[0];

    // ✅ Get only FGs with the latest date and exclude current FG
    const recentFGs = entries
      .filter(
        (item) =>
          parseDate(item.receivingDate).getTime() === latestDate.getTime() &&
          item.fgNumber !== fgNumber
      )
      .map((item) => item.fgNumber)
      .filter(Boolean);

    setFgOptions(recentFGs); // ✅ assign to fgOptions for dropdown
    setLoading(false);
  });

  return () => unsubscribe();
}, [fgNumber]);

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
  const [images, setImages] = useState({
    checklistImageUrl: "",
    qrImageUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);

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

          if (data.note) {
            const arr = data.note.split(",").map((n) => n.trim());
            const predefined = arr.filter(n => n !== "" && !n.startsWith("Other:"));
            const other = arr.find(n => n.startsWith("Other:"))?.replace("Other:", "").trim() || "";

            setSelectedNotes(predefined);
            setOtherText(other);
            setOtherClicked(!!other); // <-- Activate Other button if there's text
          }

        } else {
          setForm((prev) => ({
            ...prev,
            manufacturingDate: today,
            receivingDate: today,
            receivingTime: time,
          }));
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

const handleSave = async () => {
  // ✅ Determine the correct FG to save (manual or selected)
  const fgToSave = showManualFG && manualFG ? manualFG : selectedFG;

  // If neither is selected, alert the user
  if (!fgToSave) {
    alert("Please select or enter an FG number before saving.");
    return;
  }

  // ✅ Update both main node and Receive node
  const nodeRef = ref(db, `${nodeName}/${fgNumber}`);
  const receiveRef = ref(db, `Receive/${fgToSave}`);

  const updates = {
    ...form,
    receivingDate: displayDate(form.receivingDate),
    manufacturingDate: displayDate(form.manufacturingDate),
    receivingTime: displayTime(form.receivingTime),
    includeWithFG: fgToSave || null,
    note: selectedNotes.join(", ") || form.note || null,
    remark: null, // ✅ Clear remark on save
  };

  try {
    // ✅ Update main node
    await update(nodeRef, updates);

    // ✅ Also save under "Receive/{fgToSave}" to ensure manual FG is stored
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

    // ✅ Reset local states
    setForm((prev) => ({ ...prev, note: "" }));
    setSelectedNotes([]);
    setOtherText("");
    setOtherClicked(false);
    setPendingDelete(false);
    setRemark("No remark");
    setSelectedFG("");
    setShowManualFG(false);
    setManualFG("");

    alert("Saved successfully!");
    onBack && onBack();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Failed to save — check console for details.");
  }
};

 const handleNoteSelect = (note) => {
  setPendingDelete(false); // cancel delete mode when selecting new notes

  let updatedNotes = [...selectedNotes];

  if (note === "Other") {
    if (!otherClicked) {
      updatedNotes.push(`Other: ${otherText || ""}`);
      setOtherClicked(true);
    } else {
      updatedNotes = updatedNotes.filter(n => !n.startsWith("Other:"));
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



  const handleOtherChange = (value) => {
    setOtherText(value);
  };

  const handleOtherSave = () => {
    if (!otherText.trim()) return;

    const updatedNotes = [
      ...selectedNotes.filter((n) => !n.startsWith("Other:")),
      `Other: ${otherText.trim()}`,
    ];

    setSelectedNotes(updatedNotes);
    setForm((prev) => ({
      ...prev,
      note: updatedNotes.join(", "),
    }));
  };

  const handleNoteTextChange = (text) => {
    setForm((prev) => ({ ...prev, note: text }));

    const arr = text
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n);

    setSelectedNotes(arr);

    const foundOther = arr.find((n) => n.startsWith("Other:"));
    setOtherText(foundOther ? foundOther.replace("Other:", "").trim() : "");
  };

const handleDeleteNote = () => {
  if (window.confirm("Are you sure you want to delete all notes?")) {
    setPendingDelete(true);
    setSelectedNotes([]);
    setOtherText("");
    setOtherClicked(false); // ✅ Reset Other button state
    setForm((prev) => ({ ...prev, note: "" }));
  }
};
  const handleImageClick = (src) => {
    if (src) setZoomImage(src);
  };

  const closeZoom = () => {
    setZoomImage(null);
  };

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
        {/* --- Header --- */}
        <div className="header">
          <h2>{title}</h2>
          <p className={`remark ${remark !== "No remark" ? "red" : ""}`}>
            Remark: {remark}
          </p>
        </div>

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

        {zoomImage && (
          <div className="image-zoom-overlay" onClick={closeZoom}>
            <div className="image-zoom-content">
              <img src={zoomImage} alt="Zoomed" />
            </div>
          </div>
        )}

        {/* --- Form Section --- */}
        <div className="form-container">
          {/* --- Form Fields --- */}
          <div className="form-row">
            <label>DO Number:</label>
            <input
              type="text"
              value={form.doNumber}
              onChange={(e) => setForm({ ...form, doNumber: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>Label Type:</label>
            <select
              value={form.labelType}
              onChange={(e) => setForm({ ...form, labelType: e.target.value })}
            >
              <option value="">Select Label</option>
              {codeList.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Quantity:</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>Manufacturing Date:</label>
            <input
              type="date"
              value={form.manufacturingDate}
              onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>Receiving Date:</label>
            <input
              type="date"
              value={form.receivingDate}
              onChange={(e) => setForm({ ...form, receivingDate: e.target.value })}
            />
          </div>

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
        <option key={fg} value={fg}>
          {fg}
        </option>
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
  </div>
</div>

  {/* --- Notes --- */}
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
              <div className="form-row">
            <label>Handled By:</label>
            <select
              value={form.userName}
              onChange={(e) => setForm({ ...form, userName: e.target.value })}
            >
              <option value="">Select User</option>
              {staffList.map((name, i) => (
                <option key={i} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* --- Actions --- */}
          <div className="form-actions">
            <button onClick={onBack}>⬅ Back</button>
            <button onClick={handleSave}>💾 Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminReceive;
