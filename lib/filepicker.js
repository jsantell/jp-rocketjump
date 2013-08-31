/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { Cc, Ci } = require('chrome');
const { Class } = require('sdk/core/heritage');
const { defer } = require('sdk/core/promise');

const pickers = new WeakMap();

const MODES = {
  'open': 0,
  'save': 1,
  'folder': 2,
  'directory': 2,
  'multi': 3
};
const RESULT_OK = 0;
const RESULT_CANCEL = 1;
const RESULT_REPLACE = 2;

const FilePicker = Class({
  initialize: function (options) {
    let window = options.window;
    let title = options.title;
    let mode = MODES[options.mode]; // Defaults to 'open'
    let picker = createPicker();

    picker.init(window, title, mode);
    pickers.set(this, picker);
  },

  open: function open () {
    let picker = pickers.get(this);
    let { promise, resolve, reject } = defer();
    picker.open({
      done: (status) => {
        if (status === RESULT_OK || status === RESULT_REPLACE)
          resolve(status);
        else
          reject(status);
      }
    });
    return promise;
  },

  get url () {
    let url = pickers.get(this, {}).fileURL;
    return url ? url.spec : '';
  }
});
exports.FilePicker = FilePicker;

function createPicker () {
  return Cc["@mozilla.org/filepicker;1"]
           .createInstance(Ci.nsIFilePicker);
}
