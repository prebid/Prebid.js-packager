#!/usr/bin/env node

let path    = require('path'),
    fs      = require('fs');
let {
    buildFromManifest
} = require('./src/packageBuilder.js');

let argv = require('yargs').argv;

let manifest = argv._[0];
let modules = (argv.modules || '').split(',');
let codes = (argv.code || '').split(',');

if (!manifest || path.extname(manifest).toLowerCase() !== '.json') {
    console.log("expected manifest .json file as argument");
    process.exit(1);
}

let output = argv.o || path.join(
    path.dirname(manifest),
    path.basename(manifest, '.json')
) + '.js';

buildFromManifest(
    path.dirname(manifest),
    JSON.parse(
        fs.readFileSync(manifest)
    ),
    modules,
    codes
).then(result => {
    fs.writeFile(output, result, (err) => {
       if (err) {
           console.log(err);
           process.exit(1);
       }
       console.log(`${output} created.`);
    });
}).catch(err => {
    console.log(err);
    process.exit(1);
});