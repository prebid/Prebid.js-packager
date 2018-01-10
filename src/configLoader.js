
let Promise = require('bluebird'),
    path    = require('path'),
    url     = require('url'),
    _       = require('lodash'),
    fs      = require('fs'),
    glob    = Promise.promisify(require('glob'));

const loadConfig =_.curry(function configLoader(cwd, globStrs) {
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
                    let config = require(filePath);

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
});

function resolveAbsolutePaths(workingDir, configs) {
    configs = copy(configs);

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

    function resolve(str) {
        // if it's a url, don't do anything
        if (url.parse(str).host) {
            return str;
        }

        // if it's already an absolute path, don't do anything
        if (path.isAbsolute(str)) {
            return str;
        }

        // otherwise, translate to absolute path from relative
        return path.resolve(workingDir, str);
    }

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
    loadConfig,
    getPrebidInstallList,
    getCodeList,
    resolveAbsolutePaths,
    validateConfigs
};