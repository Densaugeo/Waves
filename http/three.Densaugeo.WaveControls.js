THREE.Densaugeo.WaveControls = function(camera, domElement, options) {
  var self = this;
  
  if(domElement == null) {
    throw new TypeError('Error in THREE.Densaugeo.OrbitControls constructor: domElement must be supplied');
  }
  
  for(var i in options) {
    this[i] = options[i];
  }
  
  camera.matrixAutoUpdate = false;
  camera.rotation.order = 'ZYX';
  
  var inputs = {}; // This particular ; really is necessary
  
  var changed = true;
  this.changed = function() {
    if(changed) {
      changed = false;
      return true;
    } else {
      return false;
    }
  }
  
  document.addEventListener('keydown', function(e) {
    if(!e.altKey && !e.ctrlKey && !e.shiftKey) {
      inputs[e.keyCode] = true;
    }
  });
  
  document.addEventListener('keyup', function(e) {
    delete inputs[e.keyCode];
  });
  
  // FF doesn't support standard mousewheel event
  document.addEventListener('mousewheel', function(e) {
    camera.matrix.translateZ(-e.wheelDelta*self.dollySpeed/360);
  });
  document.addEventListener('DOMMouseScroll', function(e) {
    camera.matrix.translateZ(e.detail*self.dollySpeed/3);
  });
  
  // Context menu interferes with mouse control
  domElement.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  
  // Only load mousemove handler while mouse is depressed
  domElement.addEventListener('mousedown', function(e) {
    domElement.addEventListener('mousemove', mouseRotHandler);
  });
  
  domElement.addEventListener('mouseup', function() {
    domElement.removeEventListener('mousemove', mouseRotHandler);
  });
  
  domElement.addEventListener('mouseleave', function() {
    domElement.removeEventListener('mousemove', mouseRotHandler);
  });
  
  var mouseRotHandler = function(e) {
    rotateGlobalZ = (e.movementX || e.mozMovementX || e.webkitMovementX || 0)*self.rotationMouseSpeed;
    rotateX       = (e.movementY || e.mozMovementY || e.webkitMovementY || 0)*self.rotationMouseSpeed;
  }
  
  // Touchmove events do not work when directly added, they have to be added by a touchstart listener
  // I think this has to do with the default touch action being scrolling
  domElement.addEventListener('touchstart', function(e) {
    e.preventDefault();
    
    if(e.touches.length === 1) {
      touchZeroPrevious = e.touches[0];
      domElement.addEventListener('touchmove', TouchHandler);
    } else if(e.touches.length === 2) {
      touchOnePrevious = e.touches[1];
    }
  });
  
  domElement.addEventListener('touchend', function(e) {
    if(e.touches.length === 0) {
      domElement.removeEventListener('touchmove', TouchHandler);
    }
  });
  
  var TouchHandler = function(e) {
    e.preventDefault(); // Should be called at least on every touchmove event
    
    rotateX       -= (e.touches[0].clientY - touchOnePrevious.clientY)*self.rotatationTouchSpeed;
    rotateGlobalZ -= (e.touches[0].clientX - touchOnePrevious.clientX)*self.rotatationTouchSpeed;
    
    touchZeroPrevious = e.touches[0];
    
    if(e.touches.length === 2) {
      translateZ += (e.touches[1].clientY - touchOnePrevious.clientY)*self.rotatationTouchSpeed;
      
      touchOnePrevious = e.touches[1];
    }
  }
  
  var touchZeroPrevious;
  var touchOnePrevious;
  
  var timePrevious = Date.now();
  var time = 0;
  
  // Working variables for camLoop
  var translateZ = 0;
  var rotateX = 0, rotateGlobalZ = 0;
  
  var camLoop = function() {
    time = Date.now() - timePrevious;
    timePrevious += time;
    
    if(inputs[self.keyForward    ]) translateZ       -= time*self.panKeySpeed;
    if(inputs[self.keyBackward   ]) translateZ       += time*self.panKeySpeed;
    if(inputs[self.keyTurnUp     ]) rotateX          += time*self.rotationKeySpeed;
    if(inputs[self.keyTurnDown   ]) rotateX          -= time*self.rotationKeySpeed;
    if(inputs[self.keyTurnLeft   ]) rotateGlobalZ    += time*self.rotationKeySpeed;
    if(inputs[self.keyTurnRight  ]) rotateGlobalZ    -= time*self.rotationKeySpeed;
    
    if(translateZ) {
      camera.matrix.translateZ(translateZ);
    }
    
    if(rotateX) {
      var r = new THREE.Vector3().setFromMatrixPosition(camera.matrix).distanceTo(new THREE.Vector3(0, 0, 0));
      camera.matrix.translateZ(-r);
      camera.matrix.multiply(new THREE.Matrix4().makeRotationX(rotateX));
      camera.matrix.translateZ(r);
    }
    
    if(rotateGlobalZ) {
      var r = new THREE.Vector3().setFromMatrixPosition(camera.matrix).distanceTo(new THREE.Vector3(0, 0, 0));
      camera.matrix.translateZ(-r);
      camera.matrix.multiplyMatrices(new THREE.Matrix4().makeRotationZ(rotateGlobalZ), camera.matrix);
      camera.matrix.translateZ(r);
    }
    
    if(translateZ || rotateX || rotateGlobalZ) {
      changed = true;
    }
    
    camera.matrixWorldNeedsUpdate = true;
    
    requestAnimationFrame(camLoop);
    
    translateZ = rotateX = rotateGlobalZ = 0;
  }
  camLoop();
}
with({p: THREE.Densaugeo.WaveControls.prototype}) {
  p.panKeySpeed = 0.0025;
  p.rotationKeySpeed = 0.002;
  p.rotationMouseSpeed = 0.02;
  p.rotatationTouchSpeed = 0.01;
  p.dollySpeed = 0.2;
  p.keyTurnLeft = 37; // Left arrow
  p.keyTurnRight = 39; // Right arrow
  p.keyTurnUp = 38; // Up arrow
  p.keyTurnDown = 40; // Down arrow
  p.keyForward = 33; // Page up
  p.keyBackward = 34; // Page down
}
