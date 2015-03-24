/**
 * Dependencies: THREE.js
 */

if(window.THREE == null) {
  console.error('THREE.Densaugeo.js depends on THREE.js');
}

THREE.Densaugeo = {}

// Chainable builder for THREE.Object3D stuff
// Forces matrix use, because THREE.js .position and similar properties are flaky
// Converts arrays to THREE.Vector3 or THREE.Euler for position, euler, and scale properties
// f3D(THREE.Object3D, {position: [1, 2, 3]}, [child_one, child_two])
// 'type' argument may be either a constructor or a clonable object
THREE.Densaugeo.forgeObject3D = function forgeObject3D(type, properties, children) {
  var o3D = typeof type === 'function' ? new type() : type;
  
  if(properties.position instanceof Array) {
    properties.position = new THREE.Vector3().fromArray(properties.position);
  }
  
  if(properties.euler instanceof Array) {
    properties.euler = new THREE.Euler().fromArray(properties.euler);
  }
  
  if(properties.scale instanceof Array) {
    properties.scale = new THREE.Vector3().fromArray(properties.scale);
  }
  
  for(var i in properties) {
    o3D[i] = properties[i];
  }
  
  o3D.matrixAutoUpdate = false;
  
  if(properties.matrix instanceof THREE.Matrix4) {
    o3D.matrix = properties.matrix;
  }
  else {
    if(properties.euler && properties.quaternion == null) {
      properties.quaternion = new THREE.Quaternion().setFromEuler(properties.euler);
    }
    
    // Since o3D's relevant properties are already overwritten from the properties argument, they can be used on their own
    o3D.matrix.compose(properties.position || o3D.position, properties.quaternion || o3D.quaternion, properties.scale || o3D.scale);
  }
  
  o3D.matrixWorldNeedsUpdate = true;
  
  if(children) {
    for(var i = 0, endi = children.length; i < endi; ++i) {
      o3D.add(children[i]);
    }
  }
  
  return o3D;
}

// forgeObject3D specialized for making meshes. Expects geometry and material to be prepared in advence
// forgeMesh.geometries.yourModel = someGeometry;
// forgeMesh.materials.yourModel = someMaterial;
// forgeMesh('yourModel', {position: [-5, 0, 5]}, [child_one, child_two]);
THREE.Densaugeo.forgeMesh = function forgeMesh(modelName, properties, children) {
  if(THREE.Densaugeo.forgeMesh.geometries[modelName] == null) {
    throw new Error('No geometry in THREE.Densaugeo.forgeMesh.geometries for model name "' + modelName + '".');
  }
  if(THREE.Densaugeo.forgeMesh.materials [modelName] == null) {
    throw new Error('No material in THREE.Densaugeo.forgeMesh.materials for model name "'  + modelName + '".');
  }
  
  properties.geometry = THREE.Densaugeo.forgeMesh.geometries[modelName];
  properties.material = THREE.Densaugeo.forgeMesh.materials [modelName];
  
  return THREE.Densaugeo.forgeObject3D(THREE.Mesh, properties, children);
}
THREE.Densaugeo.forgeMesh.geometries = {};
THREE.Densaugeo.forgeMesh.materials  = {};

// meshMaker = new MeshMaker();
// meshMaker.mesh = new THREE.Mesh(someGeometry, someMaterial);
// meshMaker.addTo = THREE.Scene or THREE.Object3D;
// meshMaker.make({position: THREE.Vector3, euler: THREE.Euler, scale: THREE.Vector3});
//
// Mesh is the mesh to be placed, addTo is an object to add it to. Properties may be passed to the new mesh, either as named arguments
// or by setting them as properties of meshMaker.meshProperties. Properties given as named arguments take precedence over those on
// meshMaker.meshProperties. Properties passed from meshMaker.meshProperties will have their .clone() functiosn called if available;
// properties passed as named arguments are always passed directly
//
// Setting forceMatrix switches off THREE.js matrix auto-updates and causes MeshMaker
// to build matrices from position, rotation, and scale
//
// Before use, meshMaker.mesh must be defined. addTo is optional. Then, meshes may be
// instantiated in one of two ways (or a combination of these):
//
// Using arguments:
// meshMaker.make({position: new THREE.Vector3(0, 0, 0), euler: new THREE.Euler(0, 0, 0), foo: 'bar'});
//
// Using defaults:
// meshMaker.meshProperties.position = new THREE.Vector3(0, 0, 0);
// meshMaker.meshProperties.euler = new THREE.Euler(0, 0, 0);
// meshMaker.meshProperties.foo = 'bar';
// meshMaker.make();
THREE.Densaugeo.MeshMaker = function() {
  this.meshProperties = {};
  
  this.mesh = undefined;
  
  this.addTo = undefined;
  
  this.forceMatrix = false;
}

THREE.Densaugeo.MeshMaker.prototype.make = function(args) {
  // To make a mesh, you must have a mesh. This mesh is assumed to be a THREE.Mesh
  var mesh = this.mesh.clone();
  if(!(mesh instanceof THREE.Mesh)) throw new Error('THREE.Densaugeo.MeshMaker.mesh must be a THREE.Mesh');
  
  // I don't make any assumptions about what addTo points at.  This will try to run anything with an 'add' function you want to give it
  if(this.addTo && typeof this.addTo.add === 'function') this.addTo.add(mesh);
  
  // Given arguments take precedence, followed by the MeshMaker's meshProperties, and then whatever the mesh already has
  // These should behave as expected on their own, with the exception of MeshMaker's meshProperties, which need to be cloned for separation
  for(var i in this.meshProperties) {
    if(args[i] === undefined) {
      if(typeof this.meshProperties[i].clone === 'function') {
        mesh[i] = this.meshProperties[i].clone();
      }
      else {
        mesh[i] = this.meshProperties[i];
      }
    }
  }
  for(var i in args) {
    mesh[i] = args[i];
  }
  
  if(this.forceMatrix) {
    mesh.matrixAutoUpdate = false;
    
    var matrix = args.matrix || this.meshProperties.matrix;
    
    if(matrix instanceof THREE.Matrix4) {
      mesh.matrix = matrix;
    }
    // If matrix is not specified, then recompose the matrix from components
    else {
      var position = args.position     || this.meshProperties.position;
      var quaternion = args.quaternion || this.meshProperties.quaternion;
      var euler = args.euler           || this.meshProperties.euler;
      var scale = args.scale           || this.meshProperties.scale;
      
      // If quaternion is not specified but Euler angle is, build quaternion from Euler angle
      if(quaternion == null) {
        if(euler != null) {
          quaternion = (new THREE.Quaternion).setFromEuler(euler);
        }
      }
      
      mesh.matrix.compose(position || mesh.position, quaternion || mesh.quaternion, scale || mesh.scale);
    }
    
    mesh.matrixWorldNeedsUpdate = true;
  }
  
  return mesh;
}

