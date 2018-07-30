
let Promise = require('bluebird');

module.exports = function(cwd, resource) {
    return new Promise((resolve, reject) => {
       resolve(resource);
    });
};