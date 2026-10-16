import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installAuthInterceptor } from "./lib/auth-interceptor";

installAuthInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