// A JSONLoader with a LoadAll method. LoadAll loads from an array of urls, then call the callback
// with objects full of geometries and materials stored under their corresponding urls
//
// new THREE.Densaugeo.JSONMultiLoader.loadall(['url1', 'url2'], function(geometries, materialses) {
//   geometries.url1;        // Returns geometry for url1
//   geometries['url2']      // Returns geometry for url2
// }, '/myTextrurePath/');
THREE.Densaugeo.JSONMultiLoader = function(showStatus) {
  THREE.JSONLoader.call(this, showStatus);
}

THREE.Densaugeo.JSONMultiLoader.prototype = Object.create(THREE.JSONLoader.prototype);

THREE.Densaugeo.JSONMultiLoader.prototype.loadAll = function(urls, callback, texturePath) {
  var count = urls.length;
  var geometries = {};
  var materialses = {};
  
  for(var i = 0; i < urls.length; ++i) with({i: i}) {
    try {
      this.load(urls[i], function(geometry, materials) {
        geometries[urls[i]] = geometry;
        materialses[urls[i]] = materials;
        
        --count;
        if(count === 0) callback(geometries, materialses);
      }, texturePath);
    }
    catch(error) {
      console.warn(error);
      --count;
    }
  }
  
  if(count === 0) callback(geometries, materialses);
}

// Helper function to conveniently flat-shade all sub-materials in a face material. Chainable
THREE.MeshFaceMaterial.prototype.makeFlat = function() {
  for(var i = 0, endi = this.materials.length; i < endi; ++i) {
    this.materials[i].shading = THREE.FlatShading;
  }
  
  return this;
}

// THREE.Matrix4 manipulators. Most of these used to be in THREE, but were removed
// (probably to reduce file size)
THREE.Matrix4.prototype.translateX = function(x) {var a = this.elements; a[12] += a[0]*x; a[13] += a[1]*x; a[14] += a[ 2]*x; return this}
THREE.Matrix4.prototype.translateY = function(y) {var a = this.elements; a[12] += a[4]*y; a[13] += a[5]*y; a[14] += a[ 6]*y; return this}
THREE.Matrix4.prototype.translateZ = function(z) {var a = this.elements; a[12] += a[8]*z; a[13] += a[9]*z; a[14] += a[10]*z; return this}

THREE.Matrix4.prototype.rotateX = function(angle) {
  var te = this.elements;
  
  var m12 = te[4];
  var m22 = te[5];
  var m32 = te[6];
  var m42 = te[7];
  var m13 = te[8];
  var m23 = te[9];
  var m33 = te[10];
  var m43 = te[11];
  
  var c = Math.cos( angle );
  var s = Math.sin( angle );
  
  te[4] = c * m12 + s * m13;
  te[5] = c * m22 + s * m23;
  te[6] = c * m32 + s * m33;
  te[7] = c * m42 + s * m43;
  
  te[8] = c * m13 - s * m12;
  te[9] = c * m23 - s * m22;
  te[10] = c * m33 - s * m32;
  te[11] = c * m43 - s * m42;
  
  return this;
}

THREE.Matrix4.prototype.rotateY = function(angle) {
  var te = this.elements;
  
  var m11 = te[0];
  var m21 = te[1];
  var m31 = te[2];
  var m41 = te[3];
  var m13 = te[8];
  var m23 = te[9];
  var m33 = te[10];
  var m43 = te[11];
  
  var c = Math.cos( angle );
  var s = Math.sin( angle );
  
  te[0] = c * m11 - s * m13;
  te[1] = c * m21 - s * m23;
  te[2] = c * m31 - s * m33;
  te[3] = c * m41 - s * m43;
  
  te[8] = c * m13 + s * m11;
  te[9] = c * m23 + s * m21;
  te[10] = c * m33 + s * m31;
  te[11] = c * m43 + s * m41;
  
  return this;
}

THREE.Matrix4.prototype.rotateZ = function (angle) {
  var te = this.elements;
  
  var m11 = te[0];
  var m21 = te[1];
  var m31 = te[2];
  var m41 = te[3];
  var m12 = te[4];
  var m22 = te[5];
  var m32 = te[6];
  var m42 = te[7];
  
  var c = Math.cos( angle );
  var s = Math.sin( angle );
  
  te[0] = c * m11 + s * m12;
  te[1] = c * m21 + s * m22;
  te[2] = c * m31 + s * m32;
  te[3] = c * m41 + s * m42;
  
  te[4] = c * m12 - s * m11;
  te[5] = c * m22 - s * m21;
  te[6] = c * m32 - s * m31;
  te[7] = c * m42 - s * m41;
  
  return this;
}

THREE.Matrix4.prototype.equals = function(m) {
  var r = true, a = this.elements, b = m.elements;
  
  for(var i = 0, endi = 16; i < endi; ++i) {
    r = r && a[i] === b[i];
  }
  
  return r;
}

