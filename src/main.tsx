import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { initCSRFProtection } from "./lib/csrf-protection";

// Initialize CSRF protection
initCSRFProtection();

createRoot(document.getElementById("root")!).render(<App />);
