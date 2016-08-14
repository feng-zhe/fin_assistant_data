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
    return new Promise(function(resolve, reject) {
        MongoClient.connect(config.dbUri, function(err, db) {
            if (err) {
                reject(err);
                db.close();
                return;
            }
            /*********** from yahoo ***********/
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
                            console.log('[info]', 'drop center collection failed');
                        }
                        //if(!db.collecton(constant.collection_name_yahoo)){
                        //resolve();
                        //return;
                        //}
                        db.collection(constant.collection_name_yahoo).find()
                            .toArray(function(err, results) {
                                if (err) {
                                    reject(err);
                                    db.close();
                                    return;
                                }
                                // create new objects
                                if (results.length === 0) {
                                    resolve();
                                    return;
                                } else {
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
                                            //console.log('[info]',result);
                                            db.collection(clctName).createIndex({ // this will do nothing if the tabe is already indexed
                                                'Symbol': 1,
                                                'Date': -1
                                            }, {
                                                unique: true
                                            }, function(err, results) {
                                                resolve();
                                                db.close();
                                            });
                                        }
                                    });
                                }
                            });
                    });
                });
        });
    });
}
