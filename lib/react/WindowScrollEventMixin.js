'use strict';

var domEvent = require('dom-event');
var DOMUtils = require('t11e-utils').DOMUtils;

var WindowScrollEventMixin = {
  getInitialState: function() {
    return this._computeState();
  },

  componentDidMount: function() {
    domEvent.on(window, 'scroll', this._windowScrollEventMixin_handleWindowScroll);
    this._windowScrollEventMixin_handleWindowScroll();
  },

  componentWillUnmount: function() {
    domEvent.off(window, 'scroll', this._windowScrollEventMixin_handleWindowScroll);
  },

  _windowScrollEventMixin_handleWindowScroll: function() {
    this.setState(this._computeState());
  },

  _computeState: function() {
    return {
      windowScrollTop: DOMUtils.getWindowScrollTop()
    };
  }
};

module.exports = WindowScrollEventMixin;
