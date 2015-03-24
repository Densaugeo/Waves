/**
 * @depends EventEmitter.js
 * @depends Draggabilliy.js
 */

var PanelUI = {};

// @method HTMLElement forgeElement(String tagName, Object properties, Array children) -- Daisy-chainable element maker
PanelUI.forgeElement = function forgeElement(tagName, properties, children) {
  var element = document.createElement(tagName);
  for(var i in properties) {
    element[i] = properties[i];
  }
  if(children) {
    for(var i = 0, endi = children.length; i < endi; ++i) {
      element.appendChild(children[i]);
    }
  }
  return element;
}
var fE = PanelUI.forgeElement;

/**
 * @module PanelUI.Sidebar inherits EventEmitter
 * @description Makes a sidebar. Buttons added to the sidebar can be triggered by clicks or keyboard shortcuts 1-9, 0, -, and =
 * @description Icons come from Font Awesome and are specified in the faClass option
 * 
 * @example var sidebar = new PanelUI.Sidebar();
 * @example sidebar.addButton({buttonName: 'do_stuff', faClass: 'fa-question', title: 'Tooltip text'});
 * @example sidebar.on('do_stuff', function() {console.log('Doing stuff')});
 * @example sidebar.on('trigger', function(e) {console.log(e.buttonName === 'do_stuff')});
 */
PanelUI.Sidebar = function Sidebar() {
  EventEmitter.call(this);
  
  // @prop HTMLElement domElement -- div tag that holds all of the Panel's HTML elements
  this.domElement = fE('div', {id: 'sidebar', tabIndex: 1, accessKey: '1'});
  
  // @prop HTMLCollection children -- Alias for domElement.children
  this.children = this.domElement.children;
  
  document.body.appendChild(this.domElement);
  this.domElement.title = 'Key: ' + this.domElement.accessKeyLabel;
  
  // @prop Object keyCodesToButtonIndices -- Look up a keyCode and get a button index
  this.keyCodesToButtonIndices = {49: 0, 50: 1, 51: 2, 52: 3, 53: 4, 54: 5, 55: 6, 56: 7, 57: 8, 58: 9, 48: 10, 173: 11, 61: 12};
  
  // @prop Array buttonIndicesToKeyChars -- Look up a button index and get a char for its key
  this.buttonIndicesToKeyChars = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  
  // @method undefined addButton(Object {String faClass, String title, String buttonName}) -- Add a button. Support font-awesome icon names
  // @event trigger {String buttonName} -- Fired when a button is triggered
  // @event [buttonName] {} -- Fired when a button is triggered. Event name is the buttonName defined when the corresponding button was added
  with(this) this.addButton = function(/*Object*/ options) {
    options = options || {};
    
    var element = fE('i', {
      className  : 'fa ' + 'button ' + (options.faClass || ''),
      textContent: options.char || '',
      title      : (options.title || 'Not yet described') + '\n\nKey: ' + buttonIndicesToKeyChars[children.length],
      tabIndex   : 0,
    });
    
    element.addEventListener('click', function(/*Event*/ e) {
      domElement.focus();
      emit('trigger', {buttonName: options.buttonName});
      emit(options.buttonName);
    });
    
    domElement.appendChild(element);
  }
  
  with(this) document.addEventListener('keydown', function(/*Event*/ e) {
    if(!e.altKey && !e.ctrlKey && !e.shiftKey && e.keyCode === 13 && e.target.classList.contains('button')) {
      e.target.dispatchEvent(new MouseEvent('click'));
    }
  });
  
  with(this) document.addEventListener('keydown', function(/*Event*/ e) {
    var index = keyCodesToButtonIndices[e.keyCode];
    
    if(!e.altKey && !e.ctrlKey && !e.shiftKey && children[index]) {
      children[index].dispatchEvent(new MouseEvent('click'));
    }
  });
}
PanelUI.Sidebar.prototype = Object.create(EventEmitter.prototype);
PanelUI.Sidebar.prototype.constructor = PanelUI.Sidebar;

