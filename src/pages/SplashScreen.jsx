import React from "react";
import "./SplashScreen.css";

function SplashScreen() {
  return (
    <div className="splash-container">
      <img
        src={process.env.PUBLIC_URL + "/assets/menara_tenggara.png"}
        alt="Menara Tenggara Logo"
        className="logo"
      />
      <h1>Welcome to Menara Tenggara</h1>
    </div>
  );
}

export default SplashScreen;
