/**
 * @depends three.js
 * @depends three.Densaugeo.js
 * 
 * @description Volume ray tracing system. Visualizes scalar fields and includes a texture generator
 */

/**
 * @module THREE.Densaugeo.VRTVolume inherits THREE.Mesh
 * @description Mesh for volume ray tracing
 * 
 * @example var volume = new THREE.Densaugeo.VRTVolume({
 * @example . intensity: 10,
 * @example . dataTexture: new THREE.Densaugeo.VRTTexture({
 * @example .   resolution: 64,
 * @example .   formula: function(x, y, z) {return 1},
 * @example . }),
 * @example . resolution: 64,
 * @example });
 */
THREE.Densaugeo.VRTVolume = function(options) {
  THREE.Mesh.call(this);
  if(typeof options === 'undefined') {
    options = {};
  }
  
  // @prop String type -- 'VRTVolume'
  this.type = 'VRTVolume';
  
  // @prop THREE.BoxGeometry geometry -- Uses a unit cube, centered on its origin
  this.geometry = new THREE.BoxGeometry(1, 1, 1);
  
  // @prop THREE.Densaugeo.VRTMaterial material -- Uses custom shader material
  this.material = new THREE.Densaugeo.VRTMaterial();
  
  // @prop THREE.Densaugeo.VRTTexture dataTexture -- Holds dataset for ray tracing
  Object.defineProperty(this, 'dataTexture', {
    get: function() {return this.material.uniforms.dataTexture.value;},
    set: function(value) {
      value.flipY = false;
      value.magFilter = THREE.LinearFilter;
      value.minFilter = THREE.LinearFilter;
      value.wrapS = THREE.ClampToEdgeWrapping;
      value.wrapT = THREE.ClampToEdgeWrapping;
      
      return this.material.uniforms.dataTexture.value = value;
    },
    configurable: true,
    enumerable: true,
  });
  this.dataTexture = options.dataTexture || THREE.ImageUtils.generateDataTexture(512, 512, 0x000000);
  
  // @prop Number resolution -- Size of one dimension of 3D dataset. Cubic sets only. Passed to shader
  Object.defineProperty(this, 'resolution', {
    get: function() {return this.material.uniforms.resolution.value;},
    set: function(value) {return this.material.uniforms.resolution.value = value;},
    configurable: true,
    enumerable: true,
  });
  this.resolution = options.resolution || 64;
  
  // @prop Number intensity -- Scale factor for rednering. Passed to shader
  Object.defineProperty(this, 'intensity', {
    get: function() {return this.material.uniforms.intensity.value;},
    set: function(value) {return this.material.uniforms.intensity.value = value;},
    configurable: true,
    enumerable: true,
  });
  this.intensity = options.intensity || 1;
}
THREE.Densaugeo.VRTVolume.prototype = Object.create(THREE.Mesh.prototype);
THREE.Densaugeo.VRTVolume.prototype.constructor = THREE.Densaugeo.VRTVolume;

// @method proto tick(THREE.Camera camera) -- Tick needed for each render call. This one passes camera position in local coordinates to shaders
THREE.Densaugeo.VRTVolume.prototype.tick = function(camera) {
  this.material.uniforms.localCamera.value.setFromMatrixPosition(camera.matrix);
  this.worldToLocal(volume.material.uniforms.localCamera.value)
}

/**
 * @module THREE.Densaugeo.VRTMaterial inherits THREE.ShaderMaterial
 * @description Material for volume ray tracing
 */
THREE.Densaugeo.VRTMaterial = function(/*Object*/ options) {
  THREE.ShaderMaterial.call(this);
  
  // @prop String type -- 'VRTMaterial'
  this.type = 'VRTMaterial';
  
  // @prop String vertexShader -- Source code for vertex shader
  this.vertexShader   = THREE.ShaderLib.VRT.vertexShader;
  
  // @prop String fragmentShader -- Source code for fragment shader
  this.fragmentShader = THREE.ShaderLib.VRT.fragmentShader;
  
  // @prop Boolean transparent -- Kind of essential for VRT
  this.transparent = true;
  
  // @prop Number side -- Defaults to THREE.DoubleSide to support views from inside the VRTVolume
  this.side = THREE.DoubleSide;
  
  // @prop Object uniforms -- Uniform variables to pass to shader
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.VRT.uniforms);
}
THREE.Densaugeo.VRTMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.Densaugeo.VRTMaterial.prototype.constructor = THREE.Densaugeo.VRTMaterial;

