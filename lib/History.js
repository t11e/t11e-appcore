'use strict';

var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

var History = {

  PushStateStrategy: _.extend({}, EventEmitter.prototype, {
    isSupported: function() {
      return typeof window !== 'undefined' &&
        !!(window.history && window.history.pushState);
    },

    start: function() {
      this._path = window.location.pathname;
      if (window.addEventListener) {
        window.addEventListener('popstate', this._onPopState.bind(this));
      } else {
        window.attachEvent('onpopstate', this._onPopState.bind(this));
      }
      this._changed({}, 'replace');
    },

    get: function() {
      return this._path;
    },

    navigate: function(url, state, replace) {
      if (url !== this._path) {
        state || (state = {});
        if (replace === true) {
          window.history.replaceState(state, null, url);
        } else {
          window.history.pushState(state, null, url);
        }
        this._path = url;
        this._changed({}, replace ? 'replace' : 'push');
      }
    },

    _onPopState: function(event) {
      var path = window.location.pathname;
      if (path !== this._path) {
        this._path = path;
        this._changed(event.state, true, 'pop');
      }
    },

    _changed: function(state, type) {
      this.emit('change', this._path, state || {}, type);
    }
  }),

  HashStrategy: _.extend({}, EventEmitter.prototype, {
    isSupported: function() {
      return typeof window !== 'undefined' && !!window.location;
    },

    start: function() {
      this._path = window.location.hash.substring(1);
      if (window.addEventListener) {
        window.addEventListener('hashchange', this._onHashChange.bind(this));
      } else {
        window.attachEvent('onhashchange', this._onHashChange.bind(this));
      }
      this._changed();
    },

    get: function() {
      return this._path;
    },

    navigate: function(url, state, replace) {
      // TODO: Absolute URL support
      if (url !== this._path) {
        window.location.hash = url;
      }
    },

    _onHashChange: function() {
      if (window.location.hash !== this._path) {
        this._path = window.location.hash.substring(1);
        this._changed();
      }
    },

    _changed: function() {
      this.emit('change', this._path, {});
    }
  }),

  LocationStrategy: _.extend({}, EventEmitter.prototype, {
    isSupported: function() {
      return typeof window !== 'undefined';
    },

    start: function() {
      this.emit('change', this.get(), {});
    },

    get: function() {
      return window.location.pathname;
    },

    navigate: function(url, state, replace) {
      window.location.href = url;
    }
  }),

  VirtualStrategy: _.extend({}, EventEmitter.prototype, {
    isSupported: function() {
      return true;
    },

    start: function() {
      this._path = '/';
      this.emit('change', this.get(), {});
    },

    get: function() {
      return this._path;
    },

    navigate: function(url, state, replace) {
      if (url !== this._path) {
        this._path = url;
        this.emit('change');
      }
    }
  }),

  detectStrategy: function() {
    var strategies = [
      this.PushStateStrategy,
      this.HashStrategy,
      this.LocationStrategy,
      this.VirtualStrategy
    ];
    for (var i = 0; i < strategies.length; i++) {
      if (strategies[i].isSupported()) {
        return strategies[i];
      }
    }
    throw new Error("Could not detect history strategy");
  }

};

module.exports = History;
