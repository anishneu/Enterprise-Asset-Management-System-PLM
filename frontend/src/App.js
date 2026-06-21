import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Components/Dashboard";
// import Register from "./Components/Register";
// import Login from "./Components/Login";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" />} />
      {/* <Route path="/register" element={<Register />} /> */}
      <Route path="/Dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;