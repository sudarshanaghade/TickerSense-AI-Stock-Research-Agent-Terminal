import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TerminalPage from "./pages/TerminalPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TerminalPage />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;