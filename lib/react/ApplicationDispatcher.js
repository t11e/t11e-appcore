'use strict';

var _ = require('underscore');
var Dispatcher = require('flux').Dispatcher;
var debug = require('debug')('ApplicationDispatcher');

var ApplicationDispatcher = _.extend(new Dispatcher(), {

  // Shorthand for `action('error', ...)`.
  error(err, options = {}) {
    this.action('error', _.extend({}, options, {err}));
  },

  // Shorthand for dispatching an action with a specific type and payload.
  action(type, payload) {
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
