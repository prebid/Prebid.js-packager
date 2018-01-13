
let shell = require('shelljs');

let prebidInstall = require('./prebidInstaller.js').install;
let codeInstall = require('./codeInstaller.js').install;
let { generatePackageManifests, write } = require('./packageBuilder.js');
let { loadConfig, getPrebidInstallList, getCodeList } = require('./configLoader');

module.exports = function run(cwd, configPaths) {
    let configLoader = loadConfig(cwd);

    console.log("Cleaning build directory...");
    shell.rm('-rf', './build/prebid');

    configLoader(configPaths)
        .then(pkgConfig => {
            let versions = getPrebidInstallList(pkgConfig);
            let code = getCodeList(pkgConfig);

            return Promise.all([
                prebidInstall(versions),
                codeInstall(code)
            ]).then(results => {
                let packageDir = './build/packages';

                console.log("Ceaning package dir...");
                shell.rm('-rf', packageDir);

                let manifests = generatePackageManifests(pkgConfig, results[0], results[1], packageDir);
                write(packageDir, manifests);
            });
        });
    };