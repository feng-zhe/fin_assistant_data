/*
 * this file contains logic about unifying all stock data from different
 * data sources into one database after averaging
 */

'use strict';

// requires
const mongodb = require('mongodb');
const fs = require('fs');

// config and constant
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const constant = require('./constant.js');

// db related
const MongoClient = mongodb.MongoClient;

// exports
const center = module.exports;

// update the new data
center.update = function() {
    const clctName = constant.collection_name_center;
    const resPromise = new Promise(function(resolve, reject) {
        MongoClient.connect(config.dbUri, function(err, db) {
            if (err) {
                reject(err);
                db.close();
                return;
            }
            /*********** yahoo ***********/
            // get all symbols
            db.collection(constant.collection_name_yahoo)
                .aggregate([{
                    '$group': {
                        '_id': '$Symbol'
                    }
                }])
                .toArray(function(err, result) {
                    if (err) {
                        console('[error]', err);
                        reject(err);
                        db.close();
                        return;
                    }
                    // currently we just copy into center database
                    db.collection(clctName).drop(function(err, result) {
                        if (err) {
                            console.log('[info]', 'drop collection failed');
                        }
                        db.collection(constant.collection_name_yahoo).find()
                            .toArray(function(err, results) {
                                if (err) {
                                    reject(err);
                                    db.close();
                                    return;
                                }
                                // create new objects
                                let objs = results.map(function(obj) {
                                    return {
                                        'Symbol': obj.Symbol,
                                        'Date': obj.Date,
                                        'Open': obj.Open,
                                        'High': obj.High,
                                        'Low': obj.Low,
                                        'Close': obj.Close,
                                        'AdjustedClose': obj['Adj Close'],
                                        'Volume': obj.Volume
                                    }
                                });
                                // insert into center database
                                db.collection(clctName).insertMany(objs, function(err, result) {
                                    if (err) {
                                        reject(err);
                                        db.close();
                                        return;
                                    } else {
                                        resolve(result);
                                        db.close();
                                    }
                                });
                            });
                    });
                });
        });
    });
    return resPromise;
}

// recreate the new data
center.recreate = function() {}
