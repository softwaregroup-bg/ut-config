/* eslint no-process-env:0 */
const rc = require('rc');
const merge = require('ut-function.merge');
const template = require('ut-function.template');
const path = require('path');

function parse(content) {
    const yaml = require('yaml');
    const ini = require('ini');
    const stripJsonComments = require('strip-json-comments');
    if (/^\s*{/.test(content)) return JSON.parse(stripJsonComments(content));
    let result;
    let yamlError;
    try {
        result = yaml.parse(content);
    } catch (error) {
        yamlError = error;
        delete yamlError.source;
    }
    if (result && typeof result !== 'string') return result;
    const parsedIni = ini.parse(content);
    // ini with keys containing ':' is most likely yaml, throw the yaml parse error
    if (yamlError && Object.keys(parsedIni).find(key => key.includes(':'))) throw yamlError;
    return merge([{}, parsedIni], {convert: true});
}

const edit = ({edit, formData, filename, log, stop = true, validate = false}) => {
    if (edit) {
        if (validate && edit.schema) {
            const Ajv = require('ajv');
            validate = new Ajv().compile(edit.schema)(formData);
        }
        if (!validate) {
            if (filename) {
                try {
                    const fs = require('fs');
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
        const fs = require('fs');
        const path = require('path');
        if (fs.existsSync(path.resolve(m))) {
            process.pkg.mount(path.resolve(path.dirname(parent.filename), m), path.resolve(m));
        }
    }
}

function load({ params, app, method, env, root, version, resolve, config, context, defaultConfig, defaultOverlays } = {}) {
    const argv = merge([{}, require('minimist')(process.argv.slice(2))], {convert: true});
    const baseConfig = {
        version,
        params: {
            app: process.env.UT_APP || app || argv._[0] || 'server',
            method: process.env.UT_METHOD || method || argv._[1] || 'debug',
            env: process.env.UT_ENV || env || argv._[2] || 'dev'
        }
    };
    baseConfig.service = baseConfig.params.app;
    const configs = [defaultConfig].filter(Boolean);
    if (config) {
        if (Array.isArray(config)) configs.push(...config);
        else configs.push(config);
    } else {
        const appPath = path.dirname(resolve('./' + baseConfig.params.app));
        mount(root, baseConfig.params.app);
        // load and merge configurations
        const configFilenames = ['common', baseConfig.params.method, baseConfig.params.env].concat(defaultOverlays).concat(argv.overlay).filter(Boolean);
        configs.push({configFilenames});
        const implConfigs = configFilenames
            .map(filename => {
                let configPath;
                try {
                    configPath = require('./serverRequire').resolve(path.join(appPath, filename));
                } catch (e) {}
                return configPath && require('./serverRequire')(configPath);
            })
            .filter(Boolean);
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

    if (!context && !process.env.UT_MASTER_KEY) return merge(configs, mergeOptions);

    return template(merge(configs, mergeOptions), {
        ...context,
        ...process.env.UT_MASTER_KEY && require('ut-function.cbc')(process.env.UT_MASTER_KEY)
    });
}

module.exports = {load, edit, merge};
