#!/usr/bin/env node

let run = require('./src');
let argv = require('yargs').argv;

let configPaths = argv._;

if (!configPaths || !configPaths.length) {
    console.log("Must include path argument to config files");
    process.exit(1);
}

run(process.cwd(), configPaths, argv.config || './config.json');

