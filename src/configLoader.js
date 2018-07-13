
let Promise = require('bluebird'),
    path    = require('path'),
    url     = require('url'),
    _       = require('lodash'),
    fs      = require('fs'),
    glob    = Promise.promisify(require('glob'));

function deepUpdate(obj, func) {
    let newObj = Array.isArray(obj) ? [] : {};
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (obj[i] !== null && typeof(obj[i]) === "object") {
                newObj[i] = deepUpdate(obj[i], func);
            } else {
                newObj[i] = func.apply(this, [obj[i]], i);
            }
        }
    }
    return newObj;
}


function resolveFile(cwd, str) {
    // if it's not a string or it is a url, don't do anything
    if (typeof str !== 'string' || url.parse(str).host) {
        return str;
    }

    // if it's already an absolute path, don't do anything
    if (path.isAbsolute(str)) {
        return str;
    }

    // otherwise, translate to absolute path from relative
    return path.resolve(cwd, str);
}

const loadPackagerConfig = function(cwd, file) {
    let configFiles = [resolveFile(__dirname, '../config.json')];
    if (file) {
        file = resolveFile(cwd, file);
        configFiles.push(file);
    }
    return Promise.all(configFiles.map(file => new Promise((resolve, reject) => {
        fs.readFile(path.resolve(cwd, file), (err, data) => {
            if (err) {
                return reject('error loading config file: ' + err);
            }
            try {
                data = deepUpdate(JSON.parse(data), resolveFile.bind(null, path.dirname(file)));
                resolve(data);
            } catch (e) {
                reject('error parsing config file: ' + e);
            }
        });
    }))).then(results => {
       return _.merge.apply(null, results);
    });
};

function loadAccountConfig(cwd, getAdapter) {
    let configLoader = getAdapter('config');

    return function(globStrs) {
        if (!Array.isArray(globStrs)) {
            globStrs = [ globStrs ];
        }

        return Promise.all(
            globStrs.map(globStr => glob(globStr, {cwd: cwd}))
        ).then(results => {
            let configs = results.reduce(
                (configs, files) => {
                    files.forEach(file => {
                        let filePath = path.resolve(cwd, file);
                        let config = configLoader(filePath);

                        let configWorkingDir = path.dirname(filePath);

                        config = resolveAbsolutePaths(configWorkingDir, config);

                        let [valid, msgs] = validateConfigs(config);

                        if (!valid) {
                            throw new Error(msgs.join(', '), file);
                        } else {
                            Object.assign(configs, config);
                        }
                    });

                    return configs;
                },
                {}
            );

            if (!Object.keys(configs).length) {
                throw `no configurations found for "${globStrs} in "${cwd}"`;
            }

            return configs;
        });
    }
}

function resolveAbsolutePaths(workingDir, configs) {
    configs = copy(configs);

    let resolve = resolveFile.bind(null, workingDir);

    _.forEach(configs, config => {
        if (typeof config.packages === 'object') {
            _.forEach(config.packages, pkg => {
               if (Array.isArray(pkg.code)) {
                   pkg.code = pkg.code.map(path => resolve(path));
               } else if (typeof pkg.code === 'object') {
                   pkg.code = _.mapValues(pkg.code, path => resolve(path));
               }
            });
        }
    });

    return configs;
}

function validateConfigs(configs) {
    let errors = [];

    if(typeof configs !== 'object') {
        errors.push('config not object');
    } else {
        if(Object.keys(configs).length === 0) {
            errors.push("empty config");
        }

        _.forEach(configs, (config, name) => {
            if (typeof config.version !== "string") {
                errors.push(`invalid version for "${name}" config`);
            }

            let unknownProperties = _.difference(
                Object.keys(config),
                ['version', 'packages']
            );

            if (unknownProperties.length > 0) {
                unknownProperties.forEach(unknownProperty => {
                   errors.push(`unknown property "${unknownProperty}" for "${name}" config`);
                });
            }

            if (!Array.isArray(config.packages) || config.packages.length === 0) {
                errors.push(`no packages specified for "${name}" config`);
            } else {
                config.packages.forEach(pkg => {

                    let unknownProperties = _.difference(
                        Object.keys(pkg),
                        ['filename', 'modules', 'code']
                    );

                    if (unknownProperties.length > 0) {
                        unknownProperties.forEach(unknownProperty => {
                           errors.push(`unknown property "${unknownProperty}" for package in "${name}" config`);
                        });
                    }

                    if (typeof pkg.filename !== 'string') {
                        errors.push(`no filename specified for package in "${name}" config`);
                    } else {
                        let ext = path.extname(pkg.filename);

                        if (ext === '.js') {
                            if (!Array.isArray(pkg.modules)) {
                                errors.push(`invalid modules supplied for "${pkg.filename}" package`);
                            }
                            if (pkg.code && !Array.isArray(pkg.code)) {
                                errors.push(`invalid code supplied for "${pkg.filename} package`);
                            }
                        } else if (ext === '.json') {
                            if (pkg.modules) {
                                errors.push(`modules erroneously specified for manifest "${pkg.filename}" package`);
                            }
                        } else {
                            errors.push(`invalid extension supplied for package.filename in "${name} config`);
                        }

                        if (pkg.code && typeof pkg.code !== "object") {
                            errors.push(`invalid "code" property for "${pkg.filename}" package`);
                        } else {
                            _.forEach(pkg.code, path => {
                                // if not a url and doesn't exist in filesystem then log error
                                if (!url.parse(path).host && !fs.existsSync(path)) {
                                    errors.push(`invalid code file specified: ${path}`);
                                }
                            });
                        }

                    }

                });
            }

        });

    }

    return [!errors.length, errors];
}

function getPrebidInstallList(configs) {
    return Object.keys(
        _.reduce(configs, (list, config) => {
            list[config.version] = true;
            return list;
        }, {}
        )
    );
}

function getCodeList(configs) {
    return Object.keys(
        _.reduce(configs, (list, config) => {
            config.packages.forEach(pkg => {
                _.map(pkg.code, (path) => {
                    list[path] = true;
                });
            });
            return list;
        }, {})
    )
}

function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

module.exports = {
    loadAccountConfig,
    loadPackagerConfig,
    getPrebidInstallList,
    getCodeList,
    resolveAbsolutePaths,
    validateConfigs
};