THREE.Matrix4.prototype.forge = function(a) {
  var tx = a.tx || 0, ty = a.ty || 0, tz = a.tz || 0;
  var θx = a.rx || 0, θy = a.ry || 0, θz = a.rz || 0;
  var sx = a.sx || 1, sy = a.sy || 1, sz = a.sz || 1;
  
  var e = this.elements;
  var sin = Math.sin;
  var cos = Math.cos;
  
  e[0] = sx*cos(θy)*cos(θz);
  e[1] = sx*sin(θx)*sin(θy)*cos(θz) + sx*cos(θx)*sin(θz);
  e[2] = sx*sin(θx)*sin(θz) - sx*cos(θx)*sin(θy)*cos(θz);
  e[3] = 0;
  
  e[4] = -sy*cos(θy)*sin(θz);
  e[5] = sy*cos(θx)*cos(θz) - sy*sin(θx)*sin(θy)*sin(θz);
  e[6] = sy*sin(θx)*cos(θz) + sy*cos(θx)*sin(θy)*sin(θz);
  e[7] = 0;
  
  e[8] = sz*sin(θy);
  e[9] = -sz*sin(θx)*cos(θy);
  e[10] = sz*cos(θx)*cos(θy);
  e[11] = 0;
  
  e[12] = tx;
  e[13] = ty;
  e[14] = tz;
  e[15] = 1;
  
  return this;
}

// panKeySpeed           - Units/ms
// panMouseSpeed         - Units/px
// rotationKeySpeed      - Radians/ms
// rotationMouseSpeed    - Radians/px
// rotationAccelSpeed    - Radians/radian
// dollySpeed            - Units/click
// touchThrottleSpeed    - Units/ms per px displaced
// joystickPanSpeed      - Units/ms per fraction displaced
// joystickRotSpeed      - Radians/ms per fraction displaced
// joystickThrottleSpeed - Units/ms per fraction displaced

