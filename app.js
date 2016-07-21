'use strict';

const yahoo = require('./lib/stocks_yahoo');

const symbols = ['BIDU', 'BABA', 'JD', 'GOOG', 'AAPL', 'IBM'];

// recreate the collection again
yahoo.update(symbols);
