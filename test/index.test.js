/*  eslint no-process-env: 0, no-template-curly-in-string: 0 */
const tap = require('tap');
const { load } = require('..');
const sortKeys = require('sort-keys');
const key = process.env.UT_MASTER_KEY = '757435736f66747761726567726f7570757435736f66747761726567726f7570';
const cbc = require('ut-function.cbc')(key);
const encrypt = str => cbc.encrypt(str).toString('hex');

const clean = obj => {
    delete obj.params.appname;
    delete obj.params.env;
    return sortKeys(obj);
};

tap.test('load', assert => {
    assert.matchSnapshot(clean(load({
        config: {
            a: [`\${decrypt('${encrypt('a.0')}')}`, 'ordinary string'],
            b: `\${decrypt('${encrypt('b')}')}`,
            c: {
                d: `\${decrypt('${encrypt('c.d')}')}`,
                e: ['ordinary string'],
                f: 'ordinary string',
                g: {
                    h: 'ordinary string'
                }
            }
        }
    }), {deep: true}), 'decrypt');

    assert.matchSnapshot(clean(load({
        config: {
            a: [`\${decrypt('${encrypt('a.0')}')}`, '${custom("ordinary string")}'],
            b: `\${custom(decrypt('${encrypt('b')}'))}`,
            c: {
                d: `\${decrypt('${encrypt('c.d')}')}`,
                e: ['ordinary string'],
                f: 'ordinary string',
                g: {
                    h: '${custom("ordinary string")}'
                }
            }
        },
        context: {
            custom: str => str + ' - custom'
        }
    }), {deep: true}), 'custom context');

    assert.end();
});
