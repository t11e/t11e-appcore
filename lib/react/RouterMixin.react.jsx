'use strict';

var domEvent = require('dom-event');
var debug = require('debug')('RouterMixin');
var React = require('react');
var _ = require('underscore');
var DOMUtils = require('t11e-utils').DOMUtils;

var WindowScrollEventMixin = require('./WindowScrollEventMixin');
var ApplicationDispatcher = require('./ApplicationDispatcher');

// A mixin for handling routing. The component must implement:
//
// * `renderView(name, view, params)`: To render the view. Note that when
// embedding the component, it must be embedded with `ref='view'`.
//
// * `getRouteView(viewName)` to return a component that should be responsible
//   for the view.
//
// Optionally:
//
// * `renderLoading()`: When initially loading.
//
// * `renderNotFound()`: When the page was not found.
//
// * `buildTitle(title)` to build a document title.
//
// In addition, in order to perform routing, the embedding component must
// listen to navigation events call `onNavigate(event)` and `onNotFound(event)` on
// itself. These are events emitted by `Router`.
//
// The embedded route view itself may support these methods:
//
// * `getTitle()` — return a title specific to the current state.
//
var RouterMixin = {

  mixins: [WindowScrollEventMixin],

  getInitialState: function() {
    return {
      status: 'loading',
      viewName: null,
      viewComponent: null,
      scrollTops: {}
    };
  },

  componentDidUpdate: function(prevProps, prevState) {
    var viewName = this.state.viewName;
    if (viewName !== prevState.viewName) {
      debug("Switch to view", viewName);
      DOMUtils.setWindowScrollTop(this.state.scrollTops[viewName]);
    }

    // Check if title has changed
    var view = this.refs.view;
    if (view && view.getTitle) {
      var title = view.getTitle();
      if (title !== this.state.title) {
        this.setState({title: title});
      }
    }

    if (prevState.title !== this.state.title && this.buildTitle) {
      document.title = this.buildTitle(this.state.title);;
    }

    if (this.state.windowScrollTop !== prevState.windowScrollTop) {
      if (this._scrollTopTimeoutId) {
        clearTimeout(this._scrollTopTimeoutId);
      }
      this._scrollTopTimeoutId = setTimeout(this._updateScrollTop, 250);
    }
  },

  render: function() {
    switch (this.state.status) {
      case 'loading':
        if (this.renderLoading) {
          return this.renderLoading();
        } else {
          return null;
        }

      case 'notFound':
        if (this.renderNotFound) {
          return this.renderNotFound();
        } else {
          return <h1>Not found</h1>;
        }

      default:
        return this.renderView(
          this.state.viewComponent,
          this.state.viewName,
          this.state.viewParams);
    }
  },

  onNotFound: function(event) {
    this.setState({
      viewName: null,
      scrollTop: 0,
      status: 'notFound'
    });
  },

  onNavigate: function(event) {
    var viewName = event.view;

    var view = this.getRouteView(viewName);
    if (!view) {
      debug("Not showing a view for", viewName);
      this.setState({
        viewName: null,
        scrollTop: 0,
        status: 'loading'
      });
      return;
    }

    var newScrollTop = event.scrollTop ||
      ((view.shouldTrackScrollTop && view.shouldTrackScrollTop()) ?
        this.state.scrollTops[viewName] : null) || 0;

    var newScrollTops = _.clone(this.state.scrollTops);
    newScrollTops[viewName] = newScrollTop;

    this.setState({
      viewName: viewName,
      viewComponent: view,
      viewParams: event.params,
      status: 'loaded',
      scrollTops: newScrollTops
    });
  },

  _updateScrollTop: function() {
    var y = this.state.windowScrollTop;

    ApplicationDispatcher.action('reportScrollTop', {
      scrollTop: y
    });

    var viewName = this.state.viewName;
    if (viewName && y !== this.state.scrollTops[viewName]) {
      var newScrollTops = _.clone(this.state.scrollTops);
      newScrollTops[viewName] = y;
      this.setState({
        scrollTops: newScrollTops
      });
    }
  }

};

module.exports = RouterMixin;
