import { Navigate } from "react-router-dom";
// Saved homes live at /hunt/saved, which also shows homes saved without an account (2-oct-2026).
const Saved = () => <Navigate to="/hunt/saved" replace />;
export default Saved;
