import React, { useState, useEffect } from "react";
import SplashScreen from "./pages/SplashScreen";
import MainScreen from "./pages/MainScreen";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfile from "./pages/AdminProfile";
import AdminWorkstation from "./pages/AdminWorkstation";
import AdminStaff from "./pages/AdminStaff";
import AdminProduct from "./pages/AdminProduct";
import AdminData from "./pages/AdminData";
import AdminProgress from "./pages/AdminProgress";
import AdminReceive from "./pages/AdminReceive";
import AdminTreat from "./pages/AdminTreat";
import AdminPaint from "./pages/AdminPaint";
import AdminPack from "./pages/AdminPack";
import AdminDeliver from "./pages/AdminDeliver";
import AdminReport from "./pages/AdminReport";
import AnalyticProductionLine from "./pages/AnalyticProductionLine";
import AnalyticStaff from "./pages/AnalyticStaff";
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeClass, setFadeClass] = useState("fade-in");
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedFG, setSelectedFG] = useState("");
  const [selectedNode, setSelectedNode] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeClass("fade-out");
      setTimeout(() => {
        setShowSplash(false);
        setFadeClass("fade-in");
      }, 1000);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthorized = (email) => {
    setAdminEmail(email);
    setAuthorized(true);
  };

  // Handle navigation from FGItemCard
  const handleNavigate = (nodeName, fgNumber) => {
    setSelectedFG(fgNumber);
    setSelectedNode(nodeName);

    const lower = nodeName.toLowerCase();
    if (lower === "receive") setCurrentView("receive");
    else if (lower === "treat") setCurrentView("treat");
    else if (lower === "paint") setCurrentView("paint");
    else if (lower === "pack") setCurrentView("pack");
    else if (lower === "deliver") setCurrentView("deliver");
    else alert(`No page available for node: ${nodeName}`);
  };

  return (
    <div className={`fade-container ${fadeClass}`}>
      {showSplash ? (
        <SplashScreen />
      ) : authorized ? (
        <>
          {currentView === "dashboard" && (
            <AdminDashboard
              email={adminEmail}
              onProfileClick={() => setCurrentView("profile")}
              onWorkstationClick={() => setCurrentView("workstation")}
              onStaffClick={() => setCurrentView("staff")}
              onProductClick={() => setCurrentView("product")}
              onDataClick={() => setCurrentView("data")}
              onProgressClick={() => setCurrentView("progress")}
              onReceiveClick={() => setCurrentView("receive")}
              onTreatClick={() => setCurrentView("treat")}
              onPaintClick={() => setCurrentView("paint")}
              onPackClick={() => setCurrentView("pack")}
              onDeliverClick={() => setCurrentView("deliver")}
              onReportClick={() => setCurrentView("report")}
              onAnalyticProductionLineClick={() => setCurrentView("analyticProductionLine")}
              onAnalyticStaffClick={() => setCurrentView("analyticStaff")}
            />
          )}
          {currentView === "profile" && (
            <AdminProfile onBack={() => setCurrentView("dashboard")} email={adminEmail} />
          )}
          {currentView === "workstation" && (
            <AdminWorkstation onBack={() => setCurrentView("dashboard")} email={adminEmail} />
          )}
          {currentView === "staff" && (
            <AdminStaff onBack={() => setCurrentView("dashboard")} email={adminEmail} />
          )}
          {currentView === "product" && (
            <AdminProduct onBack={() => setCurrentView("dashboard")} email={adminEmail} />
          )}
          {currentView === "data" && (
            <AdminData onBack={() => setCurrentView("dashboard")} email={adminEmail} />
          )}
          {currentView === "progress" && (
            <AdminProgress
              onBack={() => setCurrentView("dashboard")}
              email={adminEmail}
              onNavigate={handleNavigate} // ✅ Pass navigation handler down
            />
          )}
          {currentView === "receive" && (
            <AdminReceive
              onBack={() => setCurrentView("progress")}
              fgNumber={selectedFG}
              nodeName={selectedNode}
            />
          )}
          {currentView === "treat" && (
            <AdminTreat
              onBack={() => setCurrentView("progress")}
              fgNumber={selectedFG}
              nodeName={selectedNode}
            />
          )}
          {currentView === "paint" && (
            <AdminPaint
              onBack={() => setCurrentView("progress")}
              fgNumber={selectedFG}
              nodeName={selectedNode}
            />
          )}
          {currentView === "pack" && (
            <AdminPack
              onBack={() => setCurrentView("progress")}
              fgNumber={selectedFG}
              nodeName={selectedNode}
            />
          )}
          {currentView === "deliver" && (
            <AdminDeliver
              onBack={() => setCurrentView("progress")}
              fgNumber={selectedFG}
              nodeName={selectedNode}
            />
          )}
{currentView === "report" && (
  <AdminReport
    onBack={() => setCurrentView("dashboard")}
    onStaffReport={() => setCurrentView("analyticStaff")}
    onProductionReport={() => setCurrentView("analyticProductionLine")}
  />
)}
{currentView === "analyticProductionLine" && (
  <AnalyticProductionLine onBack={() => setCurrentView("report")} />
)}
{currentView === "analyticStaff" && (
  <AnalyticStaff onBack={() => setCurrentView("report")} />
)}
        </>
      ) : (
        <MainScreen onAdminAuthorized={handleAuthorized} />
      )}
    </div>
  );
}

export default App;