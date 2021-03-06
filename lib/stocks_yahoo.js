"use strict";

// exports
const yahoo = module.exports;

// requires
const http = require('http');
const mongodb = require('mongodb');
const csvParse = require('csv-parse');
const fs = require('fs');

// config
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')); // be aware that this relative path is to the calling process instead of this file
const constant = require('./constant.js');

// db related
const MongoClient = mongodb.MongoClient;

// constant
const intv_map = new Map();
intv_map.set('day', 'd');
intv_map.set('month', 'm');
intv_map.set('year', 'y');
const defaultDate = new Date('2000-01-01');

/*********** return a promise ***********/
// recreate the collection again
yahoo.recreate = function(symbols) {
    const resPromise = new Promise(function(resolve, reject) {
        // open db connection
        MongoClient.connect(config.dbUri, (err, db) => {
            const collectionName = constant.collection_name_yahoo;
            // check whether the index has been set and set if no
            if (err) {
                console.log('[error]', 'mongodb connection failed: ' + err);
                if (reject) reject(err);
                return;
            }
            // drop the collecton and get all data again
            db.collection(collectionName).drop(function(err, res) {
                if (err) {
                    console.log('[info]', 'drop collection failed'); // if drop failed, we continue because it is the first time
                } else {
                    console.log('[info]', 'collection dropped, response:' + res);
                }
                // create index
                db.collection(collectionName).createIndex({ // this will do nothing if the tabe is already indexed
                    'Symbol': 1,
                    'Date': -1
                }, {
                    unique: true
                }, function(err, results) {
                    if (err) {
                        console.log('[error]', 'creating index failed');
                        db.close();
                        if (reject) reject(err);
                        return;
                    }
                    console.log('[info]', 'index ' + results + ' is in table');
                    (function inner_func(symbolIndex) {
                        if (symbolIndex >= symbols.length) {
                            db.close();
                            if (resolve) resolve();
                            return;
                        }
                        let options = {
                            symbol: symbols[symbolIndex]
                        };
                        get_stock_csv(options, function(err, docs) {
                            if (err) {
                                console.log('[error]', err);
                                inner_func(symbolIndex + 1);
                                return;
                            }
                            if (!docs || docs.length === 0 || docs.length === undefined) {
                                console.log('[info]', 'no records in returned files');
                                inner_func(symbolIndex + 1);
                                return;
                            }
                            db.collection(collectionName)
                                .insertMany(docs)
                                .then((res) => {
                                    console.log('[info]', 'inserted :' + res.insertedCount);
                                    inner_func(symbolIndex + 1);
                                })
                                .catch((err) => {
                                    console.log('[error]', 'insert block failed, error: ' + err);
                                });
                        });
                    })(0);
                });
            });
        });
    });
    return resPromise;
}

// just update the new data
yahoo.update = function(symbols) {
    const collectionName = constant.collection_name_yahoo;
    const resPromise = new Promise(function(resolve, reject) {
        console.log('[info]', 'updating the yahoo stock database');
        // open db connection
        MongoClient.connect(config.dbUri, (err, db) => {
            if (err) {
                console.log('[error]', 'mongodb connection failed: ' + err);
                if (reject) reject(err);
                return;
            }
            (function inner_func(symbolIndex) {
                if (symbolIndex >= symbols.length) {
                    db.close();
                    if (resolve) resolve(); // indicating this update is done
                    return;
                }
                console.log('[info]', 'updating the stock: ' + symbols[symbolIndex]);
                // query the last date of this stock in database
                var cursor = db.collection(collectionName).find({
                    'Symbol': symbols[symbolIndex]
                }).sort({
                    'Date': -1
                }).limit(1);
                cursor.next(function(err, last) {
                    let date;
                    if (last === null) date = defaultDate;
                    else date = last.Date;
                    let options = {
                        start_day: date.getDate() + 1, // query next day
                        start_month: date.getMonth(),
                        start_year: date.getFullYear(),
                        symbol: symbols[symbolIndex]
                    };
                    console.log('[info]', 'get latest date is ' + date);
                    // get the new data
                    // please be aware of that sometimes the yahoo will still return the csv file with full data even we specify the start date
                    get_stock_csv(options, function(err, docs) {
                        if (err) {
                            console.log('[error]', err);
                            inner_func(symbolIndex + 1);
                            return;
                        }
                        if (!docs || docs.length === 0 || docs.length === undefined) {
                            console.log('[info]', 'no records in returned files');
                            inner_func(symbolIndex + 1);
                            return;
                        }
                        // filter docs by date
                        docs = docs.filter(function(elem) {
                            if (elem.Date.getTime() <= date.getTime()) {
                                return false;
                            } else {
                                return true;
                            }
                        });
                        // insert into database
                        if (docs.length === 0) { // skip this stock
                            console.log('[info]', 'no update data found for stock: ' + symbols[symbolIndex]);
                            inner_func(symbolIndex + 1);
                            return;
                        } else {
                            db.collection(collectionName)
                                .insertMany(docs)
                                .then((res) => {
                                    console.log('[info]', 'inserted :' + res.insertedCount);
                                    inner_func(symbolIndex + 1);
                                })
                                .catch((err) => {
                                    console.log('[info]', 'insert failed, error: ' + err);
                                    inner_func(symbolIndex + 1);
                                });
                        }
                    });
                });
            })(0);
        });
    });
    return resPromise;
}

