require("./stream.polyfill");

let newServer, oldServer;
if (process.env.NODE_ENV === "production") {
  newServer = require("react-dom/cjs/react-dom-server.node.production.min.js");
  oldServer = require("react-dom/cjs/react-dom-server-legacy.browser.production.min.js");
} else {
  newServer = require("react-dom/cjs/react-dom-server.node.development.js");
  oldServer = require("react-dom/cjs/react-dom-server-legacy.browser.development.js");
}

exports.version = oldServer.version;
exports.renderToString = oldServer.renderToString;
exports.renderToStaticMarkup = oldServer.renderToStaticMarkup;
exports.renderToPipeableStream = newServer.renderToPipeableStream;