THREE.Densaugeo.FreeControls = function(camera, domElement, options) {
  var self = this;
  
  if(domElement == null) {
    throw new TypeError('Error in THREE.Densaugeo.FreeControls constructor: domElement must be supplied');
  }
  
  for(var i in options) {
    this[i] = options[i];
  }
  
  camera.matrixAutoUpdate = false;
  camera.rotation.order = 'ZYX';
  
  var inputs = {}; // This particular ; really is necessary
  
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
    if(e.shiftKey) {
      var requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock || domElement.webkitRequestPointerLock;
      requestPointerLock.call(domElement);
    } else if(e.which === 1) {
      domElement.addEventListener('mousemove', mousePanHandler);
    } else if(e.which === 3) {
      domElement.addEventListener('mousemove', mouseRotHandler);
    }
  });
  
  domElement.addEventListener('mouseup', function() {
    domElement.removeEventListener('mousemove', mousePanHandler);
    domElement.removeEventListener('mousemove', mouseRotHandler);
  });
  
  domElement.addEventListener('mouseleave', function() {
    domElement.removeEventListener('mousemove', mousePanHandler);
    domElement.removeEventListener('mousemove', mouseRotHandler);
  });
  
  var pointerLockHandler = function(e) {
    var pointerLockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
    
    if(pointerLockElement === domElement) {
      document.addEventListener('mousemove', mouseRotHandler);
    } else {
      document.removeEventListener('mousemove', mouseRotHandler);
    }
  }
  
  document.addEventListener('pointerlockchange'      , pointerLockHandler);
  document.addEventListener('mozpointerlockchange'   , pointerLockHandler);
  document.addEventListener('webkitpointerlockchange', pointerLockHandler);
  
  var mousePanHandler = function(e) {
    translateX += (e.movementX || e.mozMovementX || e.webkitMovementX || 0)*self.panMouseSpeed;
    translateY -= (e.movementY || e.mozMovementY || e.webkitMovementY || 0)*self.panMouseSpeed;
  }
  
  var mouseRotHandler = function(e) {
    rotateGlobalZ -= (e.movementX || e.mozMovementX || e.webkitMovementX || 0)*self.rotationMouseSpeed;
    rotateX       -= (e.movementY || e.mozMovementY || e.webkitMovementY || 0)*self.rotationMouseSpeed;
  }
  
  // Touchmove events do not work when directly added, they have to be added by a touchstart listener
  // I think this has to do with the default touch action being scrolling
  domElement.addEventListener('touchstart', function(e) {
    e.preventDefault();
    
    if(e.touches.length === 1) {
      accelActive = true;
      
      var rect = domElement.getBoundingClientRect();
      var lateralFraction = (e.touches[0].clientX - rect.left)/rect.width;
      
      if(lateralFraction < 0.9) {
        touchZeroPrevious = e.touches[0];
        domElement.addEventListener('touchmove', TouchHandler);
      } else {
        throttleZero = e.touches[0].clientY;
        domElement.addEventListener('touchmove', touchThrottleHandler);
      }
    } else if(e.touches.length === 2) {
      touchOnePrevious = e.touches[1];
    }
  });
  
  domElement.addEventListener('touchend', function(e) {
    if(e.touches.length === 0) {
      domElement.removeEventListener('touchmove', TouchHandler);
      domElement.removeEventListener('touchmove', touchThrottleHandler);
      touchThrottle = rotationRateAlpha = rotationRateBeta = rotationRateGamma = 0;
      accelActive = false;
    }
  });
  
  var TouchHandler = function(e) {
    e.preventDefault(); // Should be called at least on every touchmove event
    
    translateX += (e.touches[0].clientX - touchZeroPrevious.clientX)*self.panTouchSpeed;
    translateY -= (e.touches[0].clientY - touchZeroPrevious.clientY)*self.panTouchSpeed;
    
    touchZeroPrevious = e.touches[0];
    
    if(e.touches.length === 2) {
      rotateX       -= (e.touches[1].clientY - touchOnePrevious.clientY)*self.rotatationTouchSpeed;
      rotateGlobalZ -= (e.touches[1].clientX - touchOnePrevious.clientX)*self.rotatationTouchSpeed;
      
      touchOnePrevious = e.touches[1];
    }
  }
  
  var touchThrottleHandler = function(e) {
    e.preventDefault(); // Should be called at least on every touchmove event
    
    touchThrottle = (e.touches[0].clientY - throttleZero)*self.touchThrottleSpeed;
    
    if(e.touches.length === 2) {
      translateX += (e.touches[1].clientX - touchOnePrevious.clientX)*self.panTouchSpeed;
      translateY -= (e.touches[1].clientY - touchOnePrevious.clientY)*self.panTouchSpeed;
      
      touchOnePrevious = e.touches[1];
    }
  }
  
  var rotationRateConversion = 0.000017453292519943296;
  
  // Browser detection shim for Chome, since they use different units for DeviceRotationRate without
  // providing any documentation or other way of detecting what units are being used
  if(window.chrome) {
    rotationRateConversion = 0.001;
  }
  
  var accelHandler = function(e) {
    if(accelActive) {
      // Constant = Math.PI/180/1000
      rotationRateAlpha = e.rotationRate.alpha*rotationRateConversion*self.rotationAccelSpeed;
      rotationRateBeta  = e.rotationRate.beta *rotationRateConversion*self.rotationAccelSpeed;
      rotationRateGamma = e.rotationRate.gamma*rotationRateConversion*self.rotationAccelSpeed;
    }
  }
  
  // Attach devicemotion listener on startup because attaching it during a touchstart event is horribly buggy in FF
  window.addEventListener('devicemotion', accelHandler);
  
  var gamepads = [];
  
  window.addEventListener('gamepadconnected', function(e) {
    gamepads.push(e.gamepad);
  });
  
  window.addEventListener('gamepaddisconnected', function(e) {
    if(gamepads.indexOf(e.gamepad) > -1) {
      gamepads.splice(gamepads.indexOf(e.gamepad), 1);
    }
  });
  
  var touchZeroPrevious;
  var touchOnePrevious;
  var throttleZero, touchThrottle = 0;
  var rotationRateAlpha = 0, rotationRateBeta = 0, rotationRateGamma = 0, accelActive = false;
  
  var timePrevious = Date.now();
  var time = 0;
  
  // Working variables for camLoop
  var translateX = 0, translateY = 0, translateZ = 0, translateGlobalZ = 0;
  var rotateX = 0, rotateY = 0, rotateZ = 0, rotateGlobalZ = 0, axes;
  
  var camLoop = function() {
    time = Date.now() - timePrevious;
    timePrevious += time;
    
    if(inputs[self.keyStrafeLeft ]) translateX       -= time*self.panKeySpeed;
    if(inputs[self.keyStrafeRight]) translateX       += time*self.panKeySpeed;
    if(inputs[self.keyForward    ]) translateZ       -= time*self.panKeySpeed;
    if(inputs[self.keyBackward   ]) translateZ       += time*self.panKeySpeed;
    if(inputs[self.keyStrafeUp   ]) translateGlobalZ += time*self.panKeySpeed;
    if(inputs[self.keyStrafeDown ]) translateGlobalZ -= time*self.panKeySpeed;
    if(inputs[self.keyTurnUp     ]) rotateX          += time*self.rotationKeySpeed;
    if(inputs[self.keyTurnDown   ]) rotateX          -= time*self.rotationKeySpeed;
    if(inputs[self.keyTurnLeft   ]) rotateGlobalZ    += time*self.rotationKeySpeed;
    if(inputs[self.keyTurnRight  ]) rotateGlobalZ    -= time*self.rotationKeySpeed;
    
    for(var i = 0, endi = gamepads.length; i < endi; ++i) {
      axes = gamepads[i].axes;
      
      if(Math.abs(axes[0]) > 0.05) translateX    += axes[0]*time*self.joystickPanSpeed;
      if(Math.abs(axes[1]) > 0.05) translateY    -= axes[1]*time*self.joystickPanSpeed;
      if(Math.abs(axes[3]) > 0.05) rotateGlobalZ -= axes[3]*time*self.joystickRotSpeed;
      if(Math.abs(axes[4]) > 0.05) rotateX       -= axes[4]*time*self.joystickRotSpeed;
      
      if(axes[2] > -0.95 || axes[5] > -0.95) translateZ -= (axes[5] - axes[2])*time*self.joystickThrottleSpeed;
    }
    
    if(translateX) {
      camera.matrix.translateX(translateX);
    }
    
    if(translateY) {
      camera.matrix.translateY(translateY);
    }
    
    if(translateZ || touchThrottle) {
      camera.matrix.translateZ(translateZ + time*touchThrottle);
    }
    
    if(translateGlobalZ) {
      camera.matrix.elements[14] += translateGlobalZ;
    }
    
    if(rotateX || rotationRateBeta) {
      camera.matrix.multiply(new THREE.Matrix4().makeRotationX(rotateX - time*rotationRateBeta));
    }
    
    if(rotateY || rotationRateAlpha) {
      camera.matrix.multiply(new THREE.Matrix4().makeRotationY(rotateY + time*rotationRateAlpha));
    }
    
    if(rotateZ || rotationRateGamma) {
      camera.matrix.multiply(new THREE.Matrix4().makeRotationZ(rotateZ + time*rotationRateGamma));
    }
    
    if(rotateGlobalZ) {
      // Global Z rotation retains global position
      var position = THREE.Vector3.prototype.setFromMatrixPosition(camera.matrix);
      camera.matrix.multiplyMatrices(new THREE.Matrix4().makeRotationZ(rotateGlobalZ + time*rotationRateAlpha), camera.matrix);
      camera.matrix.setPosition(position);
    }
    
    camera.matrixWorldNeedsUpdate = true;
    
    requestAnimationFrame(camLoop);
    
    translateX = translateY = translateZ = translateGlobalZ = rotateX = rotateY = rotateZ = rotateGlobalZ = 0;
  }
  camLoop();
}
with({p: THREE.Densaugeo.FreeControls.prototype}) {
  p.panKeySpeed = 0.01;
  p.rotationKeySpeed = 0.001;
  p.panMouseSpeed = 0.1;
  p.rotationMouseSpeed = 0.002;
  p.panTouchSpeed = 0.1;
  p.rotatationTouchSpeed = 0.002;
  p.rotationAccelSpeed = 1;
  p.dollySpeed = 1;
  p.touchThrottleSpeed = 0.0005;
  p.joystickPanSpeed = 0.05;
  p.joystickRotSpeed = 0.003;
  p.joystickThrottleSpeed = 0.05;
  p.keyTurnLeft = 37; // Left arrow
  p.keyTurnRight = 39; // Right arrow
  p.keyTurnUp = 38; // Up arrow
  p.keyTurnDown = 40; // Down arrow
  p.keyStrafeLeft = 65; // A
  p.keyStrafeRight = 68; // D
  p.keyStrafeUp = 69; // E
  p.keyStrafeDown = 67; // C
  p.keyForward = 87; // W
  p.keyBackward = 83; // S
}

