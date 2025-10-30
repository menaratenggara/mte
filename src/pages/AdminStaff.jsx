// src/components/AdminStaff.jsx
import React, { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, push, set, remove } from "firebase/database";
import StaffItem from "./StaffItem";
import "./AdminStaff.css";

export default function AdminStaff({ onBack }) {
  const [staffList, setStaffList] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editId, setEditId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const staffRef = ref(rtdb, "Staff");

  useEffect(() => {
    const unsubscribe = onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setStaffList(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = () => {
    if (!name || !phone) {
      alert("Please fill in all fields");
      return;
    }

    if (editId) {
      set(ref(rtdb, `Staff/${editId}`), { name, phone })
        .then(() => {
          alert("Staff updated");
          clearForm();
        })
        .catch(() => alert("Failed to update staff"));
    } else {
      const newRef = push(staffRef);
      set(newRef, { name, phone })
        .then(() => {
          alert("Staff added");
          clearForm();
        })
        .catch(() => alert("Failed to add staff"));
    }
  };

  const handleEdit = (staff) => {
    setEditId(staff.id);
    setName(staff.name);
    setPhone(staff.phone);
  };

  const handleDelete = (staff) => {
    if (window.confirm(`Are you sure you want to delete ${staff.name}?`)) {
      remove(ref(rtdb, `Staff/${staff.id}`)).catch(() =>
        alert("Failed to delete staff")
      );
    }
  };

  const clearForm = () => {
    setEditId("");
    setName("");
    setPhone("");
  };

  const filteredList = staffList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortAZ = () =>
    setStaffList([...staffList].sort((a, b) => a.name.localeCompare(b.name)));
  const sortZA = () =>
    setStaffList([...staffList].sort((a, b) => b.name.localeCompare(a.name)));

  return (
    <div className="admin-staff-page">
      {/* 🔹 Back Button */}
      <button className="back-btn" onClick={onBack}>
        ⬅ Back
      </button>

      <h2>Staff Management</h2>

      {/* 🔹 Top Controls (Search + Sort Buttons) */}
      <div className="top-controls">
        <input
          type="text"
          placeholder="🔍 Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="sort-buttons">
          <button onClick={sortAZ}>Sort A–Z</button>
          <button onClick={sortZA}>Sort Z–A</button>
        </div>
      </div>

      {/* 🔹 Staff List */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="staff-list">
          {filteredList.map((staff) => (
            <StaffItem
              key={staff.id}
              staff={staff}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 🔹 Staff Form */}
      <div className="staff-form">
        <h3>{editId ? "Edit Staff" : "Add a New Staff"}</h3>
        <input
          type="text"
          placeholder="Enter Staff Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button onClick={handleSubmit}>
          {editId ? "💾 Update Staff" : "💾 Add Staff"}
        </button>
        {editId && (
          <button className="btn-cancel" onClick={clearForm}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