/**
 * @module PanelUI.Panel inherits EventEmitter
 * @description Makes a panel. Includes draggability and close button
 * 
 * @example var panel = new PanelUI.Panel({id: 'css_id', heading: 'Your heading here', closeButton: true, accessKey: 'a'});
 * @example panel.open();
 * 
 * @option String  accessKey   -- Browser accesskey
 * @option Boolean closeButton -- Show a close button?
 * @option String  heading     -- Heading text
 * @option String  id          -- CSS ID
 */
PanelUI.Panel = function Panel(options) {
  EventEmitter.call(this);
  
  var self = this;
  
  // @prop HTMLElement domElement -- div tag that holds all of the Panel's HTML elements
  this.domElement = fE('div', {id: options.id, className: 'panel', tabIndex: 0, accessKey: options.accessKey || ''}, [
    fE('div', {className: 'panel_heading', textContent: options.heading || 'Heading', title: 'Click and drag to move panel'}),
  ]);
  
  this.domElement.title = (options.heading || 'Heading') + (options.accessKey ? '\n\nAccess Key: ' + options.accessKey.toUpperCase() : '');
  
  // @prop Object keyCuts -- Key-value store of keyboard shortcuts. Keys are .keyCode numbers, values are HTMLElement references
  this.keyCuts = {};
  
  // @prop HTMLElement closeButton -- Reference to the close button (may not exist, depending on options)
  this.closeButton = null;
  if(options.closeButton != false) {
    this.domElement.appendChild(
      this.closeButton = fE('i', {className: 'fa fa-close panel_close button', tabIndex: 0, title: 'Close panel\n\nKey: Q'})
    );
    
    this.keyCuts[81] = this.closeButton; // Q is for quit
  }
  
  // @prop Draggabilly draggie -- Attachment of Draggabilly library for drag-and-drop positioning
  this.draggie = new Draggabilly(this.domElement, {handle: '.panel_heading'});
  
  if(localStorage['dragger_' + this.domElement.id + '_top']) {
    this.domElement.style.top  = localStorage['dragger_' + this.domElement.id + '_top' ];
    this.domElement.style.left = localStorage['dragger_' + this.domElement.id + '_left'];
  }
  
  with(this) domElement.addEventListener('keydown', function(e) {
    if(!e.altKey && !e.ctrlKey && !e.shiftKey && keyCuts[e.keyCode]) {
      e.stopPropagation();
      
      keyCuts[e.keyCode].dispatchEvent(new MouseEvent('click'));
    }
  });
  
  if(options.closeButton != false) {
    this.closeButton.addEventListener('click', function(/*Event*/ e) {
      self.close();
    });
  }
  
  with(this) draggie.on('dragEnd', function() {
    localStorage['dragger_' + domElement.id + '_top' ] = domElement.style.top ;
    localStorage['dragger_' + domElement.id + '_left'] = domElement.style.left;
  });
}
PanelUI.Panel.prototype = Object.create(EventEmitter.prototype);
PanelUI.Panel.prototype.constructor = PanelUI.Panel;

// @method proto undefined open(Boolean focus) -- Adds Panel's domElement to the document. If focus is set, also focuses .domElement
PanelUI.Panel.prototype.open = function(focus) {
  document.body.appendChild(this.domElement);
  
  if(focus) {
    this.domElement.focus();
  }
}

// @method proto undefined close() -- Removes Panel's domElement from the document
// @event close {} -- Fired on panel close
PanelUI.Panel.prototype.close = function() {
  this.domElement.parentElement.removeChild(this.domElement);
  
  this.emit('close');
}

// @method proto Boolean isOpen() -- Returns whether panel is currently open (attached to document)
PanelUI.Panel.prototype.isOpen = function() {
  return this.domElement.parentElement === document.body;
}

// @method proto undefined toggleOpen(Boolean focus) -- Toggle .domElement on and off of document.body
PanelUI.Panel.prototype.toggleOpen = function(focus) {
  if(this.isOpen()) {
    this.close();
  } else {
    this.open(focus);
  }
}

if(typeof module != 'undefined' && module != null && module.exports) {
  module.exports = PanelUI;
}
