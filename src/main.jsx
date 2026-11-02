import React from "react";
import { createRoot } from "react-dom/client";
import { GraphicMotif } from "./GraphicMotif.jsx";

const node = document.getElementById("motif");
if (node) createRoot(node).render(<GraphicMotif />);