THREE.ShaderLib.VRT = {
  uniforms: {
    dataTexture: {type: 't', value: null},
    resolution: {type: 'f', value: null},
    intensity: {type: 'f', value: null},
    
    localCamera : {type: 'v3', value: new THREE.Vector3()},
  },
  
  vertexShader: [
   'varying vec3 localPosition;',
   
   'void main() {',
     'localPosition = position;',
     
     'gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);',
   '}'
  ].join('\n'),
  
  fragmentShader: [
  // Dataset params: dataTexture, resolution
  // Rendering params: samplePoints, intensity
   'uniform sampler2D dataTexture;',
   'uniform float resolution;',
   'uniform float samplePoints;',
   'uniform float intensity;',
   
   'uniform vec3 localCamera;',
   
   'varying vec3 localPosition;',
   
   'vec3 planes = vec3(0.5);',
   
   'float getPathLength(vec3 entrance, vec3 direction) {',
     'float shortestDistance = 1.0/0.0;',
     
     'if(direction.x > 0.0) shortestDistance = min(shortestDistance, ( planes.x - entrance.x)/direction.x);',
     'if(direction.x < 0.0) shortestDistance = min(shortestDistance, (-planes.x - entrance.x)/direction.x);',
     'if(direction.y > 0.0) shortestDistance = min(shortestDistance, ( planes.y - entrance.y)/direction.y);',
     'if(direction.y < 0.0) shortestDistance = min(shortestDistance, (-planes.y - entrance.y)/direction.y);',
     'if(direction.z > 0.0) shortestDistance = min(shortestDistance, ( planes.z - entrance.z)/direction.z);',
     'if(direction.z < 0.0) shortestDistance = min(shortestDistance, (-planes.z - entrance.z)/direction.z);',
     
     'return shortestDistance;',
   '}',
   
   'vec4 texture3D(sampler2D sampler, vec3 coord, float size) {',
     'float slicesPerRow = sqrt(size);',
     'float textureWidth = pow(size, 1.5);',
     'float sliceLower = floor(clamp(coord.z, 0.0, 1.0)*(size - 1.0));',
     'float sliceHigher = min(sliceLower + 1.0, size);',
     'float sliceRatio = clamp(coord.z, 0.0, 1.0)*size - sliceLower;',
     
     'vec2 uv;',
     'vec2 plane_uv;',
     
     'uv = (clamp(coord.xy, 0.0, 1.0)*(size - 1.0) + 0.5)/textureWidth;',
     
     'plane_uv.x = mod(sliceLower, slicesPerRow)/slicesPerRow;',
     'plane_uv.y = floor(sliceLower/slicesPerRow)/slicesPerRow;',
     
     'vec4 sampleLower = texture2D(sampler, uv + plane_uv);',
     
     'plane_uv.x = mod(sliceHigher, slicesPerRow)/slicesPerRow;',
     'plane_uv.y = floor(sliceHigher/slicesPerRow)/slicesPerRow;',
     
     'vec4 sampleHigher = texture2D(sampler, uv + plane_uv);',
     
     'return mix(sampleLower, sampleHigher, sliceRatio);',
   '}',
   
   'float rgbToProbability(vec4 rgb) {',
     'return rgb.r + rgb.g/256.0 + rgb.b/65536.0 + rgb.a/16777216.0;',
   '}',
   
   'void main() {',
     'vec3 ray = normalize(localPosition - localCamera);',
     
     'vec3 pathStart, pathEnd;',
     'float pathLength;',
     
     // find intersection of camera ray and volume
     'if(max(abs(localCamera), planes) != planes) {',
       'pathStart = localPosition;',
       'pathLength = getPathLength(localPosition, ray);',
       'pathEnd = pathStart + pathLength*ray;',
     '} else {',
       'pathStart = localCamera;',
       'pathEnd = localPosition;',
     '}',
     
     // Convert coordinates
     'pathStart = pathStart + 0.5;',
     'pathEnd = pathEnd + 0.5;',
     'pathLength = distance(pathStart, pathEnd);',
     
     
     // Path integral along ray intersection
     'vec3 pathDirection = normalize(pathEnd - pathStart);',
     'vec3 samplePoint = pathStart;',
     'float sampleSpacing = pathLength/100.0;',
     'float pathIntegral = 0.0;',
     'for(float i = 0.0; i <= 100.0; ++i) {',
       'pathIntegral += sampleSpacing*rgbToProbability(texture3D(dataTexture, samplePoint, resolution));',
       'samplePoint += sampleSpacing*pathDirection;',
     '}',
     
     'gl_FragColor = vec4(0.0, intensity*pathIntegral, 1.0, intensity*pathIntegral);',
   '}'
  ].join('\n'),
}

