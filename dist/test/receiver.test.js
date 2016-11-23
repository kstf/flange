'use strict';

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_chai2.default.use(_chaiAsPromised2.default); /* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

var expect = _chai2.default.expect;

describe('receiver', function () {
  describe('testChunk', function () {
    it('returns 404 on unknown chunk');
    it('returns 204 when a chunk is not uploaded yet');
    it('returns 200 when a chunk is uploaded');
  });
  describe('handleChunk', function () {
    it('saves incoming data to a chunk file');
    it('concatenates and deletes all chunk files when the last one is done uploading');
    it('ensures that the incoming chunk has the correct identifier');
    it('makes unique real filenames for all incoming files');
  });
});