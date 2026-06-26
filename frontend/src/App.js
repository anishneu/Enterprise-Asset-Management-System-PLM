import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Components/Dashboard";
// import Register from "./Components/Register";
// import Login from "./Components/Login";

import { AppFeedbackProvider } from "./context/AppFeedbackContext";
import { ProfileProvider } from "./context/ProfileContext";

function App() {
  return (
    <AppFeedbackProvider>
      <ProfileProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/Dashboard" />} />
          {/* <Route path="/register" element={<Register />} /> */}
          <Route path="/Dashboard" element={<Dashboard />} />
        </Routes>
      </ProfileProvider>
    </AppFeedbackProvider>
  );
}

export default App;