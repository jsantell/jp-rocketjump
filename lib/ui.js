/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { Cc, Ci } = require('chrome');
const { Class } = require('sdk/core/heritage');
const { EventTarget } = require('sdk/event/target');
const { emit } = require('sdk/event/core');
const { FilePicker } = require('./filepicker');
const { getMap } = require('./mapping');

const ICON = 'chrome://global/skin/icons/webapps-64.png';

const UI = Class({
  extends: EventTarget,
  initialize: function (document) {
    let ui = this;
    this.document = document;
    this.addonList = document.getElementById('addon-list');
    let utilsMenu = document.getElementById('utils-menu');

    let picker = FilePicker({
      window: document.defaultView,
      title: 'Choose Jetpack Directory',
      mode: 'directory'
    });

    let listItem = createElement(document, 'menuitem', {
      label: 'Install Development Add-on',
      type: 'checkbox',
      disabled: 'false',
      id: 'autojetpack-developer-check'
    }, utilsMenu);

    listItem.addEventListener('click', e => {
      picker.open().then(() => {
        emit(ui, 'file', picker.url);
      });
    }, false);
  },

  reparse: function () {
    let addons = this.addonList.children;
    for (let i in addons) {
      let addon = addons[i];
      let value = addon.value;
      if (getMap(value) && !addon.children.length)
        createDevMenu(this, this.document, addon);
    }
  }
});
exports.UI = UI;
/*
  let container = document.createElement('richlistitem');
  setAttributes(container, {
    classes: 'addon addon-list',
    height: '40px',
    id: 'autojetpack-developer-container'
  });
  prependChild(addonList, container);
  */

function createElement (document, type, attributes, parent) {
  let el = document.createElement(type);
  setAttributes(el, attributes);
  prependChild(parent, el);
  return el;
}

function setAttributes (el, ops) {
  for (let prop in ops) {
    if (prop === 'classes')
      ops[prop].split(' ').forEach(klass => el.classList.add(klass));
    else
      el.setAttribute(prop, ops[prop]);
  }
}

function prependChild (parent, el) {
  let sibling = parent.children[0];
  if (!sibling)
    parent.appendChild(el);
  else
    parent.insertBefore(el, sibling);
}

function createDevMenu (ui, document, parent) {
  let icon = createElement(document, 'toolbarbutton', {
    classes: 'jetpack-dev-button header-button',
    value: parent.value,
    type: 'menu',
    style: 'height: 64px; margin-top:64px; list-style-image: url("' + ICON + '")',
    id: 'jetpack-dev-button' + parent.value
  }, parent);

  let menu = createElement(document, 'menupopup', {
    id: 'jetpack-dev-menu-' + parent.value
  }, icon);

  let options = [
    { label: 'Reload', value: 'reload' },
    { label: 'Reload on Save', value: 'save' },
    { label: 'Reload on Focus', value: 'focus' },
    { label: 'Test Add-on', value: 'test' }
  ];

  options.forEach(op => {
    op['data-addon'] = parent.value;
    createElement(document, 'menuitem', op, menu);
  });

  icon.addEventListener('click', function (e) {
    if (e.target.tagName === 'menuitem') 
      emit(ui, 'action', {
        target: e.target.getAttribute('data-addon'),
        data: e.target.value
      });
  }, true);
}
