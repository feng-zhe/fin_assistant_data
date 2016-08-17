/*
 * this file contains the logic to exclude some stocks from portfolio
 */
'use strict';

const mongodb = require('mongodb');
const fs = require('fs');

const MongoClient = mongodb.MongoClient;
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const dbUri = config.dbUri;
const suspend_time_gap = 3 * 24 * 60 * 60 * 1000;
const exclude_name = 'exclude';
const center_name = 'center';

const exclude = module.exports;

exclude.recreateExclude = function() {
    return new Promise(function(resolve, reject) {
        MongoClient.connect(dbUri, function(err, db) {
            db.collection(exclude_name).drop(function(err, result) {
                if (err) {
                    console.log('[info]', 'drop collection ' + exclude_name + ' failed, continue');
                }
                // find the suspended records
                db.collection(center_name)
                    .find({
                        Volume: 0
                    })
                    .toArray(function(err, suspendeds) {
                        if (err) {
                            reject('failed to read collection ' + center_name + ' to find suspended stock');
                            db.close();
                            return;
                        }
                        // compare those records' date with today, if they are close, it is considered to be suspended
                        if (suspendeds.length === 0) {
                            reject('no suspended records found at all');
                            db.close();
                            return;
                        }
                        let insertData = [];
                        let map = new Map();
                        for (let suspended of suspendeds) {
                            let today = new Date();
                            if (today - suspended.Date < suspend_time_gap) {
                                if (map.get(suspended.Symbol) === undefined) {
                                    insertData.push({
                                        Symbol: suspended.Symbol
                                    });
                                    map.set(suspended.Symbol, 1);
                                }
                            }
                        }
                        if (insertData.length === 0) {
                            console.log('[info]','no recent suspended records found');
                            resolve();
                            db.close();
                            return;
                        }
                        db.collection(exclude_name)
                            .insertMany(insertData)
                            .then(function() {
                                resolve();
                                db.close();
                            })
                            .catch(function(err) {
                                reject(err);
                                db.close();
                            });
                    });
            })
        });
    });
}
