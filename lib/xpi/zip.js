/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { Ci, Cc } = require('chrome');
const { Class } = require('sdk/core/heritage');

const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;
const RWXR_XR_X      = 493; // 0755

const ZipWriter = Class({
  initialize: function initialize (zipPath) {
    this.writer = Cc['@mozilla.org/zipwriter;1']
                  .createInstance(Ci.nsIZipWriter);
    this.writer.open(
      createNsFile(zipPath), PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE
    );
  },
  add: function add (pathInZip, filePath) {
    let nsFile;
    if (typeof filePath === 'object' &&
        typeof filePath.leafName === 'string')
      nsFile = filePath;
    else
      nsFile = createNsFile(filePath);

    if (!nsFile.exists())
      throw new Error('This file doesn\'t exists : ' + filePath);

    // Regular file
    if (!nsFile.isDirectory()) {
      this.writer.addEntryFile(
        pathInZip, Ci.nsIZipWriter.COMPRESSION_DEFAULT, nsFile, false
      );
      return;
    }
    // Directory
    let entries = nsFile.directoryEntries;

    if (pathInZip && pathInZip.length)
      this.writer.addEntryDirectory(
        pathInZip, nsFile.lastModifiedTime, false
      );

    while (entries.hasMoreElements()) {
      let entry = entries.getNext();
      entry.QueryInterface(Ci.nsIFile);
      if (entry.leafName === '.' || entry.leafName === '..')
        continue;
      this.add(
        (pathInZip &&
         pathInZip.length &&
         (pathInZip[pathInZip.length - 1] !== '/' ?
            pathInZip + '/' :
            ''
         )
        ) + entry.leafName, entry
      );
    }
  },
  close: function close () { this.writer.close(); }
});
exports.ZipWriter = ZipWriter;

const ZipReader = Class({
  initialize: function initialize (zipPath) {
    this.reader = Cc['@mozilla.org/libjar/zip-reader;1']
                  .createInstance(Ci.nsIZipReader);
    this.reader.open(createNsFile(zipPath));
  },
  extractAll: function extractAll (destination) {
    this.extract('*', destination);
  },
  extract: function extract (pattern, destination) {
    let destFolder = createNsFile(destination);
    if (!destFolder.exists())
      destFolder.create(Ci.nsIFile.DIRECTORY_TYPE, RWXR_XR_X);
    let it = this.reader.findEntries(pattern);
    while (it.hasMore()) {
      let entry = it.getNext();
      let destFile = destFolder.clone();
      let path = entry.split('/');
      if (path.length > 1) {
        // Create directory along all the path
        for(let i = 0; i < path.length - 1; i++) {
          destFile.append(path[i]);
          try {
            destFile.create(Ci.nsIFile.DIRECTORY_TYPE, RWXR_XR_X);
          } catch(e) {}
        }
      }
      // If this is not a directory entry (ends with '/')
      // extract the file entry!
      let basename = path[path.length - 1];
      if (!basename) continue;
      destFile.append(basename);
      this.reader.extract(entry, destFile);
    }
  },
  ls: function ls (pattern) {
    if (!pattern)
      pattern = '*';
    let it = this.reader.findEntries(pattern);
    let files = [];
    while (it.hasMore())
      files.push(it.getNext());
    return files;
  },
  close: function close () { this.reader.close(); }
});
exports.ZipReader = ZipReader;

function createNsFile(path) {
  let file = Cc['@mozilla.org/file/local;1']
    .createInstance(Ci.nsILocalFile);
  try {
    file.initWithPath(path);
  } catch(e) {
    throw new Error('This path is not valid : '+path+'\n'+e);
  }
  return file;
}

