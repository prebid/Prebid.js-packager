
let Promise     = require('bluebird');
let fs          = require('fs');
let path        = require('path');
let sanitize    = require('sanitize-filename');

module.exports = function(version) {
    let sanitized = sanitize(version, {
        replacement: '~'
    });
    return new Promise((resolve, reject) => {
        let cacheDir = this.cacheDirs.filter(dir => {
            return fs.existsSync(path.join(dir, sanitized));
        });

        if (cacheDir.length === 0) {
            throw 'not found in any cache';
        }

        fs.readdir(path.join(cacheDir[0], sanitized), (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve([cacheDir[0], files]);
            }
        });
    }).then(([cacheDir, files]) => {
        return files.reduce((memo, file) => {
            let name = path.basename(file, '.js');
            if (name === 'prebid-core') {
                memo[version].main = path.resolve(cacheDir, sanitized, file);
            } else {
                memo[version].modules[name] = path.resolve(cacheDir, sanitized, file);
            }
            return memo;
        }, {
            [version]: {modules: {}}
        })
    }).catch(err => {
        console.log(`Cache miss for version ${version}`);
        return null;
    });
};