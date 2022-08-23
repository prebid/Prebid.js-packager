
let _       = require('lodash'),
    fs      = require('fs'),
    shell   = require('shelljs'),
    path    = require('path');


function write(dir, manifestsObj) {
    return Promise.all(
        Object.keys(manifestsObj).map(filename => new Promise((resolve, reject) => {
            let manifest = manifestsObj[filename];

            shell.mkdir('-p', dir);

            let filePath = path.join(dir, filename);

            if (path.extname(filename) === '.json') {
                fs.writeFile(
                    filePath,
                    JSON.stringify(manifest, null, 2),
                    err => err ? reject(err) : resolve(filePath)
                );
            } else if (path.extname(filename) === '.js') {
                buildFromManifest(dir, manifest).then(build => {
                   fs.writeFile(
                       filePath,
                       build,
                       err => err ? reject(err) : resolve(filePath)
                   );
                });
            }
        }))
    );
}

function getDependenciesFile(depPath) {
    try {
        return JSON.parse(fs.readFileSync(depPath));
    } catch (error) {
        console.log(`No Dependencies File found at ${depPath}`);
        
    }
}

function generatePackageManifests(config, prebidManifest, codeManifest, relativeTo = '.') {
    return _.reduce(config, (manifests, config) => {
        config.packages.forEach(pkg => {
            let manifest = manifests[pkg.filename] = {
                main: path.relative(relativeTo, prebidManifest[pkg.version || config.version].main),
                modules: _.mapValues(
                    prebidManifest[pkg.version || config.version].modules,
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
                const depFile = manifest.modules['dependencies.json'] || '';
                const dependencies = getDependenciesFile(path.join(relativeTo, depFile));
                if (dependencies) {
                    const librariesToAdd = new Set();
                    pkg.modules.forEach(mod => {
                        if (Array.isArray(dependencies[`${mod}.js`])) {
                            dependencies[`${mod}.js`].forEach(lib => librariesToAdd.add(lib));
                        }
                    });
                    if (librariesToAdd.size) {
                        pkg.modules.push(...librariesToAdd);
                    }
                }
                manifest.moduleList = pkg.modules;
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
        manifest.moduleList = manifest.moduleList || [];
        return results.join('\n').replace(/installedModules(\s||'')=(\s||'')\[\]/i, `installedModules=${JSON.stringify(manifest.moduleList)}`);
    }).catch(err => {
       setTimeout(() => { throw err });
    });
}

module.exports = {
    write,
    generatePackageManifests,
    buildFromManifest
};