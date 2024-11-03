/*
 * Boilerplate
 */
'use strict';
const path = require('path');
const M = path.basename(__filename);

/*
 * External libraries
 */
const AWS = require('aws-sdk');
const Async = require("async");
const Querystring = require('querystring');

/*
 * Internal libraries
 */
const Utility = require("Utility");
// const JWT = require("./JWT");
// const ParametersVerify = require("./ParametersVerify");

/*
 * Globals: for all tests
 */
// var Globals = {
//   //  BASE: "execute-api.eu-west-1.amazonaws.com",
//   Prefix: "Test.",
// };

/*
 * Export initialize- the first and mandatory step before executing the other actions
 */
exports.Initialize = Initialize;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */
function Initialize(params, callback) {
    var func = M + ".Initialize()";
    AWS.config.update({ region: 'eu-west-1' });
    // base URL for API-gateway
    console.log(func, "running, Options=", params.Options);
    Async.series([
        // 1. Get CloudFormation exports 
        function(next) {
            console.log(func, "Step 1: Calling Utility.CloudFormationGetExports()...");
            Utility.CloudformationGetExports({}, function(err, data) {
                if (err) return callback(err);
                params.Globals.CloudformationExports = data;
                console.log(func, "Globals.CloudformationExports", params.Globals.CloudformationExports);
                next();
            });
        },

        // 2. Get SSM Parameters 
        function(next) {
            console.log(func, "Step 2: Calling Utility.SSMGetParameters()...");
            Utility.SSMGetParameters({ /*Prefix: Globals.Prefix*/ }, function(err, data) {
                if (err) return callback(err);
                params.Globals.SSMParameters = data;
                console.log(func, "Globals.SSMParameters", params.Globals.SSMParameters);
                next();
            });
        },

        // 3. Join SSM and Cloudformation into Globals.Parameters
        function(next) {
            console.log(func, "Step 3: Joining all parameters()...");
            var count = 0;
            params.Globals.Parameters = {};
            for (var key in params.Globals.CloudformationExports) {
                params.Globals.Parameters[key] = params.Globals.CloudformationExports[key];
                count++;
            }
            for (var key in params.Globals.SSMParameters) {
                if (params.Globals.Parameters[key] != undefined) {
                    console.log(func, Utility.Sprintf("Warning; replacing key '%s' value '%s' by value '%s'",
                        key,
                        params.Globals.Parameters[key],
                        params.Globals.SSMParameters[key]));
                }
                else {
                    count++;
                }
                params.Globals.Parameters[key] = params.Globals.SSMParameters[key];
            }
            console.log(func, "Total # parameters: ", count);
            next();
        },

        // 4. Get all API keys
        function(next) {
            console.log(func, "Step 4: Obtaining API keys...");
            var apigateway = new AWS.APIGateway();
            var keys = {};
            apigateway.getApiKeys({ includeValues: true }, function(err, data) {
                if (err) {
                    var error = {
                        Source: func,
                        Message: "apigateway.getApiKey() failed",
                        err: err
                    };
                    console.error(func, error);
                    return callback(error, undefined);
                }
                // Store the list of keys in the hash 'keys'
                var count = 0;
                for (var key of data.items) {
                    console.log(func, "Found key", JSON.stringify(key));
                    keys[key.name] = key.value;
                    count++;
                }
                console.log(func, "done with #keys ", count);
                params.Globals.APIKeys = keys;
                next();
            });
        },

        // 5. Clear
        function(next) {
            console.log(func, "Step 5. Calling Clear()...");
            params.Globals.Actions.Clear(params, next);
        },

        // 6. Done
        function(next) {
            console.log(func, "Step 6: Done");
            callback(undefined, { Ok: "OK" });
        }
    ]);
} // Actions.Initialize()