/**
 * @module THREE.Densaugeo.IntObject inherits THREE.Object3D
 * @description Clickable object for three.js scenes
 * 
 * @example var clickable = new THREE.Densaugeo.IntObject({name: 'Clickable'});
 * @example clickable.select.forge({sx: 4, sy: 4});
 * @example clickable.controls.Click = function() {alert('You clicked me!')}
 */
THREE.Densaugeo.IntObject = function IntObject(options) {
  THREE.Object3D.call(this, options);
  
  // @prop Object controls -- An index of the functions to be controlled by a UI element
  this.controls = {};
  
  // @prop THREE.Matrix4 select -- Matrix transform for visual indication object added by THREE.Densaugeo.Picker
  // @option THREE.Matrix4 select -- Sets .indicatorMatrix
  this.select = options && options.select || new THREE.Matrix4();
  
  // @option String name -- Sets .name inherited from THREE.Object3D
  if(options && options.name) {
    this.name = options.name;
  }
}
THREE.Densaugeo.IntObject.prototype = Object.create(THREE.Object3D.prototype);
THREE.Densaugeo.IntObject.prototype.constructor = THREE.Densaugeo.IntObject;

/**
 * @module THREE.Densaugeo.Picker inherites EventEmitter
 * @description Allows selecting objects in a three.js scene by clicking on meshes
 * 
 * @example var picker = new THREE.Densaugeo.Picker();
 * @example someRenderer.domElement.addEventListener('click', picker.clickHandler);
 * @example picker.intObjects.push(someClickableObject);
 * @example picker.on('select', function(e) {console.log('Selected: ');console.log(e.target)});
 */
THREE.Densaugeo.Picker = function Picker(options) {
  EventEmitter.call(this, options);
  
  var self = this;
  
  // @prop THREE.WebGLRenderer renderer -- May be an empty object if not set
  this.renderer = {};
  
  // @prop [THREE.Densaugeo.IntObject] intObjects -- Objects which can be picked (interacted with)
  this.intObjects = [];
  
  // @prop THREE.Densaugeo.IntObject currentlySelected -- As the name suggests (undefined if no object is selected)
  this.currentlySelected = undefined;
  
  // @prop THREE.Mesh indicator -- three.js object appended to selection to provide a visual cue
  // @option THREE.Mesh indicator -- Sets .indicator
  this.indicator = options && options.indicator || new THREE.Mesh(new THREE.RingGeometry(1.1, 1.2, 16), new THREE.MeshBasicMaterial({color: 0x00FFFF, side: THREE.DoubleSide}));
  this.indicator.matrixAutoUpdate = false;
  
  // @method undefined unselect() -- Unselects current object
  // @event unselect {} -- Fired after unselecting
  this.unselect = function() {
    if(self.currentlySelected) {
      self.currentlySelected.remove(self.indicator);
    }
    
    self.currentlySelected = undefined;
    
    self.emit('unselect');
  }
  
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  
  // @method undefined clickHandler(e) -- Handles click events; scans a three.js scene
  // @event select {THREE.Densaugeo.IntObject target} -- Emitted when a target's child mesh has been clicked
  this.clickHandler = function(e) {
    e.preventDefault();
    
    var boundingRect = self.renderer.domElement.getBoundingClientRect();
    
    mouse.x = (e.clientX - boundingRect.x)/boundingRect.width*2 - 1;
    mouse.y = (boundingRect.y - e.clientY)/boundingRect.height*2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    var intersections = raycaster.intersectObjects(self.intObjects, true);
    
    if(intersections.length > 0) {
      var target = intersections[0].object;
      
      while(!(target instanceof THREE.Densaugeo.IntObject)) {
        target = target.parent;
      }
      
      if(self.currentlySelected) {
        self.currentlySelected.remove(self.indicator);
      }
      
      self.currentlySelected = target;
      self.indicator.matrix.copy(target.select);
      target.add(self.indicator);
      
      self.emit('select', {target: target});
    }
  }
  
  // @method undefined touchHandler(e) -- Maps touch events onto click events. Uses touchstart's first detected touch
  this.touchHandler = function(e) {
    if(e.touches.length > 0) {
      e.clientX = e.touches[0].clientX;
      e.clientY = e.touches[0].clientY;
      
      self.clickHandler(e);
    }
  }
  
  // @method undefined setRenderer() -- Attach a three.js renderer
  this.setRenderer = function(renderer) {
    self.renderer = renderer;
    
    renderer.domElement.addEventListener('click', self.clickHandler);
    renderer.domElement.addEventListener('touchstart', self.touchHandler);
  }
}
THREE.Densaugeo.Picker.prototype = Object.create(EventEmitter.prototype);
THREE.Densaugeo.Picker.prototype.constructor = THREE.Densaugeo.Picker;

