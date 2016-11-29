'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hapiPlugin = hapiPlugin;

var _joi = require('joi');

var Joi = _interopRequireWildcard(_joi);

var _receiver = require('./receiver');

var _deepAssign = require('deep-assign');

var _deepAssign2 = _interopRequireDefault(_deepAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function hapiPlugin(options) {
  var receiver = new _receiver.Receiver(options);
  function plugin(server, _, next) {
    var baseGet = (0, _deepAssign2.default)({}, {
      method: 'GET',
      path: '/upload',
      handler: function handler(request, reply) {
        reply().code(receiver.testChunk(request.query));
      },
      config: {
        validate: {
          query: {
            flowChunkNumber: Joi.number().integer(),
            flowChunkSize: Joi.number().integer(),
            flowTotalSize: Joi.number().integer(),
            flowIdentifier: Joi.string(),
            flowFilename: Joi.string(),
            flowCurrentChunkSize: Joi.number().integer().optional(),
            flowTotalChunks: Joi.number().integer().optional(),
            flowRelativePath: Joi.string().optional()
          }
        }
      }
    }, options.getOptions || {});

    var basePost = (0, _deepAssign2.default)({}, {
      method: 'POST',
      path: '/upload',
      handler: function handler(request, reply) {
        receiver.handleChunk(request.payload, request.payload.file).then(function () {
          return reply().code(200);
        });
      },
      config: {
        payload: {
          maxBytes: 209715200,
          output: 'stream',
          parse: true,
          uploads: options.tmpDir
        },
        validate: {
          payload: {
            file: Joi.any(),
            flowChunkNumber: Joi.number().integer(),
            flowChunkSize: Joi.number().integer(),
            flowTotalSize: Joi.number().integer(),
            flowIdentifier: Joi.string(),
            flowFilename: Joi.string(),
            flowCurrentChunkSize: Joi.number().integer().optional(),
            flowTotalChunks: Joi.number().integer().optional(),
            flowRelativePath: Joi.string().optional()
          }
        }
      }
    }, options.postOptions || {});

    server.route([baseGet, basePost]);
    next();
  }
  plugin.attributes = {
    version: '1.0.0',
    name: 'flange',
    receiver: receiver
  };

  return plugin;
}