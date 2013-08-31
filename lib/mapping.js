/* 
 * Mapping of 'in development' extensions
 */

const { prefs } = require('sdk/simple-prefs');

function setMap (key, dir) {
  dir = /^file:\/\//.test(dir) ? dir.replace('file://','') : dir;
  if (!prefs.jetpackmapping)
    prefs.jetpackmapping = '{}';
  let parsed = JSON.parse(prefs.jetpackmapping)
  parsed[key] = dir;
  prefs.jetpackmapping = JSON.stringify(parsed);
}
exports.setMap = setMap;

function getMap (key) {
  if (!prefs.jetpackmapping)
    prefs.jetpackmapping = '{}';
  return JSON.parse(prefs.jetpackmapping)[key];
}
exports.getMap = getMap;
