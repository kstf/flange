import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import mime from 'mime';
import Bluebird from 'bluebird';

export class Receiver {
  constructor(opts = {}) {
    this.options = Object.assign({}, opts);
    this.statusTracker = {};
    if (!fs.existsSync(this.options.tmpDir)) {
      fs.mkdirSync(this.options.tmpDir);
    }
  }

  testChunk(chunkInfo) {
    const info = this.statusTracker[chunkInfo.flowIdentifier];
    if (!info) {
      return 404;
    } else {
      if (info.chunkStates[chunkInfo.flowChunkNumber - 1] === 'unseen') {
        return 204;
      } else {
        return 200;
      }
    }
  }

  handleChunk(chunkInfo, chunkBuffer) {
    const info = this.statusTracker[chunkInfo.flowIdentifier];
    if (!info) {
      throw new Error('Bad Token');
    } else {
      return Bluebird.resolve()
      .then(() => {
        if (info.chunkStates[chunkInfo.flowChunkNumber - 1] === 'unseen') {
          info.chunkStates[chunkInfo.flowChunkNumber - 1] = 'saving';
          return this.saveChunk(chunkInfo, chunkBuffer);
        } else {
          // error state?
          return null;
        }
      })
      .then(() => {
        info.chunkStates[chunkInfo.flowChunkNumber - 1] = `${info.tokenKey}.${chunkInfo.flowChunkNumber}`;
        if (info.chunkStates.every((s) => ((s !== 'unseen') && (s !== 'saving')))) {
          return this.concatAndFinalize(info);
        } else {
          return null;
        }
      });
    }
  }

  saveChunk(chunkInfo, chunkBuffer) {
    const info = this.statusTracker[chunkInfo.flowIdentifier];
    return new Bluebird((resolve, reject) => {
      const chunkFileName = `${info.tokenKey}.${chunkInfo.flowChunkNumber}`;
      const outStream = fs.createWriteStream(path.resolve(this.options.tmpDir, chunkFileName));
      outStream.on('finish', resolve);
      outStream.on('error', reject);
      chunkBuffer.pipe(outStream);
    });
  }

  initiateUpload(info) {
    const buf = crypto.randomBytes(24);
    const tokenKey = `${Date.now()}-${buf.toString('hex')}`;
    const fileInfo = {
      flowChunkSize: info.flowChunkSize,
      flowTotalSize: info.flowTotalSize,
      flowIdentifier: info.flowIdentifier,
      flowFilename: info.flowFilename,
      flowCurrentChunkSize: info.flowCurrentChunkSize,
      flowTotalChunks: info.flowTotalChunks,
      flowRelativePath: info.flowRelativePath,
      chunkStates: [],
      tokenKey: tokenKey,
    };
    for (let i = 0; i < fileInfo.flowTotalChunks; i = i + 1) {
      fileInfo.chunkStates.push('unseen');
    }
    fileInfo.mimeType = mime.lookup(fileInfo.flowFilename);
    fileInfo.targetFilename = `${tokenKey}.${mime.extension(fileInfo.mimeType)}`;
    this.statusTracker[fileInfo.flowIdentifier] = fileInfo;
  }

  concatAndFinalize(info) {
    const outFile = fs.createWriteStream(
      path.resolve(this.options.tmpDir, info.targetFilename)
    );
    return info.chunkStates.reduce((thenable, chunkFile) => {
      return thenable.then(() => {
        return new Bluebird((resolve, reject) => {
          const chunkStream = fs.createReadStream(path.resolve(this.options.tmpDir, chunkFile));
          chunkStream.on('end', resolve);
          chunkStream.on('error', reject);
          chunkStream.pipe(outFile, {end: false});
        }).then(() => {
          return fs.unlinkSync(path.join(this.options.tmpDir, chunkFile));
        });
      });
    }, Bluebird.resolve())
    .then(() => {
      outFile.end();
      if (this.options.onComplete) {
        return this.options.onComplete(info.targetFilename)
        .then(() => info.targetFilename);
      } else {
        return info.targetFilename;
      }
    })
    .catch((err) => {
      outFile.end();
      throw err;
    });
  }
}
