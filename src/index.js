
let shell = require('shelljs');

let { install } = require('./prebidInstaller.js');
let {
    loadConfig,
    getPrebidInstallList
} = require('./configLoader');

module.exports = function run(cwd, configPaths) {
    let configLoader = loadConfig(cwd);

    console.log("Cleaning build directory...");
    shell.rm('-rf', './build/prebid');

    configLoader(configPaths)
        .then(config => {
            let versions = getPrebidInstallList(config);

            return install(versions);
        }).then(results => {
            console.log(results);
        })
    };