/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Bluebird from 'bluebird';
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('receiver', () => {
  describe('testChunk', () => {
    it('returns 404 on unknown chunk');
    it('returns 204 when a chunk is not uploaded yet');
    it('returns 200 when a chunk is uploaded');
  });
  describe('handleChunk', () => {
    it('saves incoming data to a chunk file');
    it('concatenates and deletes all chunk files when the last one is done uploading');
    it('ensures that the incoming chunk has the correct identifier');
    it('makes unique real filenames for all incoming files');
  });
});
