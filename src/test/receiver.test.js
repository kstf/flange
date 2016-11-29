/* eslint-env node, mocha*/
/* eslint no-shadow: 0 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Bluebird from 'bluebird';
import * as os from 'os';
import * as fs from 'fs';
import { Receiver } from '../receiver';
import * as path from 'path';
import rimraf from 'rimraf';

chai.use(chaiAsPromised);
const expect = chai.expect;
const tmpDir = path.join(os.tmpdir(), 'flangeBaseTest');
const testFile = fs.readFileSync(path.join(__dirname, 'receiver.test.js'));

after(() => {
  return new Bluebird((resolve) => {
    rimraf(tmpDir, () => resolve());
  });
});

describe('receiver', () => {
  describe('testChunk', () => {
    it('returns 404 on unknown chunk', () => {
      const testReceiver = new Receiver({tmpDir: tmpDir});
      return expect(testReceiver.testChunk({flowIdentifier: 'foo'})).to.equal(404);
    });
    it('returns 204 when a chunk is not uploaded yet', () => {
      const testReceiver = new Receiver({tmpDir: tmpDir});
      testReceiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test204.txt',
        flowFilename: 'test204.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp',
      });
      return expect(testReceiver.testChunk({flowIdentifier: 'test204.txt', flowChunkNumber: 1}))
      .to.equal(204);
    });
    it('returns 200 when a chunk is uploaded', () => {
      const testReceiver = new Receiver({tmpDir: tmpDir});
      testReceiver.initiateUpload({
        flowChunkSize: 100,
        flowTotalSize: 1000,
        flowIdentifier: 'test200.txt',
        flowFilename: 'test200.txt',
        flowCurrentChunkSize: 100,
        flowTotalChunks: 10,
        flowRelativePath: '/tmp',
      });
      testReceiver.statusTracker['test200.txt'].chunkStates[0] = 'test200.txt.1';
      return expect(testReceiver.testChunk({flowIdentifier: 'test200.txt', flowChunkNumber: 1}))
      .to.equal(200);
    });
  });
  describe('handleChunk', () => {
    it('saves incoming data to a chunk file', () => {
      const testReceiver = new Receiver({tmpDir: tmpDir});
      const chunkInfo = {
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 2,
        flowIdentifier: 'testFile.txt',
        flowFilename: 'testFile.txt',
        flowCurrentChunkSize: testFile.length,
        flowChunkNumber: 1,
        flowTotalChunks: 2,
        flowRelativePath: '/tmp',
      };
      testReceiver.initiateUpload(chunkInfo);
      return testReceiver.handleChunk(chunkInfo, fs.createReadStream(path.join(__dirname, 'receiver.test.js')))
      .then(() => {
        expect(testReceiver.testChunk({flowIdentifier: 'testFile.txt', flowChunkNumber: 1}))
        .to.equal(200);
        const outFile = fs.readFileSync(path.join(
          tmpDir,
          testReceiver.statusTracker['testFile.txt'].chunkStates[0]
        ));
        return expect(outFile.toString()).to.equal(testFile.toString());
      });
    });
    it('concatenates and deletes all chunk files when the last one is done uploading', () => {
      const testReceiver = new Receiver({tmpDir: tmpDir});
      const chunkInfo = {
        flowChunkSize: testFile.length,
        flowTotalSize: testFile.length * 2,
        flowIdentifier: 'testFile.txt',
        flowFilename: 'testFile.txt',
        flowCurrentChunkSize: testFile.length,
        flowTotalChunks: 2,
        flowRelativePath: '/tmp',
      };
      testReceiver.initiateUpload(chunkInfo);
      const c1 = Object.assign({}, chunkInfo, {flowChunkNumber: 1});
      const c2 = Object.assign({}, chunkInfo, {flowChunkNumber: 2});
      return Bluebird.all([
        testReceiver.handleChunk(c1, fs.createReadStream(path.join(__dirname, 'receiver.test.js'))),
        testReceiver.handleChunk(c2, fs.createReadStream(path.join(__dirname, 'receiver.test.js'))),
      ])
      .then(() => {
        expect(testReceiver.testChunk({flowIdentifier: 'testFile.txt', flowChunkNumber: 1}))
        .to.equal(200);
        expect(testReceiver.testChunk({flowIdentifier: 'testFile.txt', flowChunkNumber: 2}))
        .to.equal(200);
        expect(() => fs.statSync(path.join(tmpDir, testReceiver.statusTracker['testFile.txt'].chunkStates[0])))
        .to.throw(/ENOENT/);
        const outFile = fs.readFileSync(path.join(
          tmpDir,
          testReceiver.statusTracker['testFile.txt'].targetFilename
        ));
        return expect(outFile.toString()).to.equal(testFile.toString() + testFile.toString());
      });
    });
    it('ensures that the incoming chunk has the correct identifier');
    it('makes unique real filenames for all incoming files');
  });
});
