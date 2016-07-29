'use strict';

const yahoo = require('./lib/stocks_yahoo');
const center = require('./lib/center');

const symbols = ['BIDU', 'BABA', 'JD', 'GOOG', 'AAPL', 'IBM'];

// update then call center
yahoo.update(symbols)
    .then(center.update)
    .catch(function() {
        yahoo.recreate(symbols)
            .then(center.update)
            .catch(function() {
                console.log('[error]', 'recreation of yahoo failed');
            });
    });
