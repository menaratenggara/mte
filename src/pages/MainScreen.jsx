import React, { useState } from "react";
import { auth, provider, signInWithPopup, firestoreDB, doc, getDoc } from "../firebase";
import "./MainScreen.css";

function MainScreen({ onAdminAuthorized }) {
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    try {
      setLoading(true);

      // 🔹 Sign in with Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user?.email;

      if (!email) {
        alert("Login failed. No email found.");
        setLoading(false);
        return;
      }

      // 🔹 Fetch Admins/profile document
      const docRef = doc(firestoreDB, "Admins", "profile");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const staffEmails = Array.isArray(data.staffEmails) ? data.staffEmails : [];

        if (staffEmails.includes(email)) {
          alert(`Signed in as ${email}`);
          onAdminAuthorized(email); // ✅ Notify App.js to show AdminDashboard
        } else {
          alert("Access denied. You are not an authorized admin.");
          await auth.signOut();
        }
      } else {
        alert("Admin profile document not found.");
      }
    } catch (error) {
      console.error("Login error code:", error.code);
      console.error("Login error message:", error.message);
      alert("Google Sign-In failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
        <img
        src={process.env.PUBLIC_URL + "/assets/menara_tenggara.png"}
        alt="Logo"
        className="logo"
      />
      <h2>Menara Tenggara Enterprise</h2>

      <h3>Admin Login</h3>
      <button className="btn google" onClick={handleAdminLogin}>
      <img
        src={process.env.PUBLIC_URL + "/assets/google.png"}
        alt="Google"
        className="google-icon"
      />
        Sign In via Google
      </button>

      {loading && (
        <div className="overlay">
          <div className="loader"></div>
        </div>
      )}
    </div>
  );
}

export default MainScreen;
