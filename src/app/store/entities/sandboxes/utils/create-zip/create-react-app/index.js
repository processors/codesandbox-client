import type { Sandbox, Module, Directory } from 'common/types';

/* eslint-disable */
// import favicon from '!base64-loader!./files/favicon.ico'; // $FlowIssue
// import gitignore from '!raw-loader!./files/.gitignore'; // $FlowIssue
// import manifest from '!raw-loader!./files/manifest.json'; // $FlowIssue
// import serviceWorker from '!raw-loader!./files/createServiceWorker'; // $FlowIssue
// import README from './files/README.md'; // $FlowIssue
/* eslint-enable */

import {
  getResourceTag,
  getIndexHtmlBody,
  createPackageJSON,
  createDirectoryWithFiles,
} from '../';

const getHTML = (modules, resources) =>
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="theme-color" content="#000000">
  <!--
    manifest.json provides metadata used when your web app is added to the
    homescreen on Android. See https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/
  -->
  <link rel="manifest" href="%PUBLIC_URL%/manifest.json">
  <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
  <!--
    Notice the use of %PUBLIC_URL% in the tags above.
    It will be replaced with the URL of the \`public\` folder during the build.
    Only files inside the \`public\` folder can be referenced from the HTML.

    Unlike "/favicon.ico" or "favicon.ico", "%PUBLIC_URL%/favicon.ico" will
    work correctly both with client-side routing and a non-root public URL.
    Learn how to configure a non-root public URL by running \`npm run build\`.
  -->
  <title>React App</title>
  ${resources.map(getResourceTag).join('\n')}
</head>
<body>
  ${getIndexHtmlBody(modules)}
  <!--
    This HTML file is a template.
    If you open it directly in the browser, you will see an empty page.

    You can add webfonts, meta tags, or analytics to this file.
    The build step will place the bundled scripts into the <body> tag.

    To begin the development, run \`npm start\` or \`yarn start\`.
    To create a production bundle, use \`npm run build\` or \`yarn build\`.
  -->
</body>
</html>
`;

const files = {};
function importAll(r) {
  r.keys().forEach(key => (files[key] = r(key)));
}

export default function createZip(
  zip,
  sandbox: Sandbox,
  modules: Array<Module>,
  directories: Array<Directory>,
) {
  importAll(require.context('./files', true, /.*/));

  const src = zip.folder('src');
  src.file('createServiceWorker.js', files['./createServiceWorker.js']);
  modules
    .filter(x => x.directoryShortid == null)
    .filter(x => x.title !== 'index.html') // This will be included in the body
    .forEach(x => src.file(x.title, x.code));

  directories
    .filter(x => x.directoryShortid == null)
    .forEach(x => createDirectoryWithFiles(modules, directories, x, src));

  const publicFolder = zip.folder('public');

  publicFolder.file('favicon.ico', files['./favicon.ico'], {
    base64: true,
  });

  publicFolder.file('index.html', getHTML(modules, sandbox.externalResources));
  publicFolder.file('manifest.json', files['./manifest.json']);

  if (
    !modules.find(x => x.directoryShortid == null && x.title === 'README.md')
  ) {
    zip.file('README.md', files['./README.md']);
  }
  zip.file(
    'package.json',
    createPackageJSON(
      sandbox,
      {},
      {
        'react-scripts': '1.0.0',
      },
      {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test --env=jsdom',
        eject: 'react-scripts eject',
      },
    ),
  );
  zip.file('.gitignore', files['./gitignore']);
}