// return the http_options for http.request
// query up to now if no end date.
function get_http_options(options) {
    // set up default value for end date
    const today = new Date();
    const cday = today.getDate();
    const cmonth = today.getMonth();
    const cyear = today.getFullYear();
    if (options.end_day === undefined) options.end_day = cday;
    if (options.end_month === undefined) options.end_month = cmonth;
    if (options.end_year === undefined) options.end_year = cyear;
    if (options.interval === undefined) options.interval = 'day';

    // create the http options, the path part will be completed later
    const host = 'chart.finance.yahoo.com';
    const protocol = 'http://';
    const hosturi = protocol + host;
    let queryuri = '/table.csv?' + 's=' + options.symbol;
    if (options.start_day !== undefined) queryuri += '&a=' + options.start_day + '&b=' + options.start_month + '&c=' + options.start_year; // add start date if not undefined
    queryuri += '&d=' + options.end_day + '&e=' + options.end_month + '&f=' + options.end_year + '&g=' + intv_map.get(options.interval) + '&ignore=.csv';
    console.log('[debug]', 'uri: ' + hosturi + queryuri);

    const http_options = {};
    if (process.env.http_proxy) { // proxy exist
        console.log('[info]', 'proxy detected');
        const pos = process.env.http_proxy.indexOf(':');
        const proxy = process.env.http_proxy.substr(0, pos);
        const port = parseInt(process.env.http_proxy.substr(pos + 1));
        http_options.host = proxy;
        http_options.port = port;
        http_options.method = 'GET';
        http_options.path = hosturi + queryuri; // when there is proxy, the path should be the actual uri
        http_options.headers = {
            Host: host
        };
    } else { // no proxy
        console.log('[info]', 'no proxy detected');
        http_options.host = host;
        http_options.port = 80;
        http_options.method = 'GET';
        http_options.path = queryuri; // when no proxy, path should be the query part
        http_options.headers = {
            Host: host
        };
    }
    return http_options;
}

// get data of this stock from csv.file,
// callback(err,docs)
// the docs are already parsed objects
function get_stock_csv(options, callback) {
    // create the http options
    const http_options = get_http_options(options);
    // get the .csv file
    var req = http.request(http_options, (res) => {
        var data = '';
        res.on('error', (err) => {
            db.close();
            if (callback) callback('get .csv file failed: ');
        });
        res.on('data', (chunck) => {
            data += chunck;
        });
        res.on('end', (chunck) => {
            let exFixCols = {
                symbol: options.symbol
            };
            // parse the document
            csvParse(data, {
                columns: true
            }, function(err, docs) {
                if (err) {
                    callback('parse .csv file failed:' + err);
                    return;
                }
                // add symbol and transform corresponding types
                for (let doc of docs) {
                    doc['Symbol'] = options.symbol;
                    doc['Date'] = new Date(doc['Date']);
                    doc['Open'] = parseFloat(doc['Open']);
                    doc['High'] = parseFloat(doc['High']);
                    doc['Low'] = parseFloat(doc['Low']);
                    doc['Close'] = parseFloat(doc['Close']);
                    doc['Volume'] = parseFloat(doc['Volume']);
                    doc['Adj Close'] = parseFloat(doc['Adj Close']);
                }
                // call the callback
                if (callback) callback(null, docs);
            });
        })
    });
    req.end();
}