/**
 * @module THREE.Densaugeo.VRTTexture inherits THREE.DataTexture
 * @description Texture for volume ray tracing. Scalar field generated by a supplied formula, encoded as 32-bit integers split between rgba values
 * 
 * @example var dataTexture = new THREE.Densaugeo.VRTTexture({
 * @example . resolution: 64,
 * @example . formula: function(x, y, z) {return 1},
 * @example });
 */
THREE.Densaugeo.VRTTexture = function(options) {
  // @option Number resolution -- Size of one dimension of 3D dataset. May be 16, 64, or 256
  var resolution = options.resolution;
  var textureSize = {16: 64, 64: 512, 256: 4096}[resolution];
  if(typeof textureSize === 'undefined') {
    throw new Error('THREE.Densaugeo.generateVRTTexture: resolution must be 16, 64, or 256');
  }
  var slicesPerRow = Math.sqrt(resolution);
  
  THREE.DataTexture.call(this, new Uint8Array(4*Math.pow(resolution, 3)), textureSize, textureSize, THREE.RGBAFormat);
  this.needsUpdate = true;
  var dataview = new DataView(this.image.data.buffer)
  
  // @option Function formula -- Formula is called with <x, y, z> or <r, θ, φ> with values from -1/2 to +1/2 on each cartesian axis
  var formula = options.formula || function(x, y, z) {
    return 1;
  };
  
  // @option Boolean useSpherical -- If true, formula is called with spherical coordinates. Otherwise formula is called with Cartesian coordinates
  var useSpherical = options.useSpherical || false;
  
  // @option THREE.Matrix4 matrix -- Transforms coordinates used to generates dataset. Default is a unit cube centered around the origin
  var matrix = options.matrix || new THREE.Matrix4().forge({});
  
  var basePoint = new THREE.Vector3(-0.5, -0.5, -0.5).applyMatrix4(matrix);
  matrix.setPosition(new THREE.Vector3(0, 0, 0));
  var xInc = new THREE.Vector3(1/(resolution - 1), 0, 0).applyMatrix4(matrix);
  var yInc = new THREE.Vector3(0, 1/(resolution - 1), 0).applyMatrix4(matrix);
  var zInc = new THREE.Vector3(0, 0, 1/(resolution - 1)).applyMatrix4(matrix);
  
  for(var i = 0, endi = resolution; i < endi; ++i) {
    for(var j = 0, endj = resolution; j < endj; ++j) {
      var samplePoint = basePoint.clone();
      samplePoint.add(xInc.clone().multiplyScalar(i));
      samplePoint.add(yInc.clone().multiplyScalar(j));
      
      for(var k = 0, endk = resolution; k < endk; ++k) {
        var x = samplePoint.x;
        var y = samplePoint.y;
        var z = samplePoint.z;
        
        if(useSpherical) {
          var r = Math.sqrt(x*x + y*y + z*z);
          var density = formula(r, Math.atan2(y, x), Math.acos(z/r));
        } else {
          var density = formula(x, y, z);
        }
        
        density *= 4294967295;
        
        dataview.setUint32(4*(Math.floor(k/slicesPerRow)*textureSize*resolution + (k % slicesPerRow)*resolution + j*textureSize + i), density, false);
        
        samplePoint.add(zInc);
      }
    }
  }
}
THREE.Densaugeo.VRTTexture.prototype = Object.create(THREE.DataTexture.prototype);
THREE.Densaugeo.VRTTexture.prototype.constructor = THREE.Densaugeo.VRTTexture;
