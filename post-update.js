'use strict';

const exclude = require('./lib/exclude.js');

exclude.recreateExclude()
    .then(function() {
        console.log('[info]', 'module "exclude" succeeded');
    })
    .catch(function(err) {
        console.log('[error]', 'module "exclude" failed: ' + err);
    })
