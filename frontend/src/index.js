import React from "react";
import ReactDOM from "react-dom/client"; // Import `createRoot` from `react-dom/client`
import App from "./App";
import { BrowserRouter as Router } from "react-router-dom"; // Import Router

const root = ReactDOM.createRoot(document.getElementById("root")); // Create root using `createRoot`
root.render(
  <Router>  {/* Wrap your app in a Router */}
    <App />
  </Router>
);
