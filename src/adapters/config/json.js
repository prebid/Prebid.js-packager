
let fs      = require('fs'),
    path    = require('path'),
    Promise = require('bluebird');

module.exports = function(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            try {
                resolve({
                    path: path.dirname(file),
                    config: JSON.parse(data)
                });
            } catch(e) {
                reject(e);
            }
        });
    });
};