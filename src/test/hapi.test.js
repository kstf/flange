/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Bluebird from 'bluebird';
import {hapiPlugin} from '../hapi';
import * as os from 'os';
chai.use(chaiAsPromised);
const expect = chai.expect;

import * as Hapi from 'hapi';
const aHapi = Bluebird.promisifyAll(Hapi);
const testServer = new aHapi.Server();


const testFlange = hapiPlugin({tmpDir: os.tmpdir()});


before(() => {
  testServer.connection({port: 3000});
  return testServer.registerAsync(
    testFlange,
    {
      routes: {
        prefix: '/flange',
      },
    }
  );
});

after(() => {
  testServer.stop();
});

describe('hapiPlugin', () => {
  describe('GET requests', () => {
    it('returns 200 on existing chunk', () => {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test200.txt',
        flowFilename: 'test200.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp',
      });
      testFlange.attributes.receiver.statusTracker['test200.txt'].chunkStates[0] = 'test200.txt.1';
      return testServer.injectAsync('/flange/upload?flowIdentifier=test200.txt&flowChunkNumber=1')
      .catch((err) => err)
      .then((response) => {
        expect(response).to.have.deep.property('statusCode', 200);
      });
    });
    it('returns 404 on invalid chunks', () => {
      return expect(testServer.injectAsync('/flange/upload?flowIdentifier=foo'))
      .to.eventually.be.rejectedWith().deep.property('statusCode', 404);
    });
    it('returns 204 on missing chunk', () => {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test204.txt',
        flowFilename: 'test204.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp',
      });
      return testServer.injectAsync('/flange/upload?flowIdentifier=test204.txt&flowChunkNumber=1')
      .catch((err) => err)
      .then((response) => {
        expect(response).to.have.deep.property('statusCode', 204);
      });
    });
  });
  describe('POST requests', () => {
    it('accepts file data for valid chunks');
    it('finalizes and returns 200 on the last chunk');
    it('generates appopriate errors on invalid requests');
  });
});
