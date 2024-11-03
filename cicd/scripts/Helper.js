#!/usr/bin/node

'use strict'

var AWS = require("aws-sdk");
var Async = require("async");

/*
 * Put the functions in the Helper object so internal usage of Helper.NNN is the same as external usage
 */
var Helper = {};

/*
 * Display error and invoke callback
 */
Helper.Fail = function(error, callback) {
    if (error.Id)
        console.error(error.Id, "ERROR", error);
    else
        console.error("ERROR", error);
    if (callback == undefined)
        throw JSON.stringify(error);
    else
        callback(error, undefined);
}; // Fail()


/*
 * Pager() de-paginates generic AWS functions relying on NextToken
 */
Helper.Pager = function(params, callback) {
    var id = "Helper.Pager()";
    //console.log(id, "params", params);
    var results = [];
    Async.doUntil(
        // Iteratee
        function(next) {
            //console.log(id, "doUntil params", params);
            params.Func(params.Parameters, function(err, data) {
                if (err) return Helper.Fail({ Id: id, Params: params, Err: err }, callback);
                results = results.concat(data[params.Key]);
                params.Parameters.NextToken = data.NextToken;
                next();
            });
        },
        // Test
        function() {
            return params.Parameters.NextToken == undefined;
        },
        // Callback
        function() {
            //console.log(id, "returning #", results.length);
            var result = {};
            result[params.Key] = results;
            callback(undefined, result);
        }
    );
}; // Pager()

Helper.AssumeRole = function(params, callback) {
    var id = "Helper.AssumeRole()";

    // Reset first
    AWS.config.credentials = undefined;

    var STS = new AWS.STS();
    //console.log(id, "params", params);

    STS.assumeRole(params, function(err, data) {
        if (err) return Helper.Fail({ Id: id, Api: "STS.assumeRole()", Params: params, Err: err }, callback);
        //console.log(id, "data", data);
        AWS.config.update({
            accessKeyId: data.Credentials.AccessKeyId,
            secretAccessKey: data.Credentials.SecretAccessKey,
            sessionToken: data.Credentials.SessionToken
        });
        callback(undefined, { Message: "OK", RoleArn: params.RoleArn });
    });
}; // AssumeRole()

/*
 * ListAccounts has some hardcoded stuff.
 * I see absolutely no use in parameterizing this :)
 */
Helper.ListAccounts = function(params, callback) {
    var id = "ListAccount()";
    //console.log(id, "params", params);

    Async.series([
        // First, assume role
        function(next) {
            var STS = new AWS.STS();
            var assumeParams = {
                RoleArn: "arn:aws:iam::204392078325:role/ListHcAccounts",
                ExternalId: "3yiAGr272fHd",
                RoleSessionName: "ListAccounts",
            };
            Helper.AssumeRole(assumeParams, function(err, data) {
                if (err) return Helper.Fail({ Id: id, Params: assumeParams, Err: err }, callback);
                next();
            });
        },
        // Then, call listAccounts
        function(next) {
            var organizations = new AWS.Organizations();
            var pagerParams = {
                Func: function(p, c) { organizations.listAccounts(p, c) }, // you need this wrapper since AWS SDK is special
                Parameters: {},
                Key: "Accounts",
            };
            Helper.Pager(pagerParams, function(err, data) {
                if (err) return Helper.Fail({ Id: id, Params: pagerParams, Err: err }, callback);
                //console.log(id, "accounts#", data.Accounts.length);
                return callback(undefined, data)
            });
        }
    ]);
} // ListAccounts();

/*
 * Export all functions
 */
for (var f in Helper)
    exports[f] = Helper[f];
