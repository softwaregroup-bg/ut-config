/* eslint no-process-env:0 */
const yaml = require('yaml');
const ini = require('ini');
const stripJsonComments = require('strip-json-comments');
const rc = require('rc');
const merge = require('ut-merge');
const path = require('path');
const serverRequire = require;
const fs = require('fs');

function parse(content) {
    if (/^\s*{/.test(content)) return JSON.parse(stripJsonComments(content));
    let result;
    try {
        result = yaml.parse(content);
    } catch (e) {
    }
    if (result && typeof result !== 'string') return result;
    return merge([{}, ini.parse(content)], {convert: true});
}

const edit = ({edit, formData, filename, log, stop = true, validate = false}) => {
    if (edit) {
        if (validate && edit.schema) {
            const Ajv = serverRequire('ajv');
            validate = new Ajv().compile(edit.schema)(formData);
        }
        if (!validate) {
            if (filename) {
                try {
                    formData = parse(fs.readFileSync(filename, 'utf-8'));
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

function load({ params, app, method, env, root, version, resolve, config } = {}) {
    const argv = merge([{}, require('minimist')(process.argv.slice(2))], {convert: true});
    const baseConfig = {
        version,
        params: {
            app: process.env.UT_APP || app || argv._[0] || 'server',
            method: process.env.UT_METHOD || method || argv._[1] || 'debug',
            env: process.env.UT_ENV || env || argv._[2] || 'dev'
        }
    };
    baseConfig.service = baseConfig.params.app + '/' + baseConfig.params.env;
    const configs = [];
    if (config) {
        if (Array.isArray(config)) configs.push(...config);
        else configs.push(config);
    } else {
        const appPath = path.dirname(resolve('./' + baseConfig.params.app));
        mount(root, baseConfig.params.app);
        // load and merge configurations
        const configFilenames = ['common', baseConfig.params.method, baseConfig.params.env];
        const implConfigs = configFilenames
            .map(filename => {
                let configPath;
                try {
                    configPath = require.resolve(path.join(appPath, filename));
                } catch (e) {}
                return configPath && require(configPath);
            })
            .filter(x => x);
        if (!implConfigs.length) {
            throw new Error(`${configFilenames.join(' and/or ')} configuration must be provided`);
        }
        configs.push(...implConfigs);
    }

    if (params) configs.push(params);

    let {
        appname,
        mergeOptions = {},
        implementation = 'ut5'
    } = merge({}, ...configs.map((config = {}) => {
        return {
            appname: config.params && config.params.appname,
            mergeOptions: config.merge,
            implementation: config.implementation
        };
    }));

    if (!appname) {
        baseConfig.params.appname = appname = `ut_${implementation.replace(/[-/\\]/g, '_')}_${baseConfig.params.env}`;
    }

    configs.push(rc(appname, {}, argv, parse));

    configs.unshift(baseConfig);

    return merge(configs, mergeOptions);
}

module.exports = {load, edit, merge};
