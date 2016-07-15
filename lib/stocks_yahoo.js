"use strict";

// exports
const yahoo = module.exports;

// requires
const http = require('http');
const mongodb = require('mongodb');
const csvParse = require('csv-parse');

// db related
const MongoClient = mongodb.MongoClient;
const dbUri = 'mongodb://localhost:27017/test';
const collectionName = 'stocks_yahoo';

// constant
const intv_map = new Map();
intv_map.set('day', 'd');
intv_map.set('month', 'm');
intv_map.set('year', 'y');

// recreate the collection again
// drop the collecton and get all data again
yahoo.recreate = function(symbols, callback) {
    set_index(function() {
        let symbolIndex = -1;
        (function inner_func() {
            symbolIndex++;
            if (symbolIndex >= symbols.length) {
                if (callback !== undefined) callback();
                return;
            }
            let options = {
                symbol: symbols[symbolIndex]
            };
            get_stock(options, inner_func);
        })();
    });
}

// just update the new data
yahoo.update = function(symbols, callback) {
    const options = {
        symbol:
    };
    const http_options = get_http_options(options);
}

// return the http_options for http.request
// query up to now if no end date.
function get_http_options(options) {

    // set up default value for http options
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
    if (options.start_day !== undefined) queryuri += '&a=' + options.start_day + '&b=' + options.start_month + '&c=' + options.start_year;
    queryuri += '&d=' + options.end_day + '&e=' + options.end_month + '&f=' + options.end_year + '&g=' + intv_map.get(options.interval) + '&ignore=.csv';
    console.log('uri: ' + hosturi + queryuri);

    const http_options = {};
    if (process.env.http_proxy) { // proxy exist
        console.log('http proxy detected')
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
        http_options.host = hosturi;
        http_options.port = 80;
        http_options.method = 'GET';
        http_options.path = queryuri; // when no proxy, path should be the query part
        http_options.headers = {
            Host: host
        };
    }
    return http_options;
}

// get data of this stock
function get_stock(options, callback) {

    // open db connection
    MongoClient.connect(dbUri, (err, db) => {
        // check whether the index has been set and set if no
        if (err) {
            console.log('mongodb connection failed: ' + err);
            return;
        }

        const http_options = get_http_options(options);

        // get the .csv file
        var req = http.request(http_options, (res) => {
            var data = '';
            res.on('error', (err) => {
                console.log('get .csv file failed: ' + err);
                db.close();
                if (callback !== undefined) callback(err);
            });
            res.on('data', (chunck) => {
                data += chunck;
            });
            res.on('end', (chunck) => {
                csvParse(data, null, (err, records) => {
                    if (err) {
                        console.log('parse csv file failed, error: ' + err);
                        db.close();
                    } else {
                        // create documents
                        let docs = [];
                        let fields = records[0]; // record[0] constains the fields
                        for (let i = 1; i < records.length; i++) {
                            // create the document
                            let doc = {
                                symbol: options.symbol
                            };
                            doc[fields[0]] = new Date(records[i][0]);
                            for (let j = 1; j < fields.length; j++) {
                                doc[fields[j]] = parseFloat(records[i][j]);
                            }
                            docs.push(doc);
                        }
                        // insert documents into database
                        db.collection(collectionName)
                            .insertMany(docs)
                            .then((res) => {
                                console.log('inserted :' + res.insertedCount);
                                db.close();
                                if (callback !== undefined) callback();
                            })
                            .catch((err) => {
                                console.log('insert failed, error: ' + err);
                                db.close();
                                if (callback !== undefined) callback(err);
                            });
                    }
                });
            })
        });
        req.end();
    });
}

// drop the total collection
function drop_collection(callback) {
    MongoClient.connect(dbUri, (err, db) => {
        if (err) {
            console.log('database connection failed');
            return;
        } else {
            db.collection(collectionName).drop((err, reply) => {
                if (err) {
                    console.log('drop collection ' + collectionName + ' failed, error:' + err);
                } else {
                    console.log('drop collection ' + collectionName + ' succeeded, reply:' + reply);
                }
                db.close();
                if (callback !== undefined) callback();
            });
        }
    });
}

// set index of database table
function set_index(callback) {
    console.log('setting index');
    MongoClient.connect(dbUri, (err, db) => {
        db.collection(collectionName).createIndex({ // this will do nothing if the tabe is already indexed
            'symbol': 1,
            'Date': -1
        }, {
            unique: true
        }, (err, results) => {
            if (err) {
                console.log('creating index failed');
            } else {
                console.log('index ' + results + ' is in table');
            }
            db.close();
            if (callback !== undefined) callback();
        });
    });
}