/**
 * @module THREE.Raycaster
 * @description Bug fix for camera matrix handling. No, upstream won't accept the patch, because "users shouldn't use matrix transforms" WTF?!!!!
 */
// @method proto undefined setFromCamera(THREE.Vector2 coords, THREE.Camera camera) -- Responds correctly to cameras with mutated matrices
THREE.Raycaster.prototype.setFromCamera = function ( coords, camera ) {
  // camera is assumed _not_ to be a child of a transformed object
  if ( camera instanceof THREE.PerspectiveCamera ) {
    this.ray.origin.setFromMatrixPosition(camera.matrix);
    this.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( this.ray.origin ).normalize();
  } else if ( camera instanceof THREE.OrthographicCamera ) {
    this.ray.origin.set( coords.x, coords.y, - 1 ).unproject( camera );
    this.ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
  } else {
    console.error( 'THREE.Raycaster: Unsupported camera type.' );
  }
}

THREE.Vector3.prototype.fromColor = function(/*THREE.Color*/ a) {
  this.x = a.r;
  this.y = a.g;
  this.z = a.b;
  
  return this;
}

// Expects string as comma-separated numbers
THREE.Vector3.prototype.fromString = function(/*string*/ a) {
  var b = a.split(',');
  
  this.x = Number(b[0]);
  this.y = Number(b[1]);
  this.z = Number(b[2]);
  
  return this;
}

THREE.Vector3.prototype.toString = function() {
  return this.x + ', ' + this.y + ', ' + this.z;
}

THREE.Color.prototype.fromVector3 = function(/*THREE.Vector3*/ a) {
  this.r = a.x;
  this.g = a.y;
  this.b = a.z;
  
  return this;
}

// Expects string in hex format
THREE.Color.prototype.fromString = function(/*string*/ a) {
  return this.copy(new THREE.Color(a));
}

THREE.Color.prototype.toString = function() {
  return '#' + this.getHexString().toUpperCase();
}

/**
 * A collection of shaders:
 * 
 * WaterMaterial      - Basic water material, includes transparency, phong shading, and wave-like surafce distortion
 * CoordinateMaterial - Shader for showing a coordinate grid
 * PositionMaterial   - Sets colors based on position
 * NormalMaterial     - Sets colors based on normal vector
 * PsychMaterial      - Psychedelic shader
 * 
 * To create a material:
 * var yourMaterial = new THREE.Densaugeo.WaterMaterial(options);
 * 
 * Surface distortion on the WaterMaterial and motion on the PsychMaterial require adding this line to your render loop:
 * yourMaterial.tick(seconds_since_last_loop);
 * 
 * All THREE.ShaderMaterial options are supported
 * 
 * Additional options:
 * Material                  Type          Name            Description
 * -------------------------------------------------------------------
 * All                       Number         alpha        - Opacity
 * 
 * All except WaterMaterial  Number         local        - If zero, use global coordinates. Else use local coordinates
 * 
 * WaterMaterial             THREE.Vector3  sunDirection - Direction of light for specular lighting
 *                           THREE.Color    ambient      - Phong ambient color
 *                           THREE.Color    diffuse      - Phong diffuse color
 *                           THREE.Color    specular     - Phong specular color
 * 
 * CoordinateMaterial        THREE.Vector3  showAxes     - Basically three 'boolean' numbers
 *                           THREE.Vector3  axisWeight   - Color fade distance from center of each axis to zero
 *                           THREE.Vector3  showGrid     - Basically three 'boolean' numbers
 *                           THREE.Vector3  gridWeight   - Color fade distance from center of each gridline to zero
 *                           THREE.Vector3  gridSpacing  - Spacing for each grid dimension
 * 
 * PositionMaterial          THREE.Vector3  fadeDistance - Distance along an axis to fade its associated color from one to zero
 * 
 * NormalMaterial            Number         mode         - Changes how colors are calculated, not sure how to describe
 * 
 * PsychMaterial             THREE.Vector3  wavelength   - Distance along each axes between its associated color peaks
 *                           THREE.Vector3  frequency    - Frequency of color peaks as they travel along each axis
 * 
 * If you change any of the additional options after instantiation, changes will take effect after calling .updateUniforms()
 */
THREE.Densaugeo.WaterMaterial = function(/*Object*/ options) {
  THREE.ShaderMaterial.call(this);
  
  this.type = 'WaterMaterial';
  
  this.vertexShader   = THREE.ShaderLib.densWater.vertexShader;
  this.fragmentShader = THREE.ShaderLib.densWater.fragmentShader;
  this.transparent = true;
  this.alpha = 0.8
  this.sunDirection = new THREE.Vector3(4, 4, 10);
  this.ambient  = new THREE.Color(0x050A14);
  this.diffuse  = new THREE.Color(0x193366);
  this.specular = new THREE.Color(0x193366);
  
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.densWater.uniforms);
  this.uniforms.normalSampler.value = THREE.ImageUtils.loadTexture('lib/waternormals.jpg');
  this.uniforms.normalSampler.value.wrapS = this.uniforms.normalSampler.value.wrapT = THREE.RepeatWrapping;
  
  this.setValues(options);
  this.updateUniforms();
}
THREE.Densaugeo.WaterMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.Densaugeo.WaterMaterial.prototype.constructor = THREE.Densaugeo.WaterMaterial;

THREE.Densaugeo.WaterMaterial.prototype.updateUniforms = function(values) {
  this.uniforms.alpha.value = this.alpha;
  this.uniforms.sunDirection.value.copy(this.sunDirection).normalize();
  this.uniforms.ambient.value.fromColor(this.ambient);
  this.uniforms.diffuse.value.fromColor(this.diffuse);
  this.uniforms.specular.value.fromColor(this.specular);
}

