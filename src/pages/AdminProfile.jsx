import React, { useEffect, useState } from "react";
import { firestoreDB } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import "./AdminProfile.css";

function AdminProfile({ onBack }) {
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [staffEmails, setStaffEmails] = useState([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [backupProfile, setBackupProfile] = useState(null);

  const adminDocRef = doc(firestoreDB, "Admins", "profile");

  // 🔹 Load profile from Firestore
  const loadAdminProfile = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(adminDocRef);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setAddress(data.address || "");
        setStaffEmails(Array.isArray(data.staffEmails) ? data.staffEmails : []);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      alert("Failed to load profile. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminProfile();
  }, []);

  // 🔹 Add a new staff email
  const handleAddStaffEmail = async () => {
    const mail = newStaffEmail.trim();
    if (!mail) return alert("Please enter an email.");
    if (staffEmails.includes(mail)) return alert("Email already exists.");

    const updated = [...staffEmails, mail];
    setStaffEmails(updated);
    setNewStaffEmail("");

    try {
      await updateDoc(adminDocRef, { staffEmails: updated });
    } catch {
      await setDoc(adminDocRef, { staffEmails: updated }, { merge: true });
    }
  };

  // 🔹 Remove a staff email
  const handleRemoveStaffEmail = async (index) => {
    const updated = staffEmails.filter((_, i) => i !== index);
    setStaffEmails(updated);
    try {
      await updateDoc(adminDocRef, { staffEmails: updated });
    } catch {
      await setDoc(adminDocRef, { staffEmails: updated }, { merge: true });
    }
  };

  // 🔹 Enter edit mode
  const handleEditProfile = () => {
    setBackupProfile({ name, phone, email, address });
    setEditMode(true);
  };

  // 🔹 Cancel editing and restore old values
  const handleCancelEdit = () => {
    if (backupProfile) {
      setName(backupProfile.name);
      setPhone(backupProfile.phone);
      setEmail(backupProfile.email);
      setAddress(backupProfile.address);
    }
    setEditMode(false);
  };

  // 🔹 Save profile changes
  const handleSaveProfile = async () => {
    const profileData = { name, phone, email, address, staffEmails };
    try {
      await setDoc(adminDocRef, profileData, { merge: true });
      alert("Profile saved successfully.");
      setEditMode(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile. See console.");
    }
  };

  return (
    <div className="admin-profile-root">
      <h2 className="profile-title">Admin Profile</h2>

      {loading ? (
        <div className="loading">Loading profile…</div>
      ) : (
        <>
          {/* ===================== Profile Details ===================== */}
          <div className="card profile-card">
            <div className="field-row">
              <span className="field-label">Name</span>
              <input
                type="text"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={!editMode}
              />
            </div>

            <div className="field-row">
              <span className="field-label">Phone</span>
              <input
                type="text"
                className="field-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={!editMode}
              />
            </div>

            <div className="field-row">
              <span className="field-label">Email</span>
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!editMode}
              />
            </div>

            <div className="field-row">
              <span className="field-label">Address</span>
              <textarea
                className="field-input textarea"
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                readOnly={!editMode}
              />
            </div>
          </div>

          {/* ===================== Staff Emails ===================== */}
          <div className="card email-card">
            <h3 className="card-title">📧 Staff Emails</h3>

            <div className="add-email-row">
              <input
                type="email"
                className="field-input"
                placeholder="Enter Staff Email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
              <button className="add-btn" onClick={handleAddStaffEmail}>
                +
              </button>
            </div>

            <ul className="email-list">
              {staffEmails.length === 0 && (
                <li className="hint">No staff emails yet</li>
              )}
              {staffEmails.map((m, i) => (
                <li key={i} className="email-item">
                  <span className="email-text">{m}</span>
                  <button
                    className="del-btn"
                    onClick={() => handleRemoveStaffEmail(i)}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ===================== Buttons ===================== */}
          <div className="button-group">
            {editMode ? (
              <>
                <button className="save-btn" onClick={handleSaveProfile}>
                  💾 Save Profile
                </button>
                <button className="cancel-btn" onClick={handleCancelEdit}>
                  ✖ Cancel
                </button>
              </>
            ) : (
              <button className="edit-btn" onClick={handleEditProfile}>
                ✎ Edit Profile
              </button>
            )}
            <button className="back-btn" onClick={onBack}>
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminProfile;
