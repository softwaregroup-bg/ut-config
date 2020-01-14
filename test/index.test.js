/*  eslint no-process-env: 0, no-template-curly-in-string: 0 */
const tap = require('tap');
const { load } = require('..');
const sortKeys = require('sort-keys');
const crypto = require('crypto');

const algorithm = process.env.UT_DECRYPT_ALGORITHM = 'aes-256-cbc';
const key = process.env.UT_DECRYPT_KEY = '12345678901234567890123456789012';
const iv = process.env.UT_DECRYPT_IV = '1234567890123456';

const cipher = crypto.createCipheriv(algorithm, key, iv);

let encrypted = cipher.update('test', 'utf8', 'hex');
encrypted += cipher.final('hex');

const clean = obj => {
    delete obj.params.appname;
    delete obj.params.env;
    return sortKeys(obj);
};

tap.test('load', assert => {
    assert.matchSnapshot(clean(load({
        config: {
            a: [`\${decrypt('${encrypted}')}`, 'ordinary string'],
            b: `\${decrypt('${encrypted}')}`,
            c: {
                d: `\${decrypt('${encrypted}')}`,
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
            a: [`\${decrypt('${encrypted}')}`, '${custom("ordinary string")}'],
            b: `\${custom(decrypt('${encrypted}'))}`,
            c: {
                d: `\${decrypt('${encrypted}')}`,
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
