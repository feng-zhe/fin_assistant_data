/*
 * this file calls logic after normal updating data.  It will prepare extra information other than stock price, for later analyse.
 */
'use strict';

const exclude = require('./lib/exclude.js');

exclude()
    .then(function() {
        console.log('[info]', 'module "exclude" succeeded');
    })
    .catch(function(err) {
        console.log('[error]', 'module "exclude" failed: ' + err);
    })
