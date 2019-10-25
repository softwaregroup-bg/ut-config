# ut-config

Reusable configuration `load` and `edit` methods.

## Starting

`ut-config` assumes the application is being run with a command like

```bash
node index {app} {method} {env}
```

or

```bash
UT_APP=server UT_METHOD=debug UT_ENV=dev node index
```

### Configuration

In addition to using environment configuration files within the application filesystem,
the following additional options are available, which will override the configuration

- Configuration file
- Command line parameters
- Environment variables

The algorithm of how these are applied is described in the `rc` package, [here](https://github.com/dominictarr/rc).
This is adapted from `rc` package readme:

- command line arguments, parsed by minimist _(e.g. `--foo baz`, also nested: `--foo.bar=baz`)_
- environment variables prefixed with `ut_${impl}_${env}_`
  - or use "\_\_" to indicate nested properties _(e.g.
  `ut_${impl}_${env}_foo__bar__baz` => `foo.bar.baz`)_
- if you passed an option `--config file` then from that file
- a local `.ut_${impl}_${env}rc` or the first found looking in
  `./ ../ ../../ ../../../` etc.
- `$HOME/.ut_${impl}_${env}rc`
- `$HOME/.ut_${impl}_${env}/config`
- `$HOME/.config/ut_${impl}_${env}`
- `$HOME/.config/ut_${impl}_${env}/config`
- `/etc/ut_${impl}_${env}rc`
- `/etc/ut_${impl}_${env}/config`
- the object taken from environment configuration file within {app} / UT_APP folder
  (dev.js[on], test.js[on], etc.)
- the object taken from method configuration file within {app} / UT_APP folder
  (debog.js[on], install.js[on])
- the object taken from common.js[on] configuration file within {app} / UT_APP folder

All configuration sources that were found will be flattened into one object,
so that sources **earlier** in this list override later ones.

File based configuration sources outside the application folder can be in
`ini`, `json` or `yaml` format.

${impl} is implementation identifier taken from environment configuration file,
${env} is the environment passed through command line or UT_ENV environment
variable, or 'dev' (by default)

### Environment configuration files

These files are part of the application and define the defaults
for each environment.
Environment configuration files can be either `.json` or `.js` file.
If it is a `.js` file, it must export an object. If a file named `common.js` or
`common.json` exists, it is used as a base object for all environments where the
actual environment configuration is merged. When using `.js` file, more complex
configuration is possible - like having functions or other objects, not
supported by JSON. Minimal environment file `dev.json` may look like:

```json
{
    "implementation": "impl-test",
    "service": "admin"
}
```
