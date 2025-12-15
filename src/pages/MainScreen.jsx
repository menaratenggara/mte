import React, { useState } from "react";
import { auth, provider, signInWithPopup, firestoreDB, doc, getDoc } from "../firebase";
import "./MainScreen.css";

function MainScreen({ onAdminAuthorized }) {
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    try {
      setLoading(true);

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user?.email;

      if (!email) {
        alert("Login failed. No email found.");
        return;
      }

      const docRef = doc(firestoreDB, "Admins", "profile");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const staffEmails = Array.isArray(data.staffEmails) ? data.staffEmails : [];

        if (staffEmails.includes(email)) {
          onAdminAuthorized(email);
        } else {
          alert("Access denied. You are not an authorized admin.");
          await auth.signOut();
        }
      } else {
        alert("Admin profile document not found.");
      }
    } catch (error) {
      console.error(error);
      alert("Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-root">

      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="header-left">
          <img
            src={process.env.PUBLIC_URL + "/assets/menara_tenggara.png"}
            alt="Logo"
            className="header-logo"
          />
          <h1>Menara Tenggara Enterprise</h1>
        </div>

        <button className="btn google header-login" onClick={handleAdminLogin}>
          <img
            src={process.env.PUBLIC_URL + "/assets/google.png"}
            alt="Google"
            className="google-icon"
          />
          Admin Login
        </button>
      </header>

      {/* ===== CONTENT ===== */}
      <main className="content">
        <h2>About Menara Tenggara Enterprise</h2>

        <p className="summary">
          Menara Tenggara Enterprise is a bumiputra status company and has been
          operating since 1997. We are a sb-vendor for Sapura Machining
          Corporation Sdn Bhd and LSF Technology Sdn Bhd which provide automotive
          component painting services for PERODUA, HONDA, MAZDA, and TOYOTA's
          cars. We have been recognized by SIRIM with ISO 9001:2015 certified
          since 2013.
        </p>

        {/* ===== IMAGES ===== */}
        <div className="image-row">
          <img src={process.env.PUBLIC_URL + "/assets/img1.jpg"} alt="Factory 1" />
          <img src={process.env.PUBLIC_URL + "/assets/img2.jpg"} alt="Factory 2" />
          <img src={process.env.PUBLIC_URL + "/assets/img3.jpg"} alt="Factory 3" />
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <p className="contact-info">
          <strong>Contact information :</strong> 06-794 1223
        </p>

        <p className="address-info">
          <strong>Address:</strong>{" "}
          <a
            href="https://www.google.com/maps/search/?api=1&query=Jalan+Nilai+7/10+487,+Nilai,+Negeri+Sembilan,+Malaysia"
            target="_blank"
            rel="noopener noreferrer"
            className="address-link"
          >
            Jalan Nilai 7/10 487, Nilai, Negeri Sembilan, Malaysia
          </a>
        </p>
      </footer>

      {loading && (
        <div className="overlay">
          <div className="loader"></div>
        </div>
      )}
    </div>
  );
}

export default MainScreen;
