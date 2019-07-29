/* eslint no-process-env:0 */
const yaml = require('yaml');
const ini = require('ini');
const stripJsonComments = require('strip-json-comments');
const rc = require('rc');
const merge = require('ut-port/merge');
const path = require('path');
const serverRequire = require;
const fs = require('fs');
const mergeWith = require('lodash.mergewith');

function parse(content) {
    if (/^\s*{/.test(content)) return JSON.parse(stripJsonComments(content));
    let result;
    try {
        result = yaml.parse(content);
    } catch (e) {
    }
    if (result && typeof result !== 'string') return result;
    return ini.parse(content);
}

const convert = value => mergeWith({}, value, (_, src) => {
    if (typeof src === 'string') {
        switch (src) {
            case 'true':
                return true;
            case 'false':
                return false;
            case 'null':
                return null;
            default:
                const float = parseFloat(src);
                if (!isNaN(float) && (float + '') === src) return float;
        }
    }
});

const edit = ({edit, formData, filename, log, stop = true, validate = false}) => {
    if (edit) {
        if (validate && edit.schema) {
            const Ajv = serverRequire('ajv');
            validate = new Ajv().compile(edit.schema)(formData);
        }
        if (!validate) {
            if (filename) {
                try {
                    formData = convert(parse(fs.readFileSync(filename, 'utf-8')));
                } catch (e) {}
            }
            return require('ut-form-jsonschema').edit({
                ...edit,
                log,
                stop,
                formData: formData || {}
            });
        };
    }
};

function mount(parent, m) {
    if (m && process.pkg) {
        var fs = require('fs');
        var path = require('path');
        if (fs.existsSync(path.resolve(m))) {
            process.pkg.mount(path.resolve(path.dirname(parent.filename), m), path.resolve(m));
        }
    }
}

function load(params = {}) {
    var argv = require('minimist')(process.argv.slice(2));
    let config = params.config;
    if (Array.isArray(config)) config = merge({}, ...config);
    if (!config) {
        config = {params: {}, version: params.version};
        config.params.app = process.env.UT_APP || params.app || argv._[0] || 'server';
        config.params.method = process.env.UT_METHOD || params.method || argv._[1] || 'debug';
        config.params.env = process.env.UT_ENV || params.env || argv._[2] || 'dev';
        config.service = config.params.app + '/' + config.params.env;
        const appPath = path.dirname(params.resolve('./' + config.params.app));
        mount(params.root, config.params.app);
        // load and merge configurations
        const configFilenames = ['common', config.params.method, config.params.env];
        const configs = configFilenames
            .map(filename => {
                let configPath;
                try {
                    configPath = require.resolve(path.join(appPath, filename));
                } catch (e) {}
                return configPath && require(configPath);
            })
            .filter(x => x);
        if (!configs.length) {
            throw new Error(`${configFilenames.join(' and/or ')} configuration must be provided`);
        }
        merge(config, ...configs, params.params);
    } else {
        if (!config.params) {
            config.params = {};
        }
        if (!config.params.app) {
            config.params.app = process.env.UT_APP || params.app || argv._[0] || 'server';
        }
        if (!config.params.method) {
            config.params.method = process.env.UT_METHOD || params.method || argv._[1] || 'debug';
        }
        if (!config.params.env) {
            config.params.env = process.env.UT_ENV || params.env || argv._[2] || 'dev';
        }
        config.service = config.params.app + '/' + config.params.env;
    }

    config.params.appname = config.params.appname || [
        'ut',
        (config.implementation || 'ut5').replace(/[-/\\]/g, '_'),
        process.env.UT_ENV || params.env || 'dev'
    ].join('_');

    return convert(rc(config.params.appname, config, argv, parse));
}

module.exports = {load, edit, merge};
