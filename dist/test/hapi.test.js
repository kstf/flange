'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); /* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _hapi = require('../hapi');

var _streamToPromise = require('stream-to-promise');

var _streamToPromise2 = _interopRequireDefault(_streamToPromise);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _os = require('os');

var os = _interopRequireWildcard(_os);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _formData = require('form-data');

var _formData2 = _interopRequireDefault(_formData);

var _hapi2 = require('hapi');

var Hapi = _interopRequireWildcard(_hapi2);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_chai2.default.use(_chaiAsPromised2.default);
var expect = _chai2.default.expect;

var testServer = new Hapi.Server();
var testFile = fs.readFileSync(path.join(__dirname, 'hapi.test.js'));

var testFlange = (0, _hapi.hapiPlugin)({ tmpDir: os.tmpdir() });

before(function () {
  testServer.connection({ port: 3000 });
  return testServer.register(testFlange, {
    routes: {
      prefix: '/flange'
    }
  });
});

after(function () {
  testServer.stop();
});

describe('hapiPlugin', function () {
  describe('GET requests', function () {
    it('returns 200 on existing chunk', function () {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test200.txt',
        flowFilename: 'test200.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp'
      });
      testFlange.attributes.receiver.statusTracker['test200.txt'].chunkStates[0] = 'test200.txt.1';
      return expect(testServer.inject('/flange/upload?flowIdentifier=test200.txt&flowChunkNumber=1')).to.eventually.have.deep.property('statusCode', 200);
    });
    it('returns 404 on invalid chunks', function () {
      return expect(testServer.inject('/flange/upload?flowIdentifier=foo')).to.eventually.have.deep.property('statusCode', 404);
    });
    it('returns 204 on missing chunk', function () {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test204.txt',
        flowFilename: 'test204.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp'
      });
      return expect(testServer.inject('/flange/upload?flowIdentifier=test204.txt&flowChunkNumber=1')).to.eventually.have.deep.property('statusCode', 204);
    });
  });
  describe('POST requests', function () {
    it('accepts file data for valid chunks', function () {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 3,
        flowIdentifier: 'testPost.txt',
        flowFilename: 'testPost.txt',
        flowCurrentChunkSize: testFile.length,
        flowTotalChunks: 3,
        flowRelativePath: '/tmp'
      });
      var postRequest = new _formData2.default();
      postRequest.append('flowChunkNumber', 1);
      postRequest.append('flowChunkSize', testFile.length);
      postRequest.append('flowTotalSize', testFile.length * 3);
      postRequest.append('flowIdentifier', 'testPost.txt');
      postRequest.append('flowFilename', 'testPost.txt');
      postRequest.append('flowCurrentChunkSize', testFile.length);
      postRequest.append('flowTotalChunks', 3);
      postRequest.append('flowRelativePath', '/tmp');
      var fileStream = fs.createReadStream(path.join(__dirname, 'hapi.test.js'));
      postRequest.append('file', fileStream);
      return expect((0, _streamToPromise2.default)(postRequest).then(function (payload) {
        return testServer.inject({
          url: '/flange/upload',
          method: 'POST',
          headers: postRequest.getHeaders(),
          payload: payload
        });
      })).to.eventually.have.deep.property('statusCode', 200).then(function () {
        var outFile = fs.readFileSync(path.join(os.tmpdir(), testFlange.attributes.receiver.statusTracker['testPost.txt'].chunkStates[0]));
        return expect(outFile.toString()).to.equal(testFile.toString());
      });
    });
    it('finalizes and returns 200 on the last chunk', function () {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 2,
        flowIdentifier: 'testPost2.txt',
        flowFilename: 'testPost2.txt',
        flowCurrentChunkSize: testFile.length,
        flowTotalChunks: 2,
        flowRelativePath: '/tmp'
      });
      var postRequest1 = new _formData2.default();
      postRequest1.append('flowChunkNumber', 1);
      postRequest1.append('flowChunkSize', testFile.length);
      postRequest1.append('flowTotalSize', testFile.length * 2);
      postRequest1.append('flowIdentifier', 'testPost2.txt');
      postRequest1.append('flowFilename', 'testPost2.txt');
      postRequest1.append('flowCurrentChunkSize', testFile.length);
      postRequest1.append('flowTotalChunks', 2);
      postRequest1.append('flowRelativePath', '/tmp');
      var fileStream1 = fs.createReadStream(path.join(__dirname, 'hapi.test.js'));
      postRequest1.append('file', fileStream1);
      var postRequest2 = new _formData2.default();
      postRequest2.append('flowChunkNumber', 2);
      postRequest2.append('flowChunkSize', testFile.length);
      postRequest2.append('flowTotalSize', testFile.length * 2);
      postRequest2.append('flowIdentifier', 'testPost2.txt');
      postRequest2.append('flowFilename', 'testPost2.txt');
      postRequest2.append('flowCurrentChunkSize', testFile.length);
      postRequest2.append('flowTotalChunks', 2);
      postRequest2.append('flowRelativePath', '/tmp');
      var fileStream2 = fs.createReadStream(path.join(__dirname, 'hapi.test.js'));
      postRequest2.append('file', fileStream2);
      _bluebird2.default.all([(0, _streamToPromise2.default)(postRequest1), (0, _streamToPromise2.default)(postRequest2)]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            p1 = _ref2[0],
            p2 = _ref2[1];

        return _bluebird2.default.all([testServer.inject({
          url: '/flange/upload',
          method: 'POST',
          headers: postRequest1.getHeaders(),
          payload: p1
        }), testServer.inject({
          url: '/flange/upload',
          method: 'POST',
          headers: postRequest2.getHeaders(),
          payload: p2
        })]);
      }).then(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2),
            r1 = _ref4[0],
            r2 = _ref4[1];

        return [expect(r1).to.have.deep.property('statusCode', 200), expect(r2).to.have.deep.property('statusCode', 200)];
      }).then(function () {
        var outFile = fs.readFileSync(path.join(os.tmpdir(), testFlange.attributes.receiver.statusTracker['testPost2.txt'].targetFilename));
        return expect(outFile.toString()).to.equal(testFile.toString() + testFile.toString());
      });
    });
    it('generates appopriate errors on invalid requests');
  });
});