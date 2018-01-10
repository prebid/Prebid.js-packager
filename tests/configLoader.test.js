
let _ = require('lodash');
let path = require('path');

let {
    loadConfig,
    resolveAbsolutePaths,
    validateConfigs,
    getPrebidInstallList,
    getCodeList
} = require('../src/configLoader');

let configLoader = loadConfig(__dirname);

function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getConfig(str) {
    return copy(resolveAbsolutePaths(path.dirname(path.resolve(__dirname, str)), require(str)));
}

describe("the configuration loader", () => {

    it('should load a single config', () => {
        expect.assertions(1);

        return expect(configLoader('./fixtures/exampleConfig*.json')).resolves.toEqual(
            Object.assign(
                getConfig('./fixtures/exampleConfig1.json'),
                getConfig('./fixtures/exampleConfig2.json')
            )
        );
    });

    it('should load multiple config files', () => {
        expect.assertions(1);

        return expect(configLoader([
            './fixtures/exampleConfig1.json',
            './fixtures/exampleConfig2.json'
        ])).resolves.toEqual(
            Object.assign(
                getConfig('./fixtures/exampleConfig1.json'),
                getConfig('./fixtures/exampleConfig2.json')
            )
        );
    });

    it('should throw if no files specified', () => {
        expect.assertions(1);

        return expect(configLoader('./fixtures/notAFile.json')).rejects.toBeTruthy();
    });

    it('should throw if config does not validate', () => {
        expect.assertions(1);

        return expect(configLoader('./fixtures/emptyConfig.json')).rejects.toBeInstanceOf(Error);
    });

    describe("when validating the configs", () => {

        let testConfig;
        beforeEach(() => {
            testConfig = getConfig('./fixtures/exampleConfig1.json');
        });

        it('should return error if missing required properties on config', () => {
            delete _.values(testConfig)[0]['version'];

            let result = validateConfigs(testConfig);
            expect(result[0]).toBeFalsy();
            expect(result[1][0]).toMatch('invalid version');
        });


        it('should return error if unknown properties on config', () => {
            _.values(testConfig)[0]['blah'] = 'test';

            let result = validateConfigs(testConfig);
            expect(result[0]).toBeFalsy();
            expect(result[1][0]).toMatch('unknown property');
        });

        it('should return error if invalid package on config', () => {
            _.values(testConfig)[0]['packages'][0].filename = "blah.txt";

            let result = validateConfigs(testConfig);
            expect(result[0]).toBeFalsy();
            expect(result[1][0]).toMatch('invalid extension');
        });
    });

    it('should return unique prebid installs when requested', () => {
        let configs = getConfig('./fixtures/multiplePubVersion.json');

        expect(getPrebidInstallList(configs).sort()).toEqual([
            '0.27.1',
            '0.29.0',
            '1.0.0'
        ].sort());
    });

    it('should return unique code paths when requested', () => {
        let configs = getConfig('./fixtures/multiplePubVersion.json');

        let codeList = getCodeList(configs).sort();
        expect(codeList[0]).toMatch('fixtures/adUnits.js');
        expect(codeList[1]).toMatch('fixtures/adUnits2.js');
        expect(codeList[2]).toMatch('digitrust.min.js');
    });
});