# waveModules.js

UI modules for a wave function visualizer

Dependencies: `PanelUI.js` , `EventEmitter.js` 

---

## WaveModules.HelpPanel

Inherits: `PanelUI.Panel`

Gives an overview of the UI's controls

```
var helpPanel = new WaveModules.HelpPanel();
helpPanel.open();
```

---

## WaveModules.SettingsPanel

Inherits: `PanelUI.Panel`

UI panel to adjust wavefunction dataset and rendering

```
var settingsPanel = new WaveModules.SettingsPanel();
settingsPanel.open();
```

#### Properties

`HTMLElement` **content** -- Appened to .domElement

`Object` **controls** -- Holds HTMLElements used for adjusting shaders' uniform variables

#### Methods

`undefined` **emitChange**`(Boolean needsRefresh)` -- Emit a change event, passing through needsRefresh and reading parameters from UI elements

#### Events

**axes** `{Number value}` -- Emitted when the axes checkbox is changed

**change** `{Number n, Number, l, Number m, Number intensity, Number radius, Boolean needsRefresh}` -- Emitted when a parameter is changed on this panel

---

## WaveModules.TexturePanel

Inherits: `PanelUI.Panel`

Displays a texture

```
var helpPanel = new WaveModules.TexturePanel();
texturePanel.updateImage(someDataTexture);
texturePanel.open();
```

#### Methods

`THREE.Densaugeo.VRTTexture` proto **updateImage**`(THREE.Densaugeo.VRTTexture texture)` -- Draws a new texture on the panel's canvas. Clears alpha values to 255 for visibility. Returns texture for daisy-chaining

---

## WaveModules.SourcePanel

Inherits: `PanelUI.Panel`

Gives location of repo

```
var sourcePanel = new WaveModules.SourcePanel();
sourcePanel.open();
```

