'use strict';

const yahoo = require('./lib/stock_yahoo');

const today = new Date();
var options = {
    symbol: 'BIDU'
};

yahoo.get_stock(options);
