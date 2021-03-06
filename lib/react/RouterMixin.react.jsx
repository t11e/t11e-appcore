'use strict';

import domEvent from 'dom-event';
import React from 'react';
import {clone, extend} from 'underscore';
import {DOMUtils} from 't11e-utils';

import ApplicationDispatcher from './ApplicationDispatcher';

const debug = require('debug')('RouterMixin');

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
// * `shouldViewTrackScrollTop(viewName)` — return true if the router should
//   preserve the scroll state of this view.
//
// In addition, in order to perform routing, the embedding component must
// listen to navigation events call `onNavigate(event)` and `onNotFound(event)` on
// itself. These are events emitted by `Router`.
//
// The embedded route view itself may support these methods:
//
// * `getTitle()` — return a title specific to the current state.
//
let RouterMixin = {

  getInitialState() {
    return {
      status: 'loading',
      viewName: null,
      viewComponent: null,
      scrollTops: {}
    };
  },

  componentDidMount() {
    domEvent.on(window, 'scroll', this._handleWindowScroll);
    this._handleWindowScroll();
  },

  componentWillMount() {
    domEvent.off(window, 'scroll', this._handleWindowScroll);
  },

  componentDidUpdate(prevProps, prevState) {
    let viewName = this.state.viewName;
    if (viewName !== prevState.viewName) {
      debug("Switch to view", viewName);

      // FIXME: This gives the UI a short grace period to render itself before we
      //   we restore the scrolltop. This doesn't guarantee that the UI has fully
      //   rendered.
      setTimeout(function() {
        DOMUtils.setWindowScrollTop(this.state.scrollTops[viewName]);
      }.bind(this), 100);
    }

    // Check if title has changed
    let view = this.refs.view;
    if (view && view.getTitle) {
      let title = view.getTitle();
      if (title !== this.state.title) {
        this.setState({title: title});
      }
    }

    if (prevState.title !== this.state.title && this.buildTitle) {
      document.title = this.buildTitle(this.state.title);
    }

    if (this.state.windowScrollTop !== prevState.windowScrollTop) {
      this._updateScrollTopState(this.state.windowScrollTop);
    }
  },

  render() {
    switch (this.state.status) {
      case 'loading':
        if (this.renderLoading) {
          return this.renderLoading();
        }
        break;

      case 'notFound':
        if (this.renderNotFound) {
          return this.renderNotFound();
        } else {
          return <h1>Not found</h1>;
        }
        break;

      default:
        return this.renderView(
          this.state.viewComponent,
          this.state.viewName,
          this.state.viewParams);
    }

    return null;
  },

  onNotFound(event) {
    this.setState({
      viewName: null,
      scrollTop: 0,
      status: 'notFound'
    });
  },

  onNavigate(event) {
    let viewName = event.view;

    let view = this.getRouteView(viewName);
    if (!view) {
      debug("Not showing a view for", viewName);
      this.setState({
        viewName: null,
        scrollTop: 0,
        status: 'loading'
      });
      return;
    }

    let newScrollTop;
    if (this.shouldViewTrackScrollTop && this.shouldViewTrackScrollTop(viewName)) {
      newScrollTop = (event.scrollTop !== undefined && event.scrollTop !== null) ?
        event.scrollTop : this.state.scrollTops[viewName];
    } else {
      newScrollTop = 0;
    }

    let scrollTops = clone(this.state.scrollTops);
    scrollTops[viewName] = newScrollTop;

    this.setState({
      viewName,
      viewComponent: view,
      viewParams: event.params,
      status: 'loaded',
      scrollTops
    });
  },

  _handleWindowScroll(/* event */) {
    if (this._scrollTopTimeoutId) {
      clearTimeout(this._scrollTopTimeoutId);
    }
    this._scrollTopTimeoutId = setTimeout(() => {
      this.setState({windowScrollTop: DOMUtils.getWindowScrollTop()});
    }, 500);
  },

  _updateScrollTopState(y) {
    ApplicationDispatcher.action('reportScrollTop', {scrollTop: y});

    const viewName = this.state.viewName;
    if (viewName && y !== this.state.scrollTops[viewName]) {
      this.setState({scrollTops: extend(clone(this.state.scrollTops), {[viewName]: y})});
    }
  }

};

export default RouterMixin;

module.exports = RouterMixin;  // Backwards compatibility
