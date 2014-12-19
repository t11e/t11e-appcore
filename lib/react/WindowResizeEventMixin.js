'use strict';

var domEvent = require('dom-event');
var DOMUtils = require('t11e-utils').DOMUtils;

var WindowResizeEventMixin = {
  getInitialState: function() {
    return this._computeWindowSizeState();
  },

  componentDidMount: function() {
    domEvent.on(window, 'resize', this._windowResizeEventMixin_handleResize);
    this._windowResizeEventMixin_handleResize();
  },

  componentWillUnmount: function() {
    domEvent.off(window, 'resize', this._windowResizeEventMixin_handleResize);
  },

  _windowResizeEventMixin_handleResize: function() {
    this.setState(this._computeWindowSizeState());
  },

  _computeWindowSizeState: function() {
    return {
      windowWidth: DOMUtils.getWindowWidth(),
      windowHeight: DOMUtils.getWindowHeight()
    };
  }
};

module.exports = WindowResizeEventMixin;
