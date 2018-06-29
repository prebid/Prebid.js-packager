
let Promise = require('bluebird');

exports.loader = function(config) {
    return function(type) {
         return config && config[type] && config[type].src ? require(config[type].src).bind(config[type].config)
             : function() { return Promise.resolve(null); }
    };
};