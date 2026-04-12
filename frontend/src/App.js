import { BrowserRouter, Routes, Route } from "react-router-dom";
import Prediction from "./pages/Prediction";
import Analysis from "./pages/Analysis";
import Navbar from "./components/Navbar";

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Prediction />} />
                <Route path="/prediction" element={<Prediction />} />
                <Route path="/analysis" element={<Analysis />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;