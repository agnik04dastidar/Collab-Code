import React, { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";

// Generate consistent unique ID
const generateId = () => {
  return `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const TextBox = ({
  id,
  x,
  y,
  width = 200,
  height = 100,
  text = "",
  color = "#000000",
  updateText,
  updatePosition,
  removeTextBox
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localText, setLocalText] = useState(text);
  const textareaRef = useRef(null);

  // Sync local text when prop changes
  useEffect(() => {
    setLocalText(text);
  }, [text]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setLocalText(newText);
    if (updateText) {
      updateText(newText);
    }
  };

  const handleRemove = (e) => {
    // Stop propagation to prevent any parent handlers
    e.stopPropagation();
    e.preventDefault();
    if (removeTextBox) {
      removeTextBox();
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <Rnd
      size={{ width, height }}
      position={{ x: x || 50, y: y || 50 }}
      bounds="parent"
      minWidth={80}
      minHeight={40}
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
      onDragStart={(e) => {
        e.stopPropagation();
      }}
      onDragStop={(e, d) => {
        const parent = e.target.parentElement.getBoundingClientRect();
        const box = e.target.getBoundingClientRect();
        const newX = Math.max(0, Math.min(d.x, parent.width - box.width));
        const newY = Math.max(0, Math.min(d.y, parent.height - box.height));
        if (updatePosition) {
          updatePosition({ x: newX, y: newY, width, height });
        }
      }}
      onResizeStop={(e, dir, ref, delta, pos) => {
        if (updatePosition) {
          updatePosition({
            x: pos.x,
            y: pos.y,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          });
        }
      }}
      style={{
        zIndex: 1000,
        border: isHovered ? "1px solid #0ea5e9" : "1px solid #94a3b8",
        background: "#fff",
        borderRadius: "4px",
        boxShadow: isHovered 
          ? "0 4px 12px rgba(14, 165, 233, 0.3)" 
          : "0 2px 6px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        style={{ 
          position: "relative", 
          width: "100%", 
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Header bar similar to MS Word text box */}
        <div 
          style={{
            height: "24px",
            background: isHovered ? "#f1f5f9" : "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            borderRadius: "4px 4px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
            cursor: "move",
            userSelect: "none"
          }}
        >
          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "4px" }}>
            Text Box
          </span>
          
          {/* Close button - MS Word style */}
          {(isHovered || isEditing) && (
            <button
              onClick={handleRemove}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "18px",
                height: "18px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px",
                lineHeight: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                fontWeight: "bold",
                transition: "background-color 0.15s",
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#dc2626"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#ef4444"}
              title="Remove Text Box"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Type here..."
          style={{
            flex: 1,
            width: "100%",
            fontSize: "14px",
            color: color,
            resize: "none",
            border: "none",
            outline: "none",
            padding: "8px",
            boxSizing: "border-box",
            backgroundColor: "transparent",
            overflowWrap: "break-word",
            fontFamily: "inherit",
            cursor: isEditing ? "text" : "pointer",
          }}
        />
      </div>
    </Rnd>
  );
};

// Export both the component and a generator function
export { generateId };
export default TextBox;
