'use strict';

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _hapi = require('../hapi');

var _streamToPromise = require('stream-to-promise');

var _streamToPromise2 = _interopRequireDefault(_streamToPromise);

var _stream = require('stream');

var stream = _interopRequireWildcard(_stream);

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

_chai2.default.use(_chaiAsPromised2.default); /* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

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
    it('finalizes and returns 200 on the last chunk');
    it('generates appopriate errors on invalid requests');
  });
});