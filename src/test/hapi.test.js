/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Bluebird from 'bluebird';
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('hapiPlugin', () => {
  describe('GET requests', () => {
    it('returns 200 on existing chunk');
    it('returns 404 on invalid chunks');
    it('returns 204 on missing chunk');
  });
  describe('POST requests', () => {
    it('accepts file data for valid chunks');
    it('finalizes and returns 200 on the last chunk');
    it('generates appopriate errors on invalid requests');
  });
});
