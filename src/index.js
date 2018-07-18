
let del   = require('del'),
    path  = require('path');

let prebidInstall = require('./prebidInstaller.js').install;
let codeInstall = require('./codeInstaller.js').install;
let { generatePackageManifests, write } = require('./packageBuilder.js');
let { loadAccountConfig, loadPackagerConfig, getPrebidInstallList, getCodeList } = require('./configLoader');

let loader  = require('./adapters/loader.js').loader;

module.exports = function run(cwd, configPaths, configFile) {
    return loadPackagerConfig(cwd, configFile)
        .then(config => {
            let getAdapter = loader(config.adapter);

            let configLoader = loadAccountConfig(cwd, getAdapter);

            return configLoader(configPaths)
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