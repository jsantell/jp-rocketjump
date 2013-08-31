const { build: buildXPI } = require('./xpi/xpi-builder');
const { join } = require('sdk/fs/path');
const { defer } = require('sdk/core/promise');
const { pathFor } = require('sdk/system');
const { readFileSync } = require('sdk/io/fs');
const { buildForRun, buildForTest, buildGeneric } = require("./xpi/addon-options");
const { getPackage } = require('./xpi/packages-inspector');
const { toFilename } = require('sdk/url');
const self = require('sdk/self');

const tmp = pathFor('TmpD');

function build (dir, isTest) {
  let { promise, resolve, reject } = defer();

  dir = /^file:\/\//.test(dir) ? dir.replace('file://','') : dir;

  let manifest = getPackage(dir);
  let zipPath = join(tmp, manifest.id + '.xpi');
  let packages = {};
  packages[manifest.name] = manifest;
  packages['sdk'] = join(toFilename(self.data.url(''), '..', '..', 'sdk'));
  let options;
  
  if (isTest) 
    options = buildForTest({ packages: packages, mainPackageName: manifest.name });
  else 
  options = buildGeneric({
    packages: packages,
    mainPackageName: manifest.name
  });

  // options, manifest Object, path to xpi, use sym links bool
  buildXPI(options, manifest, zipPath, false).then(() => {
    resolve({
      xpi: zipPath,
      manifest: manifest
    });
  });
  return promise;
}
exports.build = build;

function test (dir) {
  return build(dir, true);
}
exports.test = test;
