const {components,Cc,Ci} = require("chrome");
const URL = require("sdk/url");
const SELF = require("sdk/self");
const zip = require("./zip");
const path = require("sdk/fs/path");
const fs = require("sdk/io/fs");
const { pathFor } = require("sdk/system");
const { RDFManifest } = require('./rdf');
const { defer } = require('sdk/core/promise');

const addonTemplatePath = URL.toFilename(SELF.data.url("builder"));

// We need a way to join an absolute path `rootPath` that use OS separator,
// and `relativePath` that use only '/'
// (On Unix, we would use regular path.join, but we can't do that on Windows)
function joinUnixPath(rootPath, relativePath) {
  if (!relativePath)
    return rootPath;
  let ospath = path.join.apply(null, relativePath.split("/"));
  return path.join(rootPath, ospath);
}


function buildInstallRDF(options, mainPackage) {
  let customInstallRDF = path.join(addonTemplatePath, "custom-install.rdf");
 
  let templateURL = SELF.data.url('builder/_install.rdf');
  let installRDF = new RDFManifest(templateURL);
  installRDF.set("em:id", options.jetpackID);
  installRDF.set("em:version",
               mainPackage.version ? mainPackage.version : '1.0');
  installRDF.set("em:name",
               mainPackage.fullName ? mainPackage.fullName : mainPackage.name);
  installRDF.set("em:description", mainPackage.description);
  installRDF.set("em:creator", mainPackage.author);
  installRDF.set("em:bootstrap", "true");
  installRDF.set("em:unpack", "true");
  
  installRDF.remove("em:updateURL")

  if (mainPackage.homepage)
      installRDF.set("em:homepageURL", mainPackage.homepage);
  else
      installRDF.remove("em:homepageURL");
  
  installRDF.saveTo(customInstallRDF);
  
  return customInstallRDF;
}

//   Build a regular XPI
// If useSymlinks = true: js, tests and data files won't be copied into the xpi
// but direct files path will be stored in harness-options file instead
exports.build = function (options, mainPackage, zipfile, useSymlinks) {
  let { promise, resolve, reject } = defer();

  let newOptions = JSON.parse(JSON.stringify(options));
  
  let xpi = new zip.ZipWriter(zipfile);
 
  try { 
    fs.unlinkSync(path.join(addonTemplatePath,"harness-options.json"));
  } catch (e) {}
  
  xpi.add("bootstrap.js", path.join(addonTemplatePath, "bootstrap.js"));
  xpi.add("locales.json", path.join(addonTemplatePath, "locales.json"));
  
  xpi.add("defaults/preferences/prefs.js", path.join(addonTemplatePath, "prefs.js"));
  
  let customInstallRDF = buildInstallRDF(options, mainPackage);
  xpi.add("install.rdf", customInstallRDF);
  fs.unlinkSync(customInstallRDF);
 
  if (!useSymlinks) {
    // Copy modules js, tests and data into the XPI file, in resources folder
    // And update options with their new resource url (instead of file path)
    for(let id in newOptions.resources) {
      let libPath = newOptions.resources[id];
      
      if (id.match(/(tests|lib)$/)) {
        for (let resourcePath in newOptions.manifest) {
          let packageName = newOptions.manifest[resourcePath].packageName;
          let moduleName = newOptions.manifest[resourcePath].moduleName;
          let url = "resource://" + id;
          let path = resourcePath.replace(url, "") + '.js';
          xpi.add(
            'resources/' + packageName + '/' + newOptions.manifest[resourcePath].sectionName +'/'+ moduleName + '.js',
            joinUnixPath(libPath, moduleName + '.js'));
        }
      }

      // A non-script directory
      else {
        let dir = id.match(/(.*)-([^-]*)$/)
        xpi.add("resources/" + dir[1] + '/' + dir[2], libPath);
      }
      newOptions.resources[id] = ["resources", id];
    }


    // Remove sourcePath attributes
    for(let i in newOptions.manifest)
      delete newOptions.manifest[i].sourcePath;
  }
  
  // Generate options-harness and write it to zipfile
  let tempOptions = path.join(pathFor('TmpD'), 'temp-options');
  fs.writeFile(tempOptions, JSON.stringify(newOptions), (err) => {
    xpi.add("harness-options.json", tempOptions);
    fs.unlinkSync(tempOptions);
    xpi.close();
    resolve(newOptions);
  });
  
  return promise;
}
