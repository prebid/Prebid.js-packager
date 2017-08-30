
let Promise = require('bluebird'),
    path    = require('path'),
    _       = require('lodash'),
    glob    = Promise.promisify(require('glob'));

const loadConfig =_.curry(function configLoader(cwd, globStr) {
    return glob(globStr, {
        cwd: cwd
    }).then(files => {
        if(files.length === 0) {
            throw `no configurations found for "${globStr} in "${cwd}"`;
        }

        return files.reduce(
            (result, file) => {
                let filePath = path.resolve(cwd, file);

                let config = require(filePath);

                let [valid, msgs] = validateConfigs(config);

                if (!valid) {
                    throw new Error(msgs.join(', '), file);
                } else {
                    Object.assign(result, config);
                }

                return result;
            },
            {}
        )
    });
});

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

                        if (typeof pkg.code !== "object") {
                            errors.push(`invalid "code" property for "${pkg.filename}" package`);
                        }

                    }

                });
            }

        });

    }

    return [!errors.length, errors];
}

module.exports = {
    loadConfig,
    validateConfigs
};