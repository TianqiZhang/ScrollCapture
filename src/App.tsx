import React, { useState, useRef, useEffect } from 'react';

interface SelectionRect {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const App: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCapturing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setSelectionRect({
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        width: 0,
        height: 0
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCapturing || !selectionRect) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const newWidth = e.clientX - rect.left - selectionRect.startX;
      const newHeight = e.clientY - rect.top - selectionRect.startY;
      
      setSelectionRect({
        ...selectionRect,
        width: newWidth,
        height: newHeight
      });
    }
  };

  const startCapture = () => {
    setIsCapturing(true);
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gray-100 relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <button 
        onClick={startCapture}
        className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Start Capture
      </button>

      {selectionRect && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-50"
          style={{
            left: selectionRect.startX,
            top: selectionRect.startY,
            width: selectionRect.width,
            height: selectionRect.height
          }}
        />
      )}
    </div>
  );
};

export default App;
