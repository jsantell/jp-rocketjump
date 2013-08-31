/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci } = require('chrome');
const { Class } = require('sdk/core/heritage');
const { XMLHttpRequest: XHR } = require('sdk/net/xhr');

const RDFManifest = Class({
  initialize: function intialize (url) {
    let req = new XHR();
    req.open('GET', url, false);
    req.send(null);
    this.dom = req.responseXML;
  },
  set: function set (name, value) {
    let elements = this.dom.documentElement.getElementsByTagName(name);
    if (!elements)
      throw new Error('Element with value not found: ' + name);
    if (!elements[0].firstChild)
      elements[0].appendChild(this.dom.createTextNode(value));
    else
      elements[0].firstChild.nodeValue = value;
  },
  get: function get (name, defaultValue) {
    let elements = this.dom.documentElement.getElementsByTagName(name);
    if (!elements || !elements[0].firstChild)
      return defaultValue;
    return elements[0].firstChild.nodeValue;
  },
  remove: function remove (name) {
    let elements = this.dom.documentElement.getElementsByTagName(name);
    if (!elements)
      return true;
    else {
      for(var i=0; i<elements.length; i++) {
        let e = elements[i];
        e.parentNode.removeChild(e);
      }
    }
  },
  saveTo: function saveTo (path) {
    let serializer = Cc['@mozilla.org/xmlextras/xmlserializer;1']
      .createInstance(Ci.nsIDOMSerializer);
    let foStream = Cc['@mozilla.org/network/file-output-stream;1']
                   .createInstance(Ci.nsIFileOutputStream);
    let file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
    try {
      file.initWithPath(path);
    } catch(e) {
      throw new Error('This path is not valid : '+path+'\n'+e);
    }

    // write, create, truncate
    foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);

    // rememeber, doc is the DOM tree
    serializer.serializeToStream(this.dom, foStream, '');
    foStream.close();
  }
});
exports.RDFManifest = RDFManifest;
