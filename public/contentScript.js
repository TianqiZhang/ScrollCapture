class ScrollCapture {
  constructor() {
    this.overlay = null;
    this.isCapturing = false;
    this.selectionRect = null;
    this.capturedFrames = [];
    this.createOverlay();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 2147483647,
      cursor: 'crosshair'
    });
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('mousedown', this.startSelection.bind(this));
    this.overlay.addEventListener('mousemove', this.updateSelection.bind(this));
    this.overlay.addEventListener('mouseup', this.finalizeSelection.bind(this));
  }

  startSelection(e) {
    this.isCapturing = true;
    const rect = this.overlay.getBoundingClientRect();
    this.selectionRect = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      width: 0,
      height: 0
    };
    this.updateOverlay();
  }

  updateSelection(e) {
    if (!this.isCapturing || !this.selectionRect) return;
    
    const rect = this.overlay.getBoundingClientRect();
    this.selectionRect.width = e.clientX - rect.left - this.selectionRect.startX;
    this.selectionRect.height = e.clientY - rect.top - this.selectionRect.startY;
    this.updateOverlay();
  }

  updateOverlay() {
    this.overlay.innerHTML = `
      <div style="
        position: absolute;
        border: 2px dashed #2196F3;
        background: rgba(33, 150, 243, 0.1);
        left: ${this.selectionRect.startX}px;
        top: ${this.selectionRect.startY}px;
        width: ${this.selectionRect.width}px;
        height: ${this.selectionRect.height}px;
      ">
        <div style="
          position: absolute;
          bottom: -30px;
          color: #2196F3;
          font-family: sans-serif;
          white-space: nowrap;
        ">
          ${Math.abs(this.selectionRect.width)}x${Math.abs(this.selectionRect.height)}
        </div>
      </div>
    `;
  }

  async finalizeSelection() {
    this.isCapturing = false;
    this.overlay.remove();
    
    // Calculate full capture dimensions
    const captureWidth = Math.abs(this.selectionRect.width);
    const captureHeight = Math.abs(this.selectionRect.height);
    
    // Start capture process
    await this.captureFullArea(captureWidth, captureHeight);
  }

  async captureFullArea(width, height) {
    let currentScroll = 0;
    
    while (currentScroll < height) {
      const viewportHeight = window.innerHeight;
      const captureHeight = Math.min(viewportHeight, height - currentScroll);
      
      // Capture current viewport
      const imageData = await this.captureViewport();
      this.capturedFrames.push(imageData);
      
      // Scroll down
      window.scrollBy(0, captureHeight);
      currentScroll += captureHeight;
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.processFrames();
  }

  async captureViewport() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'CAPTURE_VISIBLE_TAB',
        format: 'png'
      }, (dataUrl) => resolve(dataUrl));
    });
  }

  processFrames() {
    chrome.runtime.sendMessage({
      type: 'PROCESS_FRAMES',
      frames: this.capturedFrames,
      width: Math.abs(this.selectionRect.width),
      totalHeight: Math.abs(this.selectionRect.height)
    });
  }
}

// Initialize when message received from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'startCapture') {
    new ScrollCapture();
  }
});
