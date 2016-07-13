'use strict';

const yahoo = require('./lib/stocks_yahoo');

const today = new Date();
const symbols = ['BIDU', 'BABA', 'JD', 'GOOG', 'AAPL', 'IBM'];

// update database
yahoo.set_index(function() {
    let symbolIndex = -1;
    (function inner_func() {
        symbolIndex++;
        if (symbolIndex >= symbols.length) return;
        let options = {
            symbol: symbols[symbolIndex]
        };
        yahoo.get_stock_all(options, inner_func);
    })();
});
