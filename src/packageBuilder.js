
let _       = require('lodash'),
    fs      = require('fs'),
    shell   = require('shelljs'),
    path    = require('path');


function write(dir, manifestsObj) {
    _.forEach(manifestsObj, (manifest, filename) => {
        if (path.extname(filename) === '.json') {
            shell.mkdir('-p', dir);
            fs.writeFile(
                path.join(dir, filename),
                JSON.stringify(manifest, null, 2),
                err => {}
            );
        } else if (path.extname(filename) === '.js') {
            buildFromManifest(dir, manifest).then(build => {
               fs.writeFile(
                   path.join(dir, filename),
                   build,
                   err => {}
               );
            });
        }
    });
}

function generatePackageManifests(config, prebidManifest, codeManifest, relativeTo = '.') {
    return _.reduce(config, (manifests, config) => {
        config.packages.forEach(pkg => {
            let manifest = manifests[pkg.filename] = {
                main: path.relative(relativeTo, prebidManifest[config.version].main),
                modules: _.mapValues(
                    prebidManifest[config.version].modules,
                    modulePath => path.relative(relativeTo, modulePath)
                ),
                postfix: "pbjs.processQueue();"
            };

            if (pkg.code) {
                manifest.code = Array.isArray(pkg.code) ?
                    _.map(pkg.code, codePath => path.relative(relativeTo, codeManifest[codePath])) :
                    _.mapValues(
                        pkg.code,
                        codePath => path.relative(relativeTo, codeManifest[codePath])
                    );
            }

            if (Array.isArray(pkg.modules)) {
                manifest.modules = _.filter(manifest.modules, (modulePath, module) => pkg.modules.includes(module));
            }
        });
        return manifests;
    }, {});
}

function buildFromManifest(cwd, manifest, modules, codes) {
    cwd = path.resolve(cwd);

    return Promise.all([
        Promise.all(_.map(manifest.code, (codePath, code) => new Promise((resolve, reject) => {
            function readFile() {
                fs.readFile(
                    path.join(cwd, codePath),
                    (err, data) => err ? reject(err) : resolve(data)
                );
            }

            if (Array.isArray(manifest.code)) {
                readFile();
            } else if (Array.isArray(codes) && codes.includes(code)) {
                readFile();
            } else {
                resolve('');
            }
        }))).then(results => results.filter(result => result).join('\n')),
        new Promise((resolve, reject) => {
            fs.readFile(
                path.join(cwd, manifest.main),
                (err, data) => err ? reject(err) : resolve(data)
            );
        }),
        Promise.all(_.map(manifest.modules, (modulePath, module) => new Promise((resolve, reject) => {
            function readFile() {
                fs.readFile(
                    path.join(cwd, modulePath),
                    (err, data) => err ? reject(err) : resolve(data)
                );
            }

            if (Array.isArray(manifest.modules)) {
                readFile();
            } else if (Array.isArray(modules) && modules.includes(module)) {
                readFile();
            } else {
                resolve('');
            }
        }))).then(results => results.filter(result => result).join('\n'))
    ]).then(results => {
        results.push(manifest.postfix);
        return results.join('\n');
    });
}

module.exports = {
    write,
    generatePackageManifests,
    buildFromManifest
};