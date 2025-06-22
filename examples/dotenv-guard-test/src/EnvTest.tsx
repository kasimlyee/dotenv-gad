import React from "react";

const EnvTest: React.FC = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Environment Variables Test</h1>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th style={{ padding: "8px", border: "1px solid #ddd" }}>
              Variable
            </th>
            <th style={{ padding: "8px", border: "1px solid #ddd" }}>Value</th>
            <th style={{ padding: "8px", border: "1px solid #ddd" }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries({
            VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
            VITE_API_URL: import.meta.env.VITE_API_URL,
            VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
            VITE_MAX_ITEMS: import.meta.env.VITE_MAX_ITEMS,
          }).map(([key, value]) => (
            <tr key={key}>
              <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                {key}
              </td>
              <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                {value?.toString()}
              </td>
              <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                {typeof value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EnvTest;
