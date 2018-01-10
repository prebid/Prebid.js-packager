#!/usr/bin/env node

let run = require('./src');

let [node, cmd, ...configPaths] = process.argv;

if (!configPaths) {
    console.log("Must include path argument to config files");
    process.exit(1);
}

run(process.cwd(), configPaths);

