import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { getDatabase, ref, get, child } from "firebase/database";
import StaffAnalyticsTable from "./StaffAnalyticsTable";

const workstations = ["Receive", "Treat", "Paint", "Pack", "Deliver"];
const dateFields = {
  Receive: "receivingDate",
  Treat: "dateTreat",
  Paint: "datePaint",
  Pack: "datePack",
  Deliver: "dateDeliver",
};

const AnalyticStaff = ({ onBack }) => {
  const [analyticsList, setAnalyticsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState("");

  useEffect(() => {
    const db = getDatabase();

    const fetchAnalytics = async () => {
      const tempStats = {};
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - 6); // Last 6 days
      const todayDow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      for (const ws of workstations) {
        const snapshot = await get(child(ref(db), ws));
        snapshot.forEach((childSnap) => {
          const user = childSnap.val().username || childSnap.val().userName;
          if (!user) return;

          const dateRaw = childSnap.val()[dateFields[ws]];
          if (!dateRaw) return;

          const dateParts = dateRaw.split("/");
          if (dateParts.length !== 3) return;

          const recordDate = new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]);
          const dayOfWeek = recordDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

          // Only count if within Monday-Saturday and within last 6 days
          if (dayOfWeek >= 1 && dayOfWeek <= 6 && recordDate >= startDate && recordDate <= today) {
            tempStats[user] = tempStats[user] || {};
            tempStats[user][ws] = tempStats[user][ws] || new Set();
            // Use string key to track unique days
            const dateKey = `${recordDate.getFullYear()}-${recordDate.getMonth() + 1}-${recordDate.getDate()}`;
            tempStats[user][ws].add(dateKey);
          }
        });
      }

      // Convert Sets to counts and sorted arrays
      const list = Object.entries(tempStats).map(([staff, wsMap]) => {
        const counts = {};
        const days = {};
        workstations.forEach((ws) => {
          const daySet = wsMap[ws] || new Set();
          const sortedDays = [...daySet].sort((a, b) => new Date(a) - new Date(b));
          counts[ws] = sortedDays.length;
          days[ws] = sortedDays;
        });
        return { staffName: staff, counts, days };
      });

      setAnalyticsList(list);
      setLoading(false);

      setHint(
        todayDow >= 1 && todayDow <= 6
          ? `Today is Day ${todayDow}`
          : "Today is not a working day (Sunday)"
      );
    };

    fetchAnalytics();
  }, []);

  return (
    <Box sx={{ p: 2, backgroundColor: "#90CAF9", minHeight: "100vh", position: "relative" }}>
      <Typography
        variant="h5"
        fontWeight="bold"
        gutterBottom
        sx={{ color: "#0d47a1", textAlign: "center", mt: 4, mb: 3 }}
      >
        Staff Placement In a Week
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <StaffAnalyticsTable analyticsList={analyticsList} />
          <Typography sx={{ mt: 2, color: "#333" }}>{hint}</Typography>
        </>
      )}

      <Button
        onClick={onBack}
        variant="contained"
        sx={{ position: "fixed", bottom: "40px", left: "20px", backgroundColor: "#B0BEC5", zIndex: 1000 }}
      >
        ← Back
      </Button>
    </Box>
  );
};

export default AnalyticStaff;
