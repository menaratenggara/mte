import React, { useState, useEffect, useRef } from "react";
import "./AdminDashboard.css";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { getDatabase, ref, onValue, child, get } from "firebase/database";

function AdminDashboard({ email, onProfileClick, onWorkstationClick, onStaffClick, onProductClick, onDataClick, onProgressClick, onReportClick }) {
  const [dateTime, setDateTime] = useState("");

  // Keep track of FG notifications (fgNumber_stepCount)
  const notifiedFgNumbers = useRef(new Set());

  // --- Update date/time every second
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

  // --- Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Error signing out. Try again.");
    }
  };

  // --- Send browser notification
  const sendBrowserNotification = (fgNumber, stepCount) => {
    if (!("Notification" in window)) return;

    const bodyText = stepCount === 1
      ? `FG ${fgNumber} has 1 step with remarks.`
      : `FG ${fgNumber} has ${stepCount} steps with remarks.`;

    if (Notification.permission === "granted") {
      new Notification("FG Remarks Alert", { body: bodyText, icon: "/assets/notification_icon.png" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("FG Remarks Alert", { body: bodyText, icon: "/assets/notification_icon.png" });
        }
      });
    }
  };

  // --- Listen to FG remarks and send notifications per FG with count of steps
  const listenFgRemarks = () => {
    const db = getDatabase();
    const nodes = ["Receive", "Treat", "Paint", "Pack", "Deliver"];
    
    nodes.forEach(node => {
      const nodeRef = ref(db, node);
      onValue(nodeRef, snapshot => {
        const fgMap = {}; // fgNumber -> count of steps with remarks

        snapshot.forEach(childSnap => {
          const fgNumber = childSnap.child("fgNumber").val();
          const remark = childSnap.child("remark").val();
          if (remark) {
            fgMap[fgNumber] = (fgMap[fgNumber] || 0) + 1;
          }
        });

        // Send notification for each FG if not notified yet or step count changed
        Object.entries(fgMap).forEach(([fgNumber, stepCount]) => {
          const notificationKey = `${fgNumber}_${stepCount}`;
          if (!notifiedFgNumbers.current.has(notificationKey)) {
            sendBrowserNotification(fgNumber, stepCount);

            // Remove previous notification for same FG if stepCount changed
            Array.from(notifiedFgNumbers.current)
              .filter(key => key.startsWith(fgNumber + "_"))
              .forEach(oldKey => notifiedFgNumbers.current.delete(oldKey));

            notifiedFgNumbers.current.add(notificationKey);
          }
        });
      });
    });
  };

  useEffect(() => {
    listenFgRemarks();
  }, []);

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
          <img
        src={process.env.PUBLIC_URL + "/assets/workstation_admin.png"}
        alt="Workstation"
        className="icon-image"
      />
            <p className="icon-label">Workstation</p>
          </div>

          <div className="icon-group" onClick={onReportClick}>
      <img
        src={process.env.PUBLIC_URL + "/assets/report_admin.png"}
        alt="Report"
        className="icon-image"
      />
            <p className="icon-label">Report</p>
          </div>

          <div className="icon-group" onClick={onProductClick}>
      <img
        src={process.env.PUBLIC_URL + "/assets/product_admin.png"}
        alt="Product"
        className="icon-image"
      />
            <p className="icon-label">Product</p>
          </div>
        </div>

        <div className="icon-column">
          <div className="icon-group" onClick={onProgressClick}>
      <img
        src={process.env.PUBLIC_URL + "/assets/progress_admin.png"}
        alt="Progress"
        className="icon-image"
      />
            <p className="icon-label">Progress</p>
          </div>

          <div className="icon-group" onClick={onDataClick}>
      <img
        src={process.env.PUBLIC_URL + "/assets/data_admin.png"}
        alt="Data"
        className="icon-image"
      />
            <p className="icon-label">Data</p>
          </div>

          <div className="icon-group" onClick={onStaffClick}>
      <img
        src={process.env.PUBLIC_URL + "/assets/staff_admin.png"}
        alt="Staff"
        className="icon-image"
      />
            <p className="icon-label">Staff</p>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <div className="icon-group" onClick={onProfileClick}>
      <img
        src={process.env.PUBLIC_URL + "/assets/profile_admin.png"}
        alt="Profile"
        className="icon-image"
      />
          <p className="icon-label">Profile</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
