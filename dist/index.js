'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Receiver = exports.hapi = undefined;

var _receiver = require('./receiver');

var _hapi = require('./hapi');

var hapi = _interopRequireWildcard(_hapi);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.hapi = hapi;
exports.Receiver = _receiver.Receiver;