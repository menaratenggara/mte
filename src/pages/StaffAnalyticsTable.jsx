import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";

const StaffAnalyticsTable = ({ analyticsList }) => {
  if (!analyticsList || analyticsList.length === 0) return null;

  // Find max count for heatmap
  const maxCount = Math.max(
    ...analyticsList.flatMap((item) => Object.values(item.counts))
  );

  const getCellColor = (count) => {
    if (!maxCount) return "#fff";
    const intensity = Math.min(255, Math.floor((count / maxCount) * 200));
    return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
  };

  // Helper to format "YYYY-M-D" string to "dd/MM"
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  // Get start (Monday) and end (Saturday) of current week
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5); // Saturday
    monday.setHours(0, 0, 0, 0);
    saturday.setHours(23, 59, 59, 999);
    return { monday, saturday };
  };

  const { monday, saturday } = getWeekRange();

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ backgroundColor: "#ddd", fontWeight: "bold" }}>
              Staff
            </TableCell>
            {Object.keys(analyticsList[0].counts).map((ws) => (
              <TableCell
                key={ws}
                sx={{ backgroundColor: "#ddd", fontWeight: "bold", textAlign: "center" }}
              >
                {ws}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {analyticsList.map((item) => (
            <TableRow key={item.staffName}>
              <TableCell>{item.staffName}</TableCell>
              {Object.entries(item.counts).map(([ws, count]) => {
                const daySet = item.days?.[ws] || new Set();

                // Only include dates within current week
                const dayArray = [...daySet].filter((d) => {
                  const dt = new Date(d);
                  return dt >= monday && dt <= saturday;
                }).sort((a, b) => new Date(a) - new Date(b));

                const display = dayArray.length; // total days this week
                const tooltipText = dayArray.length > 0
                  ? dayArray.map(formatDate).join(", ")
                  : "None";

                return (
                  <Tooltip key={ws} title={`Days: ${tooltipText}`}>
                    <TableCell
                      sx={{
                        backgroundColor: getCellColor(display),
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {display}
                    </TableCell>
                  </Tooltip>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StaffAnalyticsTable;