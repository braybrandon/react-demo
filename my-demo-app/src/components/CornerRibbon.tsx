import React from "react";

type Props = {
  text?: string;
  color?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export default function CornerRibbon({
  text = "Coming soon",
  color = "#ef4444",
  position = "top-left",
}: Props) {
  // We'll render an absolutely positioned rotated ribbon. Consumer must have position: relative on parent.
  const base = {
    position: "absolute" as const,
    zIndex: 20,
    pointerEvents: "none" as const,
  };

  const style: React.CSSProperties = {
    ...base,
    width: 140,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-45deg)",
    background: color,
    color: "#fff",
    fontWeight: 700,
    fontSize: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  };

  // position adjustments
  if (position === "top-left") Object.assign(style, { left: -40, top: 12 });
  if (position === "top-right")
    Object.assign(style, { right: -40, top: 12, transform: "rotate(45deg)" });
  if (position === "bottom-left")
    Object.assign(style, { left: -40, bottom: 12, transform: "rotate(45deg)" });
  if (position === "bottom-right") Object.assign(style, { right: -40, bottom: 12 });

  return <div style={style}>{text}</div>;
}
