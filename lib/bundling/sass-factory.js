'use strict';

import sass from 'node-sass';
import fs from 'fs';
import path from 'path';

function relativePath(p) {
  let cwd = process.cwd();
  let fileName = path.resolve(p);
  if (fileName.indexOf(cwd) === 0) {
    fileName = '.' + fileName.substring(cwd.length);
  }
  return fileName;
}

function formatError(err) {
  let out = '';
  if (err.file) {
    if (err.line && err.column) {
      out += relativePath(err.file) + ":" + err.line + "\n";

      let lineNumber = err.line.toString();
      while (lineNumber.length < 10) {
        lineNumber = ' ' + lineNumber;
      }
      lineNumber += ': ';
      let line = fs.readFileSync(err.file, 'utf8').toString().split("\n")[err.line - 1];
      out += lineNumber + line + "\n";

      let caret = '';
      for (let i = 0; i < lineNumber.length + err.column - 1; i++) {
        caret += ' ';
      }
      caret += '^';
      out += caret + "\n";
    } else {
      out += relativePath(err.file) + "\n";
    }
  }

  let match = /^(.*)\nBacktrace:\n(.*)/m.exec(err.message);
  if (match) {
    let message = "SASS compilation error: " +
      match[1].substring(0, 1).toUpperCase() +
      match[1].substring(1);
    let stackTrace = match[2].split("\n").map(function(v) {
      let vv = v.replace(/^\t/, '').split(':');
      return [relativePath(vv[0]), vv[1]];
    });
    out += message + "\n";
    stackTrace.forEach(function(entry) {
      out += "    at " + entry[0] + ":" + entry[1] + "\n";
    });
  }
  return out.trim();
}

function sassFactory(entrypoint) {
  let environment = process.env.NODE_ENV || (process.env.NODE_ENV = 'development');
  return function(callback) {
    sass.render({
      file: entrypoint,
      includePaths: [],
      sourceComments: environment === 'development' ? 'map' : false,
      sourceMap: false,
      outputStyle: environment === 'development' ? 'nested' : 'compressed'
    }, (err, result) => {
      if (err) {
        let message = formatError(err);
        console.log(message);

        if (environment === 'development') {
          callback(null, "body:before { " +
            "white-space: pre; " +
            "position: fixed; " +
            "top: 0; " +
            "left: 0; " +
            "width: 100%; " +
            "padding: 20px; " +
            "color: #222; " +
            "box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3); " +
            "background: rgba(255, 255, 255, 0.9); " +
            "font-weight: bold; " +
            "font-family: monospace; " +
            "font-size: 14px; " +
            "content: \"" +
              message.replace(/"/g, "\\\"").replace(/\n/g, "\\A ") + "\"; }");
        } else {
          callback(err);
        }
      } else {
        callback(null, result.css);
      }
    });
  };
}

export default sassFactory;

module.exports = sassFactory;  // Backwards compatibility
