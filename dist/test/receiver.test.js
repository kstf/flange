'use strict';

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _os = require('os');

var os = _interopRequireWildcard(_os);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _receiver = require('../receiver');

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

_chai2.default.use(_chaiAsPromised2.default);
var expect = _chai2.default.expect;
var tmpDir = path.join(os.tmpdir(), 'flangeBaseTest');
var testFile = fs.readFileSync(path.join(__dirname, 'receiver.test.js'));

after(function () {
  return new _bluebird2.default(function (resolve) {
    (0, _rimraf2.default)(tmpDir, function () {
      return resolve();
    });
  });
});

describe('receiver', function () {
  describe('testChunk', function () {
    it('returns 404 on unknown chunk', function () {
      var testReceiver = new _receiver.Receiver({ tmpDir: tmpDir });
      return expect(testReceiver.testChunk({ flowIdentifier: 'foo' })).to.equal(404);
    });
    it('returns 204 when a chunk is not uploaded yet', function () {
      var testReceiver = new _receiver.Receiver({ tmpDir: tmpDir });
      testReceiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test204.txt',
        flowFilename: 'test204.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp'
      });
      return expect(testReceiver.testChunk({ flowIdentifier: 'test204.txt', flowChunkNumber: 1 })).to.equal(204);
    });
    it('returns 200 when a chunk is uploaded', function () {
      var testReceiver = new _receiver.Receiver({ tmpDir: tmpDir });
      testReceiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test200.txt',
        flowFilename: 'test200.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp'
      });
      testReceiver.statusTracker['test200.txt'].chunkStates[0] = 'test200.txt.1';
      return expect(testReceiver.testChunk({ flowIdentifier: 'test200.txt', flowChunkNumber: 1 })).to.equal(200);
    });
  });
  describe('handleChunk', function () {
    it('saves incoming data to a chunk file', function () {
      var testReceiver = new _receiver.Receiver({ tmpDir: tmpDir });
      var chunkInfo = {
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 2,
        flowIdentifier: 'testFile.txt',
        flowFilename: 'testFile.txt',
        flowCurrentChunkSize: testFile.length,
        flowChunkNumber: 1,
        flowTotalChunks: 2,
        flowRelativePath: '/tmp'
      };
      testReceiver.initiateUpload(chunkInfo);
      return testReceiver.handleChunk(chunkInfo, fs.createReadStream(path.join(__dirname, 'receiver.test.js'))).then(function () {
        expect(testReceiver.testChunk({ flowIdentifier: 'testFile.txt', flowChunkNumber: 1 })).to.equal(200);
        var outFile = fs.readFileSync(path.join(tmpDir, testReceiver.statusTracker['testFile.txt'].chunkStates[0]));
        return expect(outFile.toString()).to.equal(testFile.toString());
      });
    });
    it('concatenates and deletes all chunk files when the last one is done uploading', function () {
      var testReceiver = new _receiver.Receiver({ tmpDir: tmpDir });
      var chunkInfo = {
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 2,
        flowIdentifier: 'testFile.txt',
        flowFilename: 'testFile.txt',
        flowCurrentChunkSize: testFile.length,
        flowTotalChunks: 2,
        flowRelativePath: '/tmp'
      };
      testReceiver.initiateUpload(chunkInfo);
      var c1 = Object.assign({}, chunkInfo, { flowChunkNumber: 1 });
      var c2 = Object.assign({}, chunkInfo, { flowChunkNumber: 2 });
      return _bluebird2.default.all([testReceiver.handleChunk(c1, fs.createReadStream(path.join(__dirname, 'receiver.test.js'))), testReceiver.handleChunk(c2, fs.createReadStream(path.join(__dirname, 'receiver.test.js')))]).then(function () {
        expect(testReceiver.testChunk({ flowIdentifier: 'testFile.txt', flowChunkNumber: 1 })).to.equal(200);
        expect(testReceiver.testChunk({ flowIdentifier: 'testFile.txt', flowChunkNumber: 2 })).to.equal(200);
        expect(function () {
          return fs.statSync(path.join(tmpDir, testReceiver.statusTracker['testFile.txt'].chunkStates[0]));
        }).to.throw(/ENOENT/);
        var outFile = fs.readFileSync(path.join(tmpDir, testReceiver.statusTracker['testFile.txt'].targetFilename));
        return expect(outFile.toString()).to.equal(testFile.toString() + testFile.toString());
      });
    });
    it('ensures that the incoming chunk has the correct identifier');
    it('makes unique real filenames for all incoming files');
  });
});