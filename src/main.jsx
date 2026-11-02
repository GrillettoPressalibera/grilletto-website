import React from "react";
import { createRoot } from "react-dom/client";
import { Effects } from "./Effects.jsx";

const node = document.getElementById("effects");
if (node) createRoot(node).render(<Effects />);
