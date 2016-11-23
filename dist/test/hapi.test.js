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

describe('hapiPlugin', function () {
  describe('GET requests', function () {
    it('returns 200 on existing chunk');
    it('returns 404 on invalid chunks');
    it('returns 204 on missing chunk');
  });
  describe('POST requests', function () {
    it('accepts file data for valid chunks');
    it('finalizes and returns 200 on the last chunk');
    it('generates appopriate errors on invalid requests');
  });
});