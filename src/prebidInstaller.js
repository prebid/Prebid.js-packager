
let path        = require('path'),
    Promise     = require('bluebird'),
    lerna       = require('lerna'),
    shell       = require('shelljs'),
    targz       = require('targz'),
    semver      = require('semver'),
    exec        = require('child_process').exec,
    sanitize    = require('sanitize-filename'),
    through2    = require('through2'),
    fs          = require('fs');

function install(versions, config, getAdapter) {
    let workingDir = path.join(config.workingDir, 'prebid');
    let outputDir = path.join(config.outputDir, 'prebid');

    let cacheAdapter = getAdapter('cache');

    clean();

    let cachedManifests = {};

    return (
        // load cache if present
        new Promise((resolve, reject) => {
            Promise.all(versions.map(version => cacheAdapter(version)))
                .then(results => {
                    results.forEach(result => {
                        if(result) {
                            Object.assign(cachedManifests, result);
                        }
                    });
                    resolve(versions.reduce((memo, curr) => {
                        if (!cachedManifests[curr]) {
                            memo.push(curr);
                        }
                        return memo;
                    }, []));
                });
        })

        // download .tgz files of each version specified
        .then(results => Promise.all(results.map(version => new Promise((resolve, reject) => {
            let npmVersion = version;
            let installPath = path.join(workingDir, 'packages', sanitize(version, {
                replacement: '~'
            }));

            if (semver.valid(version)) {
                npmVersion = 'prebid.js@' + version;
            }

            console.log(`Cleaning prebid installer working directory for version ${version} ...`);
            shell.rm('-rf', path.join(workingDir, version));

            shell.mkdir('-p', installPath);

            console.log(`Installing ${npmVersion}...`);

            exec(
                `npm pack ${npmVersion}`,
                {cwd: installPath},
                (err, stdout) => err ? reject(err) : resolve({
                    version,
                    npmVersion,
                    installPath,
                    tgzFile: path.join(installPath, stdout.toString().trim())
                })
            );
        }))))

        // expand .tgz files
        .then(prebids => Promise.all(prebids.map(prebid => new Promise((resolve, reject) => {
            targz.decompress({
                src: prebid.tgzFile,
                dest: prebid.installPath,
                tar: {
                    map: function(header) {
                       header.name = header.name.replace(/^package\b/, '.');
                       return header;
                    },

                    // rename packages in package.json to prevent tooling errors
                    mapStream: function(fileStream, header) {
                        if (header.name === './package.json') {
                            return fileStream.pipe(through2(function(chunk, enc, cb) {
                                let pkg = JSON.parse(chunk.toString());

                                // make the names unique to help lerna operate correctly
                                pkg.name = prebid.npmVersion.replace('@', '-');

                                // add the build commands to the script file for lerna to execute
                                pkg.scripts.build = 'gulp webpack';

                                let strContents = JSON.stringify(pkg, null, 2);

                                this.push(new Buffer(strContents));
                                cb();
                            }));
                        }
                        return fileStream;
                    }
                }
            }, function(err) {
                if (err) {
                    return reject(err);
                }

                resolve(prebid);
            })
        }))))

        // install version dependencies and run build
        .then(files => {
            let versions = files.map(file => file.version);

            if (!files.length) {
                return [];
            }
            return new lerna.InitCommand([], {
                loglevel: 'silent'
            }, workingDir).run()
                .then(() => {
                    console.log(`Installing Prebid.js dependencies for versions: ${versions}...`);

                    return new lerna.BootstrapCommand([], {
                        loglevel: 'silent',
                        hoist: true
                    }, workingDir).run();

                }).then(() => {
                    console.log(`Building Prebid.js versions: ${versions}...`);

                    // lerna run command uses console.log... so silence by replacement
                    let oldLog = console.log;
                    console.log = () => {
                    };

                    // run the command we created in package.json earlier
                    return new lerna.RunCommand(['build'], {
                        loglevel: 'silent',
                        parallel: false
                    }, workingDir).run()
                        .then(() => {
                            console.log = oldLog
                        })

                }).then(() => files.map(file => Object.assign(file, {
                    buildDir: path.join(file.installPath, 'build/dist')
                })))
        })

        // copy files to build destination
        .then(prebids => Promise.all(prebids.map(prebid => new Promise((resolve, reject) => {
            let outputDirForVersion = path.join(outputDir, prebid.version);

            shell.rm('-rf', outputDirForVersion);

            shell.mkdir('-p', outputDirForVersion);
            shell.cp(path.join(prebid.buildDir, '*'), outputDirForVersion);

            fs.readdir(outputDirForVersion, (err, list) => {
                if (err) {
                    return reject(err);
                }

                prebid.buildFiles = list;
                resolve(prebid);
            });
        }))))


        // reformat manifest according to spec
        .then(results => results.reduce((memo, result) => {
            let manifest = {};

            let outputDirForVersion = path.join(outputDir, result.version);

            manifest.modules = result.buildFiles.map(file => path.basename(file, '.js'))
                .filter((module) => {
                    if (module === 'prebid-core') {
                        manifest.main = path.join(outputDirForVersion, 'prebid-core.js');
                        return false;
                    }
                    return true;
                })
                .reduce((modules, module) => {
                    modules[module] = path.join(outputDirForVersion, module + '.js');
                    return modules;
                }, {});

            memo[result.version] = manifest;
            return memo;
        }, cachedManifests))

        .catch(err => {
            console.log("error", err);
        })

        .finally(clean)
    );

    function clean() {
        console.log("Cleaning prebid installer working directory...");
        shell.rm('-rf', workingDir);
    }
}

module.exports = {
    install
};