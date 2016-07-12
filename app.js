'use strict';

const yahoo = require('./lib/stocks_yahoo');

const today = new Date();
var symbols = ['BIDU', 'BABA', 'JD', 'GOOG', 'APPL'];
var options = {
    symbol: 'BIDU'
};

yahoo.set_index(function() {
    let symbolIndex = -1;
    (function inner_func() {
        symbolIndex++;
        if (symbolIndex >= symbols.length) return;
        let options = {
            symbol: symbols[symbolIndex]
        };
        yahoo.get_stock(options, inner_func);
    })(0);
});
