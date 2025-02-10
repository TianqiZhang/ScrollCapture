import { useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

function Popup() {
  const [quality, setQuality] = useState(90);
  const [format, setFormat] = useState('png');

  const startCapture = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        console.log('Sending startCapture message to tab:', tab.id);
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'startCapture', 
          settings: { quality, format } 
        });
        console.log('Message sent, closing popup');
        setTimeout(() => window.close(), 100); // Small delay to ensure message is sent
      }
    } catch (err) {
      console.error('Failed to start capture:', err);
    }
  };

  return (
    <div className="w-[300px] min-h-[250px] p-6 bg-white">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-600">
        <Camera className="w-6 h-6" />
        Screenshot Capture
      </h1>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Quality: {quality}%
          </label>
          <input
            type="range"
            min="50"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <button
          onClick={startCapture}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <ImageIcon className="w-5 h-5" />
          Start Capture
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Press Ctrl+Shift+S (Cmd+Shift+S on Mac) to start capture
        </p>
      </div>
    </div>
  );
}

export default Popup;