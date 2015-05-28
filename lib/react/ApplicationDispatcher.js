'use strict';

import {extend} from 'underscore';
import {Dispatcher} from 'flux';

const debug = require('debug')('ApplicationDispatcher');

class BaseApplicationDispatcher extends Dispatcher {

  // Shorthand for `action('error', ...)`.
  error(err, options = {}) {
    this.action('error', extend({}, options, {err}));
  }

  // Shorthand for dispatching an action with a specific type and payload.
  action(type, payload) {
    var action;
    if (payload) {
      action = extend({}, payload, {actionType: type});
    } else {
      action = {actionType: type};
    }
    debug('Action: ' + type, action);
    this.dispatch(action);
  }

}

export const ApplicationDispatcher = new BaseApplicationDispatcher();
export default ApplicationDispatcher;

module.exports = ApplicationDispatcher;  // For backwards compatibility