THREE.Densaugeo.WaterMaterial.prototype.tick = function(seconds) {
  this.uniforms.time.value += seconds;
}

THREE.ShaderLib.densWater = {
  uniforms: {
    normalSampler: {type: 't', value: null},
    time         : {type: 'f', value: 0},
    alpha        : {type: 'f', value: 0},
    sunDirection: {type: 'v3', value: new THREE.Vector3()},
    ambient     : {type: 'v3', value: new THREE.Vector3()},
    diffuse     : {type: 'v3', value: new THREE.Vector3()},
    specular    : {type: 'v3', value: new THREE.Vector3()},
  },
  
  vertexShader: [
   'varying vec3 worldPosition;',
    
   'void main() {',
     'worldPosition = vec3(modelMatrix*vec4(position,1.0));',
      
     'gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);',
   '}'
  ].join('\n'),
  
  fragmentShader: [
   'uniform sampler2D normalSampler;',
   'uniform float time;',
   'uniform float alpha;',
   'uniform vec3 sunDirection;',
   'uniform vec3 ambient;',
   'uniform vec3 diffuse;',
   'uniform vec3 specular;',
    
   'varying vec3 worldPosition;',
    
   'vec4 getNoise(vec2 uv) {',
     'vec2 uv0 = (uv/51.5)+vec2(time/17.0, time/29.0);',
     'vec2 uv1 = uv/53.5-vec2(time/-19.0, time/31.0);',
     'vec2 uv2 = uv/vec2(448.5, 491.5)+vec2(time/101.0, time/97.0);',
     'vec2 uv3 = uv/vec2(495.5, 438.5)-vec2(time/109.0, time/-113.0);',
     'vec4 noise = (texture2D(normalSampler, uv0)) +',
     '(texture2D(normalSampler, uv1)) +',
     '(texture2D(normalSampler, uv2)) +',
     '(texture2D(normalSampler, uv3));',
     'return noise*0.5-1.0;',
   '}',
    
   'void main() {',
     'vec4 noise = getNoise(worldPosition.xy);',
     'vec3 surfaceNormal = normalize(noise.xyz*vec3(1.0, 1.0, 2.0));',
      
     'float diffuseMag = max(dot(sunDirection, surfaceNormal),0.0);',
      
     'vec3 eyeDirection = normalize(cameraPosition - worldPosition);',
     'vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));',
     'float direction = max(0.0, dot(eyeDirection, reflection));',
     'float specularMag = pow(direction, 100.0)*4.0;',
      
     'gl_FragColor = vec4(ambient + diffuse*diffuseMag + specular*specularMag, alpha);',
   '}'
  ].join('\n'),
}

THREE.Densaugeo.CoordinateMaterial = function(/*Object*/ options) {
  THREE.ShaderMaterial.call(this);
  
  this.type = 'CoordinateMaterial';
  
  this.vertexShader   = THREE.ShaderLib.densCoordinate.vertexShader;
  this.fragmentShader = THREE.ShaderLib.densCoordinate.fragmentShader;
  this.local = 0;
  this.alpha = 1;
  this.showAxes    = new THREE.Vector3( 1  ,  1  ,  1  );
  this.axisWeight  = new THREE.Vector3( 2  ,  2  ,  2  );
  this.showGrid    = new THREE.Vector3( 1  ,  1  ,  1  );
  this.gridWeight  = new THREE.Vector3( 0.5,  0.5,  0.5);
  this.gridSpacing = new THREE.Vector3(16  , 16  , 16  );
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.densCoordinate.uniforms);
  
  this.setValues(options);
  this.updateUniforms();
}
THREE.Densaugeo.CoordinateMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.Densaugeo.CoordinateMaterial.prototype.constructor = THREE.Densaugeo.CoordinateMaterial;

THREE.Densaugeo.CoordinateMaterial.prototype.updateUniforms = function(values) {
  this.uniforms.local.value = this.local;
  this.uniforms.alpha.value = this.alpha;
  this.uniforms.showAxes   .value.copy(this.showAxes   );
  this.uniforms.axisWeight .value.copy(this.axisWeight );
  this.uniforms.showGrid   .value.copy(this.showGrid   );
  this.uniforms.gridWeight .value.copy(this.gridWeight );
  this.uniforms.gridSpacing.value.copy(this.gridSpacing);
}

THREE.ShaderLib.densCoordinate = {
  uniforms: {
    local: {type: 'i', value: 0},
    alpha: {type: 'f', value: 0},
    showAxes   : {type: 'v3', value: new THREE.Vector3()},
    axisWeight : {type: 'v3', value: new THREE.Vector3()},
    showGrid   : {type: 'v3', value: new THREE.Vector3()},
    gridWeight : {type: 'v3', value: new THREE.Vector3()},
    gridSpacing: {type: 'v3', value: new THREE.Vector3()},
  },
  
  vertexShader: [
   'uniform int local;',
    
   'varying vec3 vPosition;',
    
   'void main() {',
     'if(local != 0) {',
       'vPosition = position;',
     '}',
     'else {',
       'vPosition = vec3(modelMatrix*vec4(position,1.0));',
     '}',
      
     'gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);',
   '}'
  ].join('\n'),
  
  fragmentShader: [
   'uniform float alpha;',
   'uniform vec3 showAxes;',
   'uniform vec3 axisWeight;',
   'uniform vec3 showGrid;',
   'uniform vec3 gridWeight;',
   'uniform vec3 gridSpacing;',
    
   'varying vec3 vPosition;',
    
   'void main() {',
     'vec3 result = vec3(0.0);',
      
     'result = showGrid - min(mod(vPosition, gridSpacing), gridSpacing - mod(vPosition, gridSpacing))/gridWeight;',
      
     'result = max(result, showAxes - abs(vPosition)/axisWeight);',
      
     'gl_FragColor = vec4(result, alpha);',
   '}'
  ].join('\n'),
}

