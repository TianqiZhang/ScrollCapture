import React, { useState } from 'react';
import { Camera, Settings, Image as ImageIcon } from 'lucide-react';

function Popup() {
  const [quality, setQuality] = useState(90);
  const [format, setFormat] = useState('png');

  const startCapture = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: 'startCapture', settings: { quality, format } });
    });
  };

  return (
    <div className="w-64 p-4 bg-white">
      <h1 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        Screenshot Capture
      </h1>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Quality: {quality}%
          </label>
          <input
            type="range"
            min="50"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full p-1 border rounded"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <button
          onClick={startCapture}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          Start Capture
        </button>
      </div>
    </div>
  );
}

export default Popup;