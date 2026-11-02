import React, { useEffect, useRef } from "react";
import { motionOffsets } from "./motion.js";

export function Effects() {
  const ref = useRef(null);

  useEffect(() => {
    const layer = ref.current;
    const field = layer?.closest(".graphic");
    if (!layer || !field) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let pointer = { x: 0, y: 0 };
    let hasPointer = false;

    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      layer.style.removeProperty("--cursor-x");
      layer.style.removeProperty("--cursor-y");
      layer.style.removeProperty("--scroll-shift");
    };

    const update = () => {
      frame = 0;
      if (reduced.matches) return reset();
      const rect = field.getBoundingClientRect();
      const scrollLength = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const offsets = motionOffsets({
        x: hasPointer && finePointer.matches ? pointer.x : rect.width / 2,
        y: hasPointer && finePointer.matches ? pointer.y : rect.height / 2,
        width: rect.width,
        height: rect.height,
        scroll: window.scrollY / scrollLength,
      });
      layer.style.setProperty("--cursor-x", `${offsets.x * 24}px`);
      layer.style.setProperty("--cursor-y", `${offsets.y * 24}px`);
      layer.style.setProperty("--scroll-shift", `${offsets.scroll * 44}px`);
    };
    const schedule = () => { if (!frame && !reduced.matches) frame = requestAnimationFrame(update); };
    const move = (event) => {
      if (!finePointer.matches || reduced.matches) return;
      const rect = field.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      hasPointer = true;
      schedule();
    };
    const leave = () => { hasPointer = false; schedule(); };
    const preferenceChanged = () => { if (reduced.matches) reset(); else schedule(); };
    const pointerChanged = () => { hasPointer = false; schedule(); };

    field.addEventListener("pointermove", move, { passive: true });
    field.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    reduced.addEventListener("change", preferenceChanged);
    finePointer.addEventListener("change", pointerChanged);
    schedule();
    return () => {
      reset();
      field.removeEventListener("pointermove", move);
      field.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", preferenceChanged);
      finePointer.removeEventListener("change", pointerChanged);
    };
  }, []);

  return <div className="motion-layer" ref={ref}><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div>;
}
