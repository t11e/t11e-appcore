'use strict';

var _ = require('underscore');
var React = require('react');
var Dispatcher = require('flux').Dispatcher;
var debug = require('debug')('ApplicationDispatcher');

var ApplicationDispatcher = _.extend(new Dispatcher(), {

  // Shorthand for `action('error', {err: err})`.
  error: function(err) {
    this.action('error', {err: err});
  },

  // Shorthand for dispatching an action with a specific type and payload.
  action: function(type, payload) {
    var action;
    if (payload) {
      action = _.extend({}, payload, {actionType: type});
    } else {
      action = {actionType: type};
    }
    debug('Action: ' + type, action);
    this.dispatch(action);
  }

});

module.exports = ApplicationDispatcher;
