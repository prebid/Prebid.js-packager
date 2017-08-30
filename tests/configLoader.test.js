
let _ = require('lodash');

let {
    loadConfig,
    validateConfigs
} = require('../src/configLoader');

let configLoader = loadConfig(__dirname);

function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

describe("the configuration loader", () => {

    it('should load a single config', () => {
        expect.assertions(1);

        return expect(configLoader('./fixtures/exampleConfig*.json')).resolves.toEqual(
            Object.assign(
                require('./fixtures/exampleConfig1.json'),
                require('./fixtures/exampleConfig2.json')
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
            testConfig = copy(require('./fixtures/exampleConfig1.json'));
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
});