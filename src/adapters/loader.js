
let Promise = require('bluebird'),
    path    = require('path');

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