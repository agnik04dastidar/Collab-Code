import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FaArrowsAltV } from 'react-icons/fa';

const ResizableIO = ({ input, onInputChange, output, language, isRunning }) => {
  const [height, setHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const resizeRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newHeight = window.innerHeight - e.clientY;
    
    const minHeight = 100;
    const maxHeight = window.innerHeight * 0.6;
    
    if (newHeight >= minHeight && newHeight <= maxHeight) {
      setHeight(newHeight);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const arcadeGreen = "#00ff00";
  const arcadeGreenDark = "#00cc00";
  const arcadeGreenLight = "#66ff66";
  const arcadeBg = "#0a0a0a";
  const arcadeBgLight = "#1a1a1a";

  return (
    <div 
      ref={containerRef}
      className="border-t flex"
      style={{ 
        borderColor: arcadeGreen, 
        backgroundColor: `${arcadeBgLight}DD`,
        height: `${height}px`,
        minHeight: '100px',
        maxHeight: '60vh',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Resize Handle */}
      <div 
        ref={resizeRef}
        className="resize-handle absolute left-0 right-0 top-0 h-3 cursor-ns-resize flex items-center justify-center z-10 hover:bg-arcadeGreen/30"
        onMouseDown={handleMouseDown}
        style={{
          backgroundColor: isResizing ? arcadeGreen : 'transparent',
        }}
        title="Drag to resize"
      >
        <FaArrowsAltV 
          size={12} 
          style={{ 
            color: isResizing ? arcadeBg : arcadeGreen 
          }} 
        />
      </div>

      {/* Input */}
      <div className="flex-1 border-r p-2 flex flex-col min-h-0" style={{ borderColor: arcadeGreenDark }}>
        <label className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: arcadeGreen }}>
          INPUT
        </label>
        <textarea
          value={input}
          onChange={onInputChange}
          placeholder="stdin..."
          className="w-full flex-1 resize-none text-sm"
          style={{
            backgroundColor: arcadeBg,
            border: `1px solid ${arcadeGreenDark}`,
            color: arcadeGreenLight,
            fontFamily: '"VT323", monospace',
            fontSize: '12px',
            padding: '4px',
            overflowY: 'auto'
          }}
        />
      </div>
      
      {/* Output */}
      <div className="flex-1 p-2 flex flex-col min-h-0">
        <label className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: arcadeGreen }}>
          OUTPUT ({language.toUpperCase()})
        </label>
        <div className="flex-1 overflow-y-auto p-2 bg-black/80 rounded border whitespace-pre-wrap leading-tight" 
          style={{
            backgroundColor: `${arcadeBg}EE`,
            borderColor: arcadeGreenDark,
            color: output ? arcadeGreenLight : arcadeGreenDark,
            fontFamily: '"VT323", monospace',
            fontSize: '11px',
            lineHeight: 1.3,
            position: 'relative'
          }}>
          {output || (isRunning ? 'Running...' : 'Click EXECUTE to run...')}
        </div>
      </div>
    </div>
  );
};

export default ResizableIO;

