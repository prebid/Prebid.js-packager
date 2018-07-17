
let Promise = require('bluebird');

exports.loader = function(config) {
    return function(type) {
        let options = config[type].options || {};
        return config && config[type] && config[type].src ? require(config[type].src).bind(options)
            : function() { return Promise.resolve(null); }
    };
};