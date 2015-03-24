/**
 * @depends PanelUI.js
 * @depends EventEmitter.js
 * 
 * @description UI modules for a wave function visualizer
 */
var WaveModules = {};

/**
 * @module WaveModules.HelpPanel inherits PanelUI.Panel
 * @description Gives an overview of the UI's controls
 * 
 * @example var helpPanel = new WaveModules.HelpPanel();
 * @example helpPanel.open();
 */
WaveModules.HelpPanel = function HelpPanel() {
  PanelUI.Panel.call(this, {id: 'help', heading: 'Controls', startOpen: false, accessKey: 'c'});
  
  this.domElement.appendChild(fE('div', {}, [
    fE('text', {textContent: 'Touchscreen:'}),
    fE('br'),
    fE('text', {textContent: 'First finger drag - Rotate'}),
    fE('br'),
    fE('text', {textContent: 'Second finger drag - Zoom'}),
    fE('br'),
    fE('br'),
    fE('text', {textContent: 'Mouse:'}),
    fE('br'),
    fE('text', {textContent: 'Click and drag - Rotate'}),
    fE('br'),
    fE('text', {textContent: 'Scroll wheel - Zoom'}),
    fE('br'),
    fE('br'),
    fE('text', {textContent: 'Keyboard:'}),
    fE('br'),
    fE('text', {textContent: 'Arrows - Rotate'}),
    fE('br'),
    fE('text', {textContent: 'Page up/down - Zoom'}),
  ]));
}
WaveModules.HelpPanel.prototype = Object.create(PanelUI.Panel.prototype);
WaveModules.HelpPanel.prototype.constructor = WaveModules.HelpPanel;

/**
 * @module WaveModules.SettingsPanel inherits PanelUI.Panel
 * @description UI panel to adjust wavefunction dataset and rendering
 * 
 * @example var settingsPanel = new WaveModules.SettingsPanel();
 * @example settingsPanel.open();
 */
WaveModules.SettingsPanel = function SettingsPanel(options) {
  PanelUI.Panel.call(this, {id: 'settings', heading: 'Probability Density'});
  
  var self = this;
  
  // @prop Object controls -- Holds HTMLElements used for adjusting shaders' uniform variables
  this.controls = {};
  
  // @prop HTMLElement content -- Appened to .domElement
  this.content = fE('div', {}, [
    fE('br', {}),
    fE('text', {textContent: 'Quantum numbers:'}),
    fE('div', {}, [
      fE('text', {textContent: 'Principal (n)'}),
      this.controls.principal = fE('select', {}, [
        fE('option', {textContent: 1, value: 1}),
        fE('option', {textContent: 2, value: 2}),
        fE('option', {textContent: 3, value: 3}),
      ]),
    ]),
    fE('div', {}, [
      fE('text', {textContent: 'Angular (l)'}),
      this.controls.angular = fE('select', {}, [
        fE('option', {textContent: 0, value: 0}),
        fE('option', {textContent: 1, value: 1}),
        fE('option', {textContent: 2, value: 2}),
      ]),
    ]),
    fE('div', {}, [
      fE('text', {textContent: 'Magnetic (m)'}),
      this.controls.magnetic = fE('select', {}, [
        fE('option', {textContent: -2, value: -2}),
        fE('option', {textContent: -1, value: -1}),
        fE('option', {textContent: 0, value: 0, selected: true}),
        fE('option', {textContent: 1, value: 1}),
        fE('option', {textContent: 2, value: 2}),
      ]),
    ]),
    this.warning = fE('text', {textContent: ''}),
    fE('br', {}),
    fE('br', {}),
    fE('text', {textContent: 'Shader settings:'}),
    fE('div', {}, [
      fE('text', {textContent: 'Intensity'}),
      this.controls.intensity = fE('input', {type: 'number', value: 10}),
    ]),
    fE('div', {}, [
      fE('text', {textContent: 'Radius (Bohr radii)'}),
      this.controls.radius = fE('input', {type: 'number', value: 2}),
    ]),
    fE('br', {}),
    fE('div', {}, [
      fE('text', {textContent: 'Show axes'}),
      this.controls.axes = fE('input', {type: 'checkbox', checked: false}),
    ]),
  ]);
  
  this.domElement.appendChild(this.content);
  
  var irDefaults = {
    1: { // n
      0: { // l
        0: {intensity: 10, radius: 2},
      },
    },
    2: { // n
      0: { // l
        0: {intensity: 400, radius: 8},
      },
      1: { // l
        0: {intensity: 400, radius: 8},
        1: {intensity: 400, radius: 8},
      },
    },
    3: { // n
      0: { // l
        0: {intensity: 5000, radius: 20},
      },
      1: { // l
        0: {intensity: 5000, radius: 20},
        1: {intensity: 3000, radius: 20},
      },
      2: { // l
        0: {intensity: 5000, radius: 20},
        1: {intensity: 50000, radius: 20},
        2: {intensity: 5000, radius: 20},
      },
    },
  }
  
  // @event change {Number n, Number, l, Number m, Number intensity, Number radius, Boolean needsRefresh} -- Emitted when a parameter is changed on this panel
  // @method undefined emitChange(Boolean needsRefresh) -- Emit a change event, passing through needsRefresh and reading parameters from UI elements
  this.emitChange = function(needsRefresh) {
    self.emit('change', {
      n: Number(self.controls.principal.value),
      l: Number(self.controls.angular.value),
      m: Number(self.controls.magnetic.value),
      intensity: Number(self.controls.intensity.value),
      radius: Number(self.controls.radius.value),
      needsRefresh: needsRefresh,
    });
  }
  
  for(var i in this.controls) {
    self.controls[i].addEventListener('keydown', function(e) {
      e.stopPropagation();
    });
  }
  
  var onQuantumNumberChange = function() {
    if(self.controls.angular.value >= self.controls.principal.value) {
      self.warning.textContent = 'Warning: l must be less than n';
    } else if(Math.abs(self.controls.magnetic.value) > self.controls.angular.value) {
      self.warning.textContent = 'Warning: |m| must not be greater than l';
    } else {
      var n = self.controls.principal.value;
      var l = self.controls.angular.value;
      var m = self.controls.magnetic.value;
      
      self.controls.intensity.value = irDefaults[n][l][m].intensity;
      self.controls.radius.value = irDefaults[n][l][m].radius;
      
      self.emitChange(true);
    }
  }
  
  this.controls.principal.addEventListener('change', onQuantumNumberChange);
  this.controls.angular.addEventListener('change', onQuantumNumberChange);
  this.controls.magnetic.addEventListener('change', onQuantumNumberChange);
  
  this.controls.intensity.addEventListener('change', function(e) {
    self.emitChange(false);
  });
  
  this.controls.radius.addEventListener('change', function(e) {
    self.emitChange(true);
  });
  
  // @event axes {Number value} -- Emitted when the axes checkbox is changed
  this.controls.axes.addEventListener('change', function(e) {
    self.emit('axes', {value: self.controls.axes.checked});
  });
}
WaveModules.SettingsPanel.prototype = Object.create(PanelUI.Panel.prototype);
WaveModules.SettingsPanel.prototype.constructor = WaveModules.SettingsPanel;
