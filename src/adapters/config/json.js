
let fs = require('fs'),
    Promise = require('bluebird');

module.exports = function(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            try {
                resolve(JSON.parse(data));
            } catch(e) {
                return reject(e);
            }
            resolve(data);
        });
    });
};