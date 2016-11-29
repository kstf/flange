/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { hapiPlugin } from '../hapi';
import streamToPromise from 'stream-to-promise';
import * as stream from 'stream';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
chai.use(chaiAsPromised);
const expect = chai.expect;

import * as Hapi from 'hapi';
const testServer = new Hapi.Server();
const testFile = fs.readFileSync(path.join(__dirname, 'hapi.test.js'));

const testFlange = hapiPlugin({tmpDir: os.tmpdir()});


before(() => {
  testServer.connection({port: 3000});
  return testServer.register(
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
      return expect(testServer.inject('/flange/upload?flowIdentifier=test200.txt&flowChunkNumber=1'))
      .to.eventually.have.deep.property('statusCode', 200);
    });
    it('returns 404 on invalid chunks', () => {
      return expect(testServer.inject('/flange/upload?flowIdentifier=foo'))
      .to.eventually.have.deep.property('statusCode', 404);
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
      return expect(testServer.inject('/flange/upload?flowIdentifier=test204.txt&flowChunkNumber=1'))
      .to.eventually.have.deep.property('statusCode', 204);
    });
  });
  describe('POST requests', () => {
    it('accepts file data for valid chunks', () => {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 3,
        flowIdentifier: 'testPost.txt',
        flowFilename: 'testPost.txt',
        flowCurrentChunkSize: testFile.length,
        flowTotalChunks: 3,
        flowRelativePath: '/tmp',
      });
      const postRequest = new FormData();
      postRequest.append('flowChunkNumber', 1);
      postRequest.append('flowChunkSize', testFile.length);
      postRequest.append('flowTotalSize', testFile.length * 3);
      postRequest.append('flowIdentifier', 'testPost.txt');
      postRequest.append('flowFilename', 'testPost.txt');
      postRequest.append('flowCurrentChunkSize', testFile.length);
      postRequest.append('flowTotalChunks', 3);
      postRequest.append('flowRelativePath', '/tmp');
      const fileStream = fs.createReadStream(path.join(__dirname, 'hapi.test.js'));
      postRequest.append('file', fileStream);
      return expect(streamToPromise(postRequest)
      .then((payload) => {
        return testServer.inject({
          url: '/flange/upload',
          method: 'POST',
          headers: postRequest.getHeaders(),
          payload: payload,
        });
      }))
      .to.eventually.have.deep.property('statusCode', 200)
      .then(() => {
        const outFile = fs.readFileSync(path.join(
          os.tmpdir(),
          testFlange.attributes.receiver.statusTracker['testPost.txt'].chunkStates[0])
        );
        return expect(outFile.toString()).to.equal(testFile.toString());
      });
    });
    it('finalizes and returns 200 on the last chunk');
    it('generates appopriate errors on invalid requests');
  });
});
