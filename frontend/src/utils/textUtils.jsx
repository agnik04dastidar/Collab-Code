import React from "react";
import { Rnd } from "react-rnd";

const TextBox = ({
  id,
  x,
  y,
  width,
  height,
  text,
  color,
  updateText,
  updatePosition,
  removeTextBox
}) => {
  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      bounds="parent"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      onDragStop={(e, d) => {
        const parent = d.node.parentNode.getBoundingClientRect();
        const box = d.node.getBoundingClientRect();
        const newX = Math.max(0, Math.min(d.x, parent.width - box.width));
        const newY = Math.max(0, Math.min(d.y, parent.height - box.height));
        updatePosition(id, { x: newX, y: newY, width, height });
      }}
      onResizeStop={(e, dir, ref, delta, pos) => {
        updatePosition(id, {
          x: pos.x,
          y: pos.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
      }}
      style={{
        zIndex: 1000,
        border: "1px solid #666",
        background: "#fff",
        padding: "2px",
        borderRadius: "4px",
        boxShadow: "0 0 5px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <textarea
          value={text}
          onChange={(e) => updateText(id, e.target.value)}
          style={{
            width: "100%",
            height: "100%",
            fontSize: "16px",
            color: color,
            resize: "none",
            border: "none",
            outline: "none",
            padding: "6px",
            boxSizing: "border-box",
            backgroundColor: "transparent",
            overflowWrap: "break-word",
          }}
        />
        <button
          onClick={() => removeTextBox(id)}
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
            lineHeight: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Remove Text Box"
        >
          ×
        </button>
      </div>
    </Rnd>
  );
};

export default TextBox;
