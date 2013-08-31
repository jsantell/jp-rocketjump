/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { readdir, stat } = require('sdk/io/fs');
const { merge } = require('sdk/util/object');
const { add, remove } = require('sdk/util/array');
const { Class } = require('sdk/core/heritage');
const { defer } = require('sdk/core/promise');
const { isFunction } = require('sdk/lang/type');
const { join } = require('sdk/fs/path');
const { EventTarget } = require('sdk/event/target');
const { emit, on, off } = require('sdk/event/core');
const { setInterval, clearInterval } = require('sdk/timers');

const watchers = [];
const models = new WeakMap();

const Watcher = Class({
  extends: EventTarget,
  initialize: function initialize (file, options, listener) {
    let prop = {
      file: file,
      persistent: options.persistent,
      interval: options.interval,
      listener: listener,
      mtime: null,
      destroyed: false
    };

    models.set(this, prop);
  },

  start: function start () {
    let watcher = this;
    let { interval, file } = models.get(watcher);

    // Fire an initial check to get the current stat information
    // for the file
    onCheck(function () {
      if (!models.get(watcher).destroyed)
        models.get(watcher).timer = setInterval(onCheck, interval);
    });

    function onCheck (callback) {
      stat(file, function (err, stats) {
        let mtime = models.get(watcher).mtime;
        // If previous stat is null, this is the first poll
        // to establish state
        if (!mtime) {
          models.get(watcher).mtime = stats.mtime;
        }
        // If `mtime` doesn't match, the file has been modified
        else if (mtime !== stats.mtime) {
          watcher.trigger(stats);
        }

        // Fire callback for initial polling
        if (callback) callback();
      });
    }
  },

  trigger: function trigger (stats) {
    let { listener, persistent, mtime } = models.get(this);

    // No difference between previous and current stat
    // since fs.Stat has getters for file attributes 
    // that are always up to date
    listener(stats, stats);
    models.get(this).mtime = stats.mtime;

    // If not persistent, this change should only be called once
    if (!persistent)
      this.destroy();

    emit(this, 'trigger');
  },

  destroy: function destroy () {
    let model = models.get(this);
    if (model.destroyed) return;
    model.destroyed = true;
    clearInterval(model.timer);
    remove(watchers, this);
    emit(this, 'destroy');
  }
});

function watchFile (filename, ...args) {
  let options = {
    // `persistent` indicates whether or not files should
    // continue being watched until unbound
    persistent: true,
    // `interval` is the time in ms how often the changes
    // should be polled
    interval: 5007
  };
  let listener;

  if (isFunction(args[0]))
    listener = args[0];
  else if (isFunction(args[1])) {
    merge(options, args[0]);
    listener = args[1];
  } else
    throw new Error('watchFile requires a listener function');

  let watcher = Watcher(filename, options, listener);
  add(watchers, watcher);
  watcher.start();
  return watcher;
}
exports.watchFile = watchFile;

function unwatchFile (filename, listener) {
  let watcher = getWatcher(filename, listener);
  if (watcher)
    watcher.destroy();
}
exports.unwatchFile = unwatchFile;

function watchDir (dirname, options, listener) {
  let descendentWatchers = [];
 
  // Set up a master watcher on the parent dir
  init(dirname);

  // Then on its children recursively
  descend(dirname, init);
  
  function init (filename) {
    let watcher = watchFile(filename, options, listener);
    // If not persistent, collect watchers and listen
    // for trigger event so we can unbind them all
    if (!options.persistent) {
      descendentWatchers.push(watcher);
      on(watcher, 'trigger', unbind);
      on(watcher, 'destroy', unbind);
    }
  }

  function unbind () {
    descendentWatchers.forEach(watcher => {
      off(watcher, 'trigger', unbind);
      off(watcher, 'destroy', unbind);
      watcher.destroy();
    });
  }
}
exports.watchDir = watchDir;

function unwatchDir (dirname, listener) {
  let dirWatcher = getWatcher(dirname, listener);
  if (dirWatcher)
    dirWatcher.destroy();

  descend(dirname, (filename) => {
    let watcher = getWatcher(filename, listener);
    if (watcher)
      watcher.destroy();
  });
}
exports.unwatchDir = unwatchDir;

function getWatcher (filename, listener) {
  return watchers.filter(watcher => {
    let model = models.get(watcher);
    return model.listener === listener &&
           model.file === filename;
  })[0];
}

function descend (dirname, fn) {
  applyToChildren(dirname, path => {
    stat(path, (err, stats) => {
      stats.isDirectory() ? descend(path, fn) : fn(path);
    });
  });
}

function applyToChildren (dirname, fn) {
  readdir(dirname, (err, files) => {
    files.forEach(filename => fn(join(dirname, filename)));
  });
}
