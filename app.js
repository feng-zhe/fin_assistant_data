'use strict';

const yahoo = require('./lib/stocks_yahoo');
const center = require('./lib/center');

const symbols = ['BIDU', 'BABA', 'JD', 'GOOG', 'AAPL', 'IBM'];

// update then call center
yahoo.update(symbols)
    .then(centerUpdate)
    .catch(function(err) {
        console.log('[error]', err);
        console.log('[info]', 'try to recreate yahoo database');
        yahoo.recreate(symbols)
            .then(centerUpdate)
            .catch(function() {
                console.log('[error]', 'recreation of yahoo failed');
            });
    });

function centerUpdate() {
    center.update().then(function(result) {
        console.log('[info]', 'data is moved into center');
    }).catch(function(err) {
        console.log('[error]', err);
    });
}
