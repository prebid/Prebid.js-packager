
let del   = require('del'),
    path  = require('path');

let prebidInstall = require('./prebidInstaller.js').install;
let codeInstall = require('./codeInstaller.js').install;
let { generatePackageManifests, write } = require('./packageBuilder.js');
let { loadAccountConfig, loadPackagerConfig, getPrebidInstallList, getCodeList } = require('./configLoader');

let loader  = require('./adapters/loader.js').loader;

/**
 * Main run function for the packager.  Can be used directly in node (as main export) or from the command-line when
 * invoked from package.js manually or using npm start
 *
 * @param {string} cwd the current working directory to use for relative pathing in configuration files and resources
 * @param {string[]} resources that the packager will be working with
 * @param {string} configFile file path to a custom configuation file
 * @returns {Promise.<string[]>} Resolves with an array of the newly generated build files
 */
module.exports = function run(cwd, resources, configFile) {
    return loadPackagerConfig(cwd, configFile)
        .then(config => {
            let getAdapter = loader(config.adapter);

            let configLoader = loadAccountConfig(cwd, getAdapter);

            return configLoader(resources)
                .then(pkgConfig => {
                    let versions = getPrebidInstallList(pkgConfig);
                    let code = getCodeList(pkgConfig);

                    return Promise.all([
                        prebidInstall(versions, config, getAdapter),
                        codeInstall(code, config)
                    ]).then(results => {
                        let packageDir = path.join(config.outputDir, 'packages');

                        console.log("Ceaning package dir...");
                        del.sync(packageDir);

                        let manifests = generatePackageManifests(pkgConfig, results[0], results[1], packageDir);
                        return write(packageDir, manifests);
                    });
                })
        });
};