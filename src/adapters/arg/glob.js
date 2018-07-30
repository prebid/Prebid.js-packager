
let Promise = require('bluebird'),
    path    = require('path'),
    glob    = Promise.promisify(require('glob'));

module.exports = function(cwd, resource) {
    return glob(resource, {cwd: cwd})
        .then(results => {
            return results.map(file => path.resolve(cwd, file))
        });
};