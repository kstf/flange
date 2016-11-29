/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { hapiPlugin } from '../hapi';
import streamToPromise from 'stream-to-promise';
import Bluebird from 'bluebird';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import rimraf from 'rimraf';
import FormData from 'form-data';
chai.use(chaiAsPromised);
const expect = chai.expect;

import * as Hapi from 'hapi';
const testServer = new Hapi.Server();
const testFile = fs.readFileSync(path.join(__dirname, 'hapi.test.js'));
const tmpDir = path.join(os.tmpdir(), 'flangeHapiTest');

const testFlange = hapiPlugin({tmpDir: tmpDir});


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
  return new Bluebird((resolve) => {
    rimraf(tmpDir, () => resolve());
  }).then(() => testServer.stop());
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
          tmpDir,
          testFlange.attributes.receiver.statusTracker['testPost.txt'].chunkStates[0])
        );
        return expect(outFile.toString()).to.equal(testFile.toString());
      });
    });
    it('finalizes and returns 200 on the last chunk', () => {
      testFlange.attributes.receiver.initiateUpload({
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 2,
        flowIdentifier: 'testPost2.txt',
        flowFilename: 'testPost2.txt',
        flowCurrentChunkSize: testFile.length,
        flowTotalChunks: 2,
        flowRelativePath: '/tmp',
      });
      const postRequest1 = new FormData();
      postRequest1.append('flowChunkNumber', 1);
      postRequest1.append('flowChunkSize', testFile.length);
      postRequest1.append('flowTotalSize', testFile.length * 2);
      postRequest1.append('flowIdentifier', 'testPost2.txt');
      postRequest1.append('flowFilename', 'testPost2.txt');
      postRequest1.append('flowCurrentChunkSize', testFile.length);
      postRequest1.append('flowTotalChunks', 2);
      postRequest1.append('flowRelativePath', '/tmp');
      const fileStream1 = fs.createReadStream(path.join(__dirname, 'hapi.test.js'));
      postRequest1.append('file', fileStream1);
      const postRequest2 = new FormData();
      postRequest2.append('flowChunkNumber', 2);
      postRequest2.append('flowChunkSize', testFile.length);
      postRequest2.append('flowTotalSize', testFile.length * 2);
      postRequest2.append('flowIdentifier', 'testPost2.txt');
      postRequest2.append('flowFilename', 'testPost2.txt');
      postRequest2.append('flowCurrentChunkSize', testFile.length);
      postRequest2.append('flowTotalChunks', 2);
      postRequest2.append('flowRelativePath', '/tmp');
      const fileStream2 = fs.createReadStream(path.join(__dirname, 'hapi.test.js'));
      postRequest2.append('file', fileStream2);
      Bluebird.all([streamToPromise(postRequest1), streamToPromise(postRequest2)])
      .then(([p1, p2]) => {
        return Bluebird.all([
          testServer.inject({
            url: '/flange/upload',
            method: 'POST',
            headers: postRequest1.getHeaders(),
            payload: p1,
          }),
          testServer.inject({
            url: '/flange/upload',
            method: 'POST',
            headers: postRequest2.getHeaders(),
            payload: p2,
          }),
        ]);
      })
      .then(([r1, r2]) => {
        return [
          expect(r1).to.have.deep.property('statusCode', 200),
          expect(r2).to.have.deep.property('statusCode', 200),
        ];
      })
      .then(() => {
        const outFile = fs.readFileSync(path.join(
          tmpDir,
          testFlange.attributes.receiver.statusTracker['testPost2.txt'].targetFilename)
        );
        return expect(outFile.toString()).to.equal(testFile.toString() + testFile.toString());
      });
    });
    it('generates appopriate errors on invalid requests');
  });
});
