import { NavLink } from "react-router-dom";

function Navbar() {
    return (
        <nav className="navbar">
            <NavLink to="/" className="navbar-brand">StockAI</NavLink>
            <div className="navbar-links">
                <NavLink to="/" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} end>
                    Predict
                </NavLink>
                <NavLink to="/analysis" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                    Analysis
                </NavLink>
            </div>
        </nav>
    );
}

export default Navbar;