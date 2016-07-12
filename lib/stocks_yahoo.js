"use strict";

// exports
const yahoo = module.exports;

// requires
const mongodb = require('mongodb');
const http = require('http');
const cheerio = require('cheerio');

// db related
const MongoClient = mongodb.MongoClient;
const dbUri = 'mongodb://localhost:27017/test';
const dbTable = 'stocks_yahoo';

// set index of database table
yahoo.set_index = function(callback) {
    MongoClient.connect(dbUri, (err, db) => {
        db.collection(dbTable).createIndex({ // this will do nothing if the tabe is already indexed
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
            callback();
        });
    });
}

// update stock database
yahoo.get_stock = function(options,callback) {
    const intv_map = new Map();
    intv_map.set('day', 'd');
    intv_map.set('month', 'm');
    intv_map.set('year', 'y');
    // set up default value for http options
    const today = new Date();
    const cday = today.getDate();
    const cmonth = today.getMonth();
    const cyear = today.getFullYear();
    if (options.start_day === undefined) options.start_day = cday;
    if (options.start_month === undefined) options.start_month = cmonth;
    if (options.start_year === undefined) options.start_year = cyear - 5; // default start year is 5 years ago
    if (options.end_day === undefined) options.end_day = cday;
    if (options.end_month === undefined) options.end_month = cmonth;
    if (options.end_year === undefined) options.end_year = cyear;
    if (options.interval === undefined) options.end_year = 'day';

    // open db connection
    MongoClient.connect(dbUri, (err, db) => {
        // check whether the index has been set and set if no
        if (err) {
            console.log('mongodb connection failed: ' + err);
            return;
        }

        // create the http options
        const host = 'finance.yahoo.com';
        const protocol = 'http://';
        const hosturi = protocol + host;
        var http_options;
        if (process.env.http_proxy) { // proxy exist
            console.log('http proxy detected')
            const pos = process.env.http_proxy.indexOf(':');
            const proxy = process.env.http_proxy.substr(0, pos);
            const port = parseInt(process.env.http_proxy.substr(pos + 1));
            http_options = {
                host: proxy,
                port: port,
                method: 'GET',
                path: hosturi,
                headers: {
                    Host: host
                }
            };
        } else { // no proxy
            http_options = {
                host: hosturi,
                port: 80,
                method: 'GET',
                path: '',
                headers: {
                    Host: host
                }
            };
        }
        const http_options_path = http_options.path;

        function query(start_row) {
            // construct the query
            const queryuri = '/q/hp?s=' + options.symbol + '&a=' + options.start_day + '&b=' + options.start_month + '&c=' + options.start_year + '&d=' + options.end_day + '&e=' + options.end_month + '&f=' + options.end_year + '&g=' + intv_map.get(options.interval) + '&z=66&y=' + start_row;
            http_options.path = http_options_path + queryuri; // also works without proxy
            console.log('query is: ' + queryuri);

            // query the weisite
            var req = http.request(http_options, (res) => {
                var data = '';
                res.on('error', (err) => {
                    console.log('http request error: ' + err);
                    db.close();
                    callback(err);
                });
                res.on('data', (chunck) => {
                    data += chunck;
                });
                res.on('end', (chunck) => {
                    // parse the HTML
                    var $ = cheerio.load(data, {
                        xmlmode: true,
                        decodeEntities: true
                    });
                    var tbheaders = [];
                    var table = $('table.yfnc_datamodoutline1 table');
                    // if there is no data, close the db link and return
                    if (table.find('th').length === 0) {
                        console.log('no data in html, ending...');
                        db.close();
                        callback();
                        return;
                    }
                    // get table header
                    table.find('th').each(function(i, elem) {
                        tbheaders.push($(elem).text().trim());
                    });
                    // get table rows
                    var objs = [];
                    table.find('tr:not(:has(th))').each((i, elem) => { // for each <tr>
                        let obj = {
                            symbol: options.symbol // stock symbol
                        };
                        if ($(elem).children('td').length !== tbheaders.length) { // skip if there is any span cell
                            return;
                        }
                        $(elem).children('td').each((i, elem) => { // for each <td>
                            obj[tbheaders[i]] =
                                i === 0 ?
                                new Date($(elem).text().trim()) : // the first column is date
                                parseFloat($(elem).text()); // others are just numbers
                        });
                        objs.push(obj);
                    });

                    // insert into database
                    db.collection(dbTable).insertMany(objs, (err, res) => {
                        // log
                        if (err) console.log('insertion failed:' + err);
                        else console.log('inserted ' + start_row + '-' + (start_row + res.insertedCount));
                        // query the next 66 rows
                        query(start_row + 66);
                    });
                })
            });
            req.end();
        }

        // start the first query
        query(0);
    });
}
