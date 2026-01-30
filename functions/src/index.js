const functions = require("firebase-functions");
const { route } = require("./router");

exports.api = functions.https.onRequest((req, res) => route(req, res));
exports._route = route;
