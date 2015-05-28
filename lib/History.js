'use strict';

import {EventEmitter} from 'events';

const debug = require('debug')('History');

// Poor man's URL parser.
function parseUrl(url) {
  let parts = {};
  let match = /^(?:(\w+):)?\/\/([^\/]+)(\/.*$)?/.exec(url);
  if (match) {
    parts.protocol = match[1];
    parts.host = match[2];
    parts.path = match[3];
  } else {
    parts.path = url;
  }
  return parts;
}

export class PushStateStrategy extends EventEmitter {
  get isSupported() {
    return typeof window !== 'undefined' &&
      !!(window.history && window.history.pushState);
  }

  start() {
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
  }

  get() {
    return this._path;
  }

  navigate(url, state, replace) {
    let urlparts = parseUrl(url);

    // Ignore host when localhost inside WKWebView in mobile app
    // Ignore file protocol for mobile apps
    let careAboutHost = window.location.hostname !== 'localhost' &&
      window.location.protocol !== 'file:';

    if (careAboutHost && urlparts.host && urlparts.host !== window.location.hostname) {
      debug("External URL (", urlparts.host, "!=", window.location.hostname,
        ", switch entire location to", url);
      window.location.href = url;
    } else {
      let path = urlparts.path;
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
  }

  _onPopState(event) {
    let path = window.location.pathname;
    if (path !== this._path) {
      this._path = path;
      this._changed(event.state, true, 'pop');
    }
  }

  _changed(state, type) {
    this.emit('change', this._path, state || {}, type);
  }
}

export class HashStrategy extends EventEmitter {
  get isSupported() {
    return typeof window !== 'undefined' && !!window.location;
  }

  start() {
    let path = window.location.hash.substring(1);
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
  }

  get() {
    return this._path;
  }

  navigate(url/*, state, replace */) {
    let urlparts = parseUrl(url);
    if (urlparts.host !== window.location.hostname) {
      window.location.href = url;
    } else {
      let path = urlparts.path;
      if (path !== this._path) {
        window.location.hash = path;
      }
    }
  }

  _onHashChange() {
    if (window.location.hash !== this._path) {
      this._path = window.location.hash.substring(1);
      this._changed();
    }
  }

  _changed() {
    this.emit('change', this._path, {});
  }
}

export class LocationStrategy extends EventEmitter {
  get isSupported() {
    return typeof window !== 'undefined';
  }

  start() {
    this.emit('change', this.get(), {});
  }

  get() {
    return window.location.pathname;
  }

  navigate(url/*, state, replace */) {
    window.location.href = url;
  }
}

export class VirtualStrategy extends EventEmitter {
  get isSupported() {
    return true;
  }

  start() {
    this._path = '/';
    this.emit('change', this.get(), {});
  }

  get() {
    return this._path;
  }

  navigate(url/*, state, replace */) {
    if (url !== this._path) {
      this._path = url;
      this.emit('change');
    }
  }
}

const History = {
  // These are for backwards compatibility with old-style requires
  PushStateStrategy,
  HashStrategy,
  LocationStrategy,
  VirtualStrategy,

  detectStrategy() {
    let strategies = [
      PushStateStrategy,
      HashStrategy,
      LocationStrategy,
      VirtualStrategy
    ];
    for (let i = 0; i < strategies.length; i++) {
      let strategy = new strategies[i]();
      if (strategy.isSupported) {
        debug("Using strategy", strategies[i]);
        return strategy;
      }
    }
    throw new Error("Could not detect history strategy");
  }
};

module.exports = History;  // Backwards compatibility
