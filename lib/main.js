/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { on: onSystem } = require('sdk/system/events');
const { UI } = require('./ui');
let { watchFile, unwatchFile, watchDir } = require('./fs');
const { build, test } = require('./xpi');
const { install } = require('sdk/addon/installer');
const { on, off, emit } = require('sdk/event/core');
const { prefs } = require('sdk/simple-prefs');
const { getMap, setMap } = require('./mapping');

let ui;

function buildAddon (dir, isTest) {
  let pkg;
  let builder = isTest ? test : build;
  builder(dir).then(({ xpi, manifest }) => {
    pkg = manifest
    return install(xpi);
  }).then((val) => {
    setMap(pkg.id + '@jetpack', dir);
    ui.reparse();
  }, (val) => console.log("FAILED?!?!", val)).then(console.log,console.log);
}

function watcher (curr, prev) {
  buildAddon();
}

onSystem('document-shown', documentShown);

function documentShown ({subject: document}) {
  if (document.URL !== 'about:addons') return;
  require('sdk/timers').setTimeout(function () {
    buildUI(document);
  }, 500);
}

function buildUI (document) {
  ui = UI(document);
  on(ui, 'file', function (path) { 
    buildAddon(path);
  });

  on(ui, 'action', function ({ target, data }) {
    if (data === 'save') {
      watchDir(getMap(target), { persistent:true, interval: 500 }, () => { 
        buildAddon(getMap(target));
      });
    }
    if (data === 'reload')
      buildAddon(getMap(target));
    if (data === 'test')
      buildAddon(getMap(target), true);
  });
}

