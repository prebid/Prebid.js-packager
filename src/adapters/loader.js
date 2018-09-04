
let Promise = require('bluebird'),
    path    = require('path');

/**
 * Loader is a function that resolves to an adapter's exported function which allows for extension to the packager.
 *
 * @param {AdapterConfig} config Adapter config that is specific to each adapter and bound as `this` to the adapter's
 * exported function when called.
 * @returns {function} An adapter locator function used to find adapters for different functionality throughout the packager.
 */
exports.loader = function(config) {
    return function(type) {
        let options = config[type].options || {};
        let src;
        if (config && config[type]) {
            if (config[type].src) {
                src = config[type].src;
            } else if (config[type].name) {
                src = path.resolve(__dirname, type, config[type].name + '.js');
            }
        }
        return src ? require(src).bind(options) : function() { return Promise.resolve(null); }
    };
};

/**
 * @typedef {object} AdapterConfig
 * @property {string} [src] The file path where the adapter can be found.  Useful for adapters that are not part of the
 * packager's default adapter set within src/adpaters.
 * @property {string} [name] The name of the adapter.  This is used to find the adapter within the packager's
 * src/adapters directory if a `src` is not provided.
 * @property {object} [options] The options that will be bound as `this` to the adapter's function when called.  These
 * options will be unique depending on which adapter is called as each will require different configuration specific to
 * its function.
 */