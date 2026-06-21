import React from 'react';
import ReactDOM from 'react-dom/client';
import './theme.css';
import './index.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './agGridSetup';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom";

import keycloak from "./keycloak";

const root = ReactDOM.createRoot(document.getElementById('root'));

keycloak.init({
  onLoad: "login-required",
  pkceMethod: "S256",
}).then((authenticated) => {
  console.log("Keycloak authenticated:", authenticated);

  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}).catch((err) => {
  console.error("Keycloak init failed:", err);

  root.render(
    <div className="appbox">
      <h2>Authentication Error</h2>
      <p>Unable to connect to Keycloak. Please check that the server is running and try again.</p>
    </div>
  );
});

reportWebVitals();