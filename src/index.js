
let shell = require('shelljs');

let prebidInstall = require('./prebidInstaller.js').install;
let codeInstall = require('./codeInstaller.js').install;
let {
    loadConfig,
    getPrebidInstallList,
    getCodeList
} = require('./configLoader');

module.exports = function run(cwd, configPaths) {
    let configLoader = loadConfig(cwd);

    console.log("Cleaning build directory...");
    shell.rm('-rf', './build/prebid');

    configLoader(configPaths)
        .then(config => {
            let versions = getPrebidInstallList(config);
            let code = getCodeList(config);

            return Promise.all([
                prebidInstall(versions),
                codeInstall(code)
            ]);
        }).then(results => {
            console.log(results);
        });
    };