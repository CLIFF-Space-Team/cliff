// WebGL Utilities for CLIFF Space Visualization
// Basic WebGL helper functions

window.WebGLUtils = {
  // Check WebGL support
  isWebGLSupported: function() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  },

  // Get WebGL context with fallback
  getWebGLContext: function(canvas, options) {
    const names = ['webgl', 'experimental-webgl'];
    let context = null;
    
    for (let i = 0; i < names.length; i++) {
      try {
        context = canvas.getContext(names[i], options);
      } catch (e) {}
      if (context) break;
    }
    
    return context;
  },

  // Handle WebGL context lost
  handleContextLost: function(canvas, callback) {
    canvas.addEventListener('webglcontextlost', function(event) {
      event.preventDefault();
      if (callback) callback();
    });
  },

  // Handle WebGL context restored
  handleContextRestored: function(canvas, callback) {
    canvas.addEventListener('webglcontextrestored', function(event) {
      if (callback) callback();
    });
  }
};

console.log('WebGL Utils loaded');