import * as Joi from 'joi';
import { Receiver } from './receiver';
import deepAssign from 'deep-assign';

export function hapiPlugin(options) {
  const receiver = new Receiver(options);
  function plugin(server, _, next) {
    const baseGet = deepAssign(
      {},
      {
        method: 'GET',
        path: '/upload',
        handler: (request, reply) => {
          reply().code(receiver.testChunk(request.query));
        },
        config: {
          validate: {
            query: {
              flowChunkNumber: Joi.number().integer(),
              flowChunkSize: Joi.number().integer(),
              flowTotalSize: Joi.number().integer(),
              flowIdentifier: Joi.string(),
              flowFilename: Joi.string(),
              flowCurrentChunkSize: Joi.number().integer().optional(),
              flowTotalChunks: Joi.number().integer().optional(),
              flowRelativePath: Joi.string().optional(),
            },
          },
        },
      },
      options.getOptions || {}
    );

    const basePost = deepAssign(
      {},
      {
        method: 'POST',
        path: '/upload',
        handler: (request, reply) => {
          receiver.handleChunk(request.payload, request.payload.file)
          .then(() => reply().code(200));
        },
        config: {
          payload: {
            maxBytes: 209715200,
            output: 'stream',
            parse: true,
            uploads: options.tmpDir,
          },
          validate: {
            payload: {
              file: Joi.any(),
              flowChunkNumber: Joi.number().integer(),
              flowChunkSize: Joi.number().integer(),
              flowTotalSize: Joi.number().integer(),
              flowIdentifier: Joi.string(),
              flowFilename: Joi.string(),
              flowCurrentChunkSize: Joi.number().integer().optional(),
              flowTotalChunks: Joi.number().integer().optional(),
              flowRelativePath: Joi.string().optional(),
            },
          },
        },
      },
      options.postOptions || {}
    );

    server.route([baseGet, basePost]);
    next();
  }
  plugin.attributes = {
    version: '1.0.0',
    name: 'flange',
    receiver: receiver,
  };

  return plugin;
}
