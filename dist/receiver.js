'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Receiver = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _crypto = require('crypto');

var crypto = _interopRequireWildcard(_crypto);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _mime = require('mime');

var _mime2 = _interopRequireDefault(_mime);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import { handleError } from './handleError';

var Receiver = exports.Receiver = function () {
  function Receiver() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Receiver);

    this.options = Object.assign({}, opts);
    this.statusTracker = {};
    if (!fs.existsSync(this.options.tmpDir)) {
      fs.makefileSync(this.options.tmpDir);
    }
  }

  _createClass(Receiver, [{
    key: 'testChunk',
    value: function testChunk(chunkInfo) {
      var info = this.statusTracker[chunkInfo.flowIdentifier];
      if (!info) {
        return 404;
      } else {
        if (info.chunkStates[chunkInfo.flowChunkNumber - 1] === 'unseen') {
          return 204;
        } else {
          return 200;
        }
      }
    }
  }, {
    key: 'handleChunk',
    value: function handleChunk(chunkInfo, chunkBuffer) {
      var _this = this;

      var info = this.statusTracker[chunkInfo.flowIdentifier];
      if (!info) {
        throw new Error('Bad Token');
      } else {
        return _bluebird2.default.resolve().then(function () {
          if (info.chunkStates[chunkInfo.flowChunkNumber - 1] === 'unseen') {
            info.chunkStates[chunkInfo.flowChunkNumber - 1] = 'saving';
            return _this.saveChunk(chunkInfo, chunkBuffer);
          } else {
            // error state?
            return null;
          }
        }).then(function () {
          info.chunkStates[chunkInfo.flowChunkNumber - 1] = info.tokenKey + '.' + chunkInfo.flowChunkNumber;
          if (info.chunkStates.every(function (s) {
            return s !== 'unseen' && s !== 'saving';
          })) {
            return _this.concatAndFinalize(info);
          } else {
            return null;
          }
        });
      }
    }
  }, {
    key: 'saveChunk',
    value: function saveChunk(chunkInfo, chunkBuffer) {
      var _this2 = this;

      var info = this.statusTracker[chunkInfo.flowIdentifier];
      return new _bluebird2.default(function (resolve, reject) {
        var chunkFileName = info.tokenKey + '.' + chunkInfo.flowChunkNumber;
        var outStream = fs.createWriteStream(path.resolve(_this2.options.tmpDir, chunkFileName));
        outStream.on('finish', resolve);
        outStream.on('error', reject);
        chunkBuffer.pipe(outStream);
      });
    }
  }, {
    key: 'initiateUpload',
    value: function initiateUpload(info) {
      var buf = crypto.randomBytes(24);
      var tokenKey = Date.now() + '-' + buf.toString('hex');
      var fileInfo = {
        flowChunkSize: info.flowChunkSize,
        flowTotalSize: info.flowTotalSize,
        flowIdentifier: info.flowIdentifier,
        flowFilename: info.flowFilename,
        flowCurrentChunkSize: info.flowCurrentChunkSize,
        flowTotalChunks: info.flowTotalChunks,
        flowRelativePath: info.flowRelativePath,
        chunkStates: [],
        tokenKey: tokenKey
      };
      for (var i = 0; i < fileInfo.flowTotalChunks; i = i + 1) {
        fileInfo.chunkStates.push('unseen');
      }
      fileInfo.mimeType = _mime2.default.lookup(fileInfo.flowFilename);
      fileInfo.targetFilename = tokenKey + '.' + _mime2.default.extension(fileInfo.mimeType);
      this.statusTracker[fileInfo.flowIdentifier] = fileInfo;
    }
  }, {
    key: 'concatAndFinalize',
    value: function concatAndFinalize(info) {
      var _this3 = this;

      var outFile = fs.createWriteStream(path.resolve(this.options.tmpDir, info.targetFilename), { autoClose: false });
      return info.chunkStates.reduce(function (thenable, chunkFile) {
        return thenable.then(function () {
          return new _bluebird2.default(function (resolve, reject) {
            var chunkStream = fs.createReadStream(path.resolve(_this3.options.tmpDir, chunkFile));
            chunkStream.on('end', resolve);
            chunkStream.on('error', reject);
            chunkStream.pipe(outFile, { end: false });
          }).then(function () {
            return fs.unlinkSync(_this3.options.tmpDir, outFile);
          });
        });
      }, _bluebird2.default.resolve()).then(function () {
        fs.closeSync(outFile);
        if (_this3.options.onComplete) {
          return _this3.options.onComplete(info.targetFilename).then(function () {
            return info.targetFilename;
          });
        } else {
          return info.targetFilename;
        }
      }).catch(function (err) {
        fs.closeSync(outFile);
        throw err;
      });
    }
  }]);

  return Receiver;
}();