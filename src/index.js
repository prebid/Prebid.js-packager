
let shell = require('shelljs');

let prebidInstall = require('./prebidInstaller.js').install;
let codeInstall = require('./codeInstaller.js').install;
let { generatePackageManifests, write } = require('./packageBuilder.js');
let { loadAccountConfig, loadPackagerConfig, getPrebidInstallList, getCodeList } = require('./configLoader');

module.exports = function run(cwd, configPaths, configFile) {
    loadPackagerConfig(cwd, configFile)
        .then(config => {
            let configLoader = loadAccountConfig(cwd);

            console.log("Cleaning build directory...");
            shell.rm('-rf', './build/prebid');

            configLoader(configPaths)
                .then(pkgConfig => {
                    let versions = getPrebidInstallList(pkgConfig);
                    let code = getCodeList(pkgConfig);

                    return Promise.all([
                        prebidInstall(versions, config),
                        codeInstall(code, config)
                    ]).then(results => {
                        let packageDir = './build/packages';

                        console.log("Ceaning package dir...");
                        shell.rm('-rf', packageDir);

                        let manifests = generatePackageManifests(pkgConfig, results[0], results[1], packageDir);
                        write(packageDir, manifests);
                    });
                });
        });
};