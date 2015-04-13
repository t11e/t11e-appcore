'use strict';

var _ = require('underscore');
var debug = require('debug')('History');
var EventEmitter = require('events').EventEmitter;

// Poor man's URL parser.
function parseUrl(url) {
  var parts = {};
  var match = /^(?:(\w+):)?\/\/([^\/]+)(\/.*$)?/.exec(url);
  if (match) {
    parts.protocol = match[1];
    parts.host = match[2];
    parts.path = match[3];
  } else {
    parts.path = url;
  }
  return parts;
}

var History = {

  PushStateStrategy: _.extend({}, EventEmitter.prototype, {
    isSupported: function() {
      return typeof window !== 'undefined' &&
        !!(window.history && window.history.pushState);
    },

    start: function() {
      if (window.location.hostname === 'localhost' ||
        window.location.origin === 'file://') {
        // When in WKWebView, get rid of the local web server/file system
        window.history.replaceState({}, null, '/');
        this._path = '/';
      } else {
        this._path = window.location.pathname;
      }
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
      var urlparts = parseUrl(url);

      // Ignore host when localhost inside WKWebView in mobile app
      // Ignore file protocol for mobile apps
      var careAboutHost = window.location.hostname !== 'localhost' &&
        window.location.protocol !== 'file:';

      if (careAboutHost && urlparts.host && urlparts.host !== window.location.hostname) {
        debug("External URL (", urlparts.host, "!=", window.location.hostname,
          ", switch entire location to", url);
        window.location.href = url;
      } else {
        var path = urlparts.path;
        if (path !== this._path) {
          debug("Changing state to path", path);

          state || (state = {});
          if (replace === true) {
            window.history.replaceState(state, null, path);
          } else {
            window.history.pushState(state, null, path);
          }
          this._path = path;
          this._changed({}, replace ? 'replace' : 'push');
        }
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
      var path = window.location.hash.substring(1);
      if (!path) {
        path = '/';
      }
      this._path = path;

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

    navigate: function(url/*, state, replace */) {
      var urlparts = parseUrl(url);
      if (urlparts.host !== window.location.hostname) {
        window.location.href = url;
      } else {
        var path = urlparts.path;
        if (path !== this._path) {
          window.location.hash = path;
        }
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

    navigate: function(url/*, state, replace */) {
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

    navigate: function(url/*, state, replace */) {
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
        debug("Using strategy", strategies[i]);
        return strategies[i];
      }
    }
    throw new Error("Could not detect history strategy");
  }

};

module.exports = History;
