const merge = require('ut-function.merge');
module.exports = (appname, conf) =>
    window.localStorage ? merge({}, conf, JSON.parse(window.localStorage.getItem(`.${appname}rc`))) : conf;
