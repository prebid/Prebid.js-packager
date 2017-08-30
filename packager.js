#!/usr/bin/env node


    argv    = require('yargs')
                .demandCommand(1)
                .argv;

let path = argv._[0];