THREE.Densaugeo.PositionMaterial = function(/*Object*/ options) {
  THREE.ShaderMaterial.call(this);
  
  this.type = 'PositionMaterial';
  
  this.vertexShader   = THREE.ShaderLib.densPosition.vertexShader;
  this.fragmentShader = THREE.ShaderLib.densPosition.fragmentShader;
  this.local = 0;
  this.alpha = 1;
  this.fadeDistance = new THREE.Vector3(64, 64, 64);
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.densPosition.uniforms);
  
  this.setValues(options);
  this.updateUniforms();
}
THREE.Densaugeo.PositionMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.Densaugeo.PositionMaterial.prototype.constructor = THREE.Densaugeo.PositionMaterial;

THREE.Densaugeo.PositionMaterial.prototype.updateUniforms = function(values) {
  this.uniforms.local.value = this.local;
  this.uniforms.alpha.value = this.alpha;
  this.uniforms.fadeDistance.value.copy(this.fadeDistance);
}

THREE.ShaderLib.densPosition = {
  uniforms: {
    local: {type: 'i', value: 0},
    alpha: {type: 'f', value: 0},
    fadeDistance: {type: 'v3', value: new THREE.Vector3()},
  },
  
  vertexShader: THREE.ShaderLib.densCoordinate.vertexShader,
  
  fragmentShader: [
   'uniform float alpha;',
   'uniform vec3 fadeDistance;',
    
   'varying vec3 vPosition;',
    
   'void main() {',
     'gl_FragColor = vec4(abs(mod(vPosition, fadeDistance)*2.0/fadeDistance - 1.0), alpha);',
   '}'
  ].join('\n'),
}

THREE.Densaugeo.NormalMaterial = function(/*Object*/ options) {
  THREE.ShaderMaterial.call(this);
  
  this.type = 'NormalMaterial';
  
  this.vertexShader   = THREE.ShaderLib.densNormal.vertexShader;
  this.fragmentShader = THREE.ShaderLib.densNormal.fragmentShader;
  this.local = 0;
  this.alpha = 1;
  this.mode  = 0;
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.densNormal.uniforms);
  
  this.setValues(options);
  this.updateUniforms();
}
THREE.Densaugeo.NormalMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.Densaugeo.NormalMaterial.prototype.constructor = THREE.Densaugeo.NormalMaterial;

THREE.Densaugeo.NormalMaterial.prototype.updateUniforms = function(values) {
  this.uniforms.local.value = this.local;
  this.uniforms.alpha.value = this.alpha;
  this.uniforms.mode .value = this.mode ;
}

THREE.ShaderLib.densNormal = {
  uniforms: {
    local: {type: 'i', value: 0},
    alpha: {type: 'f', value: 0},
    mode : {type: 'i', value: 0},
  },
  
  vertexShader: [
   'uniform int local;',
    
   'varying vec3 vNormal;',
    
   'void main() {',
     'if(local != 0) {',
       'vNormal = normal;',
     '}',
     'else {',
       'vNormal = vec3(modelMatrix*vec4(position + normal, 1.0)) - vec3(modelMatrix*vec4(position,1.0));',
     '}',
      
     'gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);',
   '}'
  ].join('\n'),
  
  fragmentShader: [
   'uniform float alpha;',
   'uniform int mode;',
    
   'varying vec3 vNormal;',
    
   'void main() {',
     'if(mode == 0) {',
       'gl_FragColor = vec4(abs(vNormal), alpha);',
     '}',
     'else {',
       'gl_FragColor = vec4((vNormal + 1.0)/2.0, alpha);',
     '}',
   '}'
  ].join('\n'),
}

THREE.Densaugeo.PsychMaterial = function(/*Object*/ options) {
  THREE.ShaderMaterial.call(this);
  
  this.type = 'PsychMaterial';
  
  this.vertexShader   = THREE.ShaderLib.densPsych.vertexShader;
  this.fragmentShader = THREE.ShaderLib.densPsych.fragmentShader;
  this.local = 0;
  this.alpha = 1;
  this.wavelength = new THREE.Vector3(8    , 4   , 2  );
  this.frequency  = new THREE.Vector3(0.125, 0.25, 0.5);
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.densPsych.uniforms);
  
  this.setValues(options);
  this.updateUniforms();
}
THREE.Densaugeo.PsychMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.Densaugeo.PsychMaterial.prototype.constructor = THREE.Densaugeo.PsychMaterial;

THREE.Densaugeo.PsychMaterial.prototype.updateUniforms = function(values) {
  this.uniforms.local.value = this.local;
  this.uniforms.alpha.value = this.alpha;
  this.uniforms.wavelength.value.copy(this.wavelength);
  this.uniforms.frequency .value.copy(this.frequency );
}

THREE.Densaugeo.PsychMaterial.prototype.tick = function(seconds) {
  this.uniforms.time.value += seconds;
}

THREE.ShaderLib.densPsych = {
  uniforms: {
    local: {type: 'i', value: 0},
    time : {type: 'f', value: 0},
    alpha: {type: 'f', value: 0},
    wavelength: {type: 'v3', value: new THREE.Vector3()},
    frequency : {type: 'v3', value: new THREE.Vector3()},
  },
  
  vertexShader: THREE.ShaderLib.densCoordinate.vertexShader,
  
  fragmentShader: [
   'uniform float time;',
   'uniform float alpha;',
   'uniform vec3 wavelength;',
   'uniform vec3 frequency;',
    
   'varying vec3 vPosition;',
    
   'void main() {',
     'gl_FragColor = vec4(sin(vPosition*2.0*3.14159/wavelength + time*2.0*3.14159*frequency), alpha);',
   '}'
  ].join('\n'),
}
