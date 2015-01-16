'use strict';

var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var RouteRecognizer = require('route-recognizer');
var debug = require('debug')('Router');
var inherits = require('inherits');

var History = require('./History');

// Initialize the router. The routes argument is a list of routes, each
// route being a hash with a `path` and a `view` name.
//
// The router emits the events:
//
// * `navigate(event)` when history changes. The event has `url`,
//   `previousUrl`, `view` (the route name), `params` (route parameters),
//   `scrollTop` (scrolltop restored from state).
//
// * `notFound(event)` when navigation did not match a route. The event
//   provides `url`.
//
var Router = function(routes) {
  this._scrollTop = 0;
  this._view = null;
  this._urlStack = [];
  this._viewStack = [];
  this._routes = new RouteRecognizer();
  _.each(routes, function(route) {
    if (!(route.path && route.view)) {
      throw new Error("Invalid route: " + JSON.stringify(route));
    }
    this._routes.add([
      {path: route.path, handler: route.view}
    ]);
  }.bind(this));
};

inherits(Router, EventEmitter);

Router.prototype = _.extend(Router.prototype, {

  // Start the store. If `singlePageRouting` is `false`, the navigation
  // store will not use `pushState`-type page management; defaults to
  // `true`.
  start: function(options) {
    options || (options = {singlePage: true});

    // Default to single-page routing
    if (options.singlePage === false) {
      this._strategy = History.LocationStrategy;
    } else {
      this._strategy = History.detectStrategy();
    }
    this._strategy.on('change', this._handleHistoryChange.bind(this));
    this._strategy.start();

    this._url = this._strategy.get();
  },

  // Returns current scroll position.
  getScrollTop: function() {
    return this._scrollTop;
  },

  // Returns current URL.
  getUrl: function() {
    return this._url;
  },

  // Returns URL if there is a previous view in the history.
  getPreviousViewUrl: function() {
    return this._viewStack[this._viewStack.length - 1];
  },

  // Returns true if there is a previous view in the history.
  hasPreviousView: function() {
    return this._viewStack.length > 0;
  },

  // Navigate to a URL or path. If `replaceState` is true, the navigation
  // is performed in-place instead of pushing a new entry onto the history.
  navigate: function(url, replaceState) {
    debug("Navigate to " + url, replaceState ? "(replace)" : "(push)");
    this._strategy.navigate(url, {scrollTop: this._scrollTop}, replaceState);
  },

  // Navigate to previous view. This is not necessarily the same as the
  // previous page in the history.
  navigateToPreviousView: function() {
    if (this._viewStack.length > 0) {
      var previous = this._viewStack.pop();
      if (previous) {
        return this.navigate(previous, true);
      }
    }
    this.navigate('/', true);
  },

  // Update scroll position.
  reportScrollTop: function(scrollTop) {
    this._scrollTop = scrollTop;
  },

  _handleHistoryChange: function(url, state, type) {
    debug("History change to", url, type);

    var result = this._routes.recognize(url);
    if (result && result.length > 0) {
      var route = result[0];
      debug('Route matched', route);

      var view = route.handler;

      var previousUrl = this._url;
      if (previousUrl && previousUrl !== url) {
        switch (type) {
          case 'pop':
            this._urlStack.pop();
            if (view !== this._view) {
              this._viewStack.pop();
            }
            break;

          case 'push':
            this._urlStack.push(previousUrl);
            if (view !== this._view) {
              this._viewStack.push(previousUrl);
            }
            break;
        }
      }
      this._url = url;
      this._view = view;

      this.emit('navigate', {
        url: this._url,
        previousUrl: previousUrl,
        view: view,
        params: route.params,
        scrollTop: state.scrollTop
      });
    } else {
      debug('Route did not match');
      this.emit('notFound', {
        url: this._url
      });
    }
  }

});

module.exports = Router;
