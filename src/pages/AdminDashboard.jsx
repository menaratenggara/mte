import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

function AdminDashboard({ email, onProfileClick, onWorkstationClick, onStaffClick, onProductClick, onDataClick, onProgressClick, onReportClick }) {
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const formatted = now.toLocaleString("en-MY", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setDateTime(formatted);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Error signing out. Try again.");
    }
  };

  return (
    <div className="admin-dashboard">
      <header>
        <h2 className="welcome-text">Welcome, Admin!</h2>
        <p className="date-time-text">{dateTime || "Loading date and time..."}</p>
        <button className="logout-button" onClick={handleLogout}>Log Out</button>
      </header>

      <div className="icon-grid">
        <div className="workstation-section">
          <div className="icon-group" onClick={onWorkstationClick}>
            <img src="/assets/workstation_admin.png" alt="Workstation" className="icon-image" />
            <p className="icon-label">Workstation</p>
          </div>

          <div className="icon-group" onClick={onReportClick}>
            <img src="/assets/report_admin.png" alt="Report" className="icon-image" />
            <p className="icon-label">Report</p>
          </div>

          <div className="icon-group" onClick={onProductClick}>
            <img src="/assets/product_admin.png" alt="Product" className="icon-image" />
            <p className="icon-label">Product</p>
          </div>
        </div>

        <div className="icon-column">
          <div className="icon-group" onClick={onProgressClick}>
            <img src="/assets/progress_admin.png" alt="Progress" className="icon-image" />
            <p className="icon-label">Progress</p>
          </div>

          <div className="icon-group" onClick={onDataClick}>
            <img src="/assets/data_admin.png" alt="Data" className="icon-image" />
            <p className="icon-label">Data</p>
          </div>

          <div className="icon-group" onClick={onStaffClick}>
            <img src="/assets/staff_admin.png" alt="Staff" className="icon-image" />
            <p className="icon-label">Staff</p>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <div className="icon-group" onClick={onProfileClick}>
          <img src="/assets/profile_admin.png" alt="Profile" className="icon-image" />
          <p className="icon-label">Profile</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
