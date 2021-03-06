// @flow

import flatten from 'lodash/flatten';
import dynamicImportPlugin from 'babel-plugin-dynamic-import-node';

import { buildWorkerError } from '../utils/worker-error-handler';
import getDependencies from './get-require-statements';

self.importScripts([
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.26.0/babel.min.js',
]);

self.postMessage('ready');

declare var Babel: {
  transform: (
    code: string,
    config: Object,
  ) => {
    ast: Object,
    code: string,
  },
  availablePlugins: { [key: string]: Function },
  registerPlugin: (name: string, plugin: Function) => void,
};

Babel.registerPlugin('dynamic-import-node', dynamicImportPlugin);

self.addEventListener('message', async event => {
  const { code, path, config } = event.data;

  if (
    flatten(config.plugins).includes('transform-vue-jsx') &&
    !Object.keys(Babel.availablePlugins).includes('transform-vue-jsx')
  ) {
    const vuePlugin = await import('babel-plugin-transform-vue-jsx');
    Babel.registerPlugin('transform-vue-jsx', vuePlugin);
  }

  if (
    flatten(config.plugins).includes('jsx-pragmatic') &&
    !Object.keys(Babel.availablePlugins).includes('jsx-pragmatic')
  ) {
    const pragmaticPlugin = await import('babel-plugin-jsx-pragmatic');
    Babel.registerPlugin('jsx-pragmatic', pragmaticPlugin);
  }

  const plugins = [...config.plugins, 'dynamic-import-node'];

  const customConfig = {
    ...config,
    plugins,
  };

  try {
    const result = Babel.transform(code, customConfig);

    const dependencies = getDependencies(result.ast);

    dependencies.forEach(dependency => {
      if (/^(\w|@)/.test(dependency.path) && !dependency.path.includes('!')) {
        // Don't push dependencies
        return;
      }

      self.postMessage({
        type: 'add-dependency',
        path: dependency.path,
        isGlob: dependency.type === 'glob',
      });
    });

    self.postMessage({
      type: 'compiled',
      transpiledCode: result.code,
    });
  } catch (e) {
    e.message = e.message.replace('unknown', path);
    self.postMessage({
      type: 'error',
      error: buildWorkerError(e),
    });
  }
});
