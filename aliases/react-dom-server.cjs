require("./stream.polyfill");

let newServer;
if (process.env.NODE_ENV === "production") {
  newServer = require("react-dom/cjs/react-dom-server.node.production.min.js");
} else {
  newServer = require("react-dom/cjs/react-dom-server.node.development.js");
}

exports.version = oldServer.version;
exports.renderToPipeableStream = newServer.renderToPipeableStream;
