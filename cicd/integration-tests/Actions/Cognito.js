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
const Utility = require("../Utility.js");

/*
 * Export initialize- the first and mandatory step before executing the other actions
 */
exports.CognitoGetUser = CognitoGetUser;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */

function CognitoGetUser(params, callback) {
    var func = M + ".CognitoGetUser()";
    console.log(func, "running, params.Options=", params.Options);

    var cognitoParams = {
        UserPoolId: "${UserPool}",
        Username: "???"
    }
    for (var key in params.Options) {
        if (cognitoParams[key])
            cognitoParams[key] = params.Options[key];
    }
    cognitoParams = Utility.SubstituteAll(cognitoParams, params.Globals);
    Utility.Printf("%s: will call cognitoidentityserviceprovider.adminGetUser() with params %j", func, cognitoParams);
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
    cognitoidentityserviceprovider.adminGetUser(cognitoParams, function(err, data) {
        if (err) {
            Utility.Printf("%s: error: %j", func, err);
            return callback(undefined, { Errors: [err] });
        }
        var user = data;
        Utility.Printf("%s: unparsed user object=%j", func, user);
        /*
         * Make it easier to access the individual fields
         */
        for (var attribute of user.UserAttributes) {
            user[attribute.Name] = attribute.Value;
        }
        delete user.UserAttributes;
        // Utility.Printf("%s: semi-parsed user object=%j", func, user);
        user["custom:data"] = JSON.parse(user["custom:data"]);
        user["dev:custom:data"] = JSON.parse(user["dev:custom:data"]);
        Utility.Printf("%s: user=%j", func, user);
        params.Globals.State.User = user;
        return callback(undefined, { Ok: "OK" });
    })
} // CognitoGetUser()


function CognitoSignup(params, callback) {
      var func = M + ".GetBookingById()-";

    //console.log(func + 'params=', params);
    params.Options = Utility.SubstituteAll(params.Options, params.Globals);
    //console.log(func, "running, params=", params);
    //console.log(func + "Globals now:", params.Globals);


    if (params.Globals.State == undefined)
        params.Globals.State = {};
        
    var start = new Date();
    var apiParams = {
        "Method": "post",
        "APIKey": params.Globals.ApiKeys['LifeVaultAPIExternal'],
        "API": "https://userapi." + params.Globals.CloudformationExports['Environment'] + ".lifevault.mylifevault.me" +
            params.Globals.CloudformationExports['LifeVaultAPIStageName'] + "/LifeVault/Anonymous/Account/Signup",
        "Body": {
            UserName: "${/LifeVault/Test/Username}",
            Password: "${/LifeVault/Test/Password}"
        }
    };


    // Add possible Query/Path parameters
    if (params.Options.Body != undefined) {
        apiParams.Body.Username == params.Options.Body.Username,
        apiParams.Body.Password == params.Options.Body.Password
    }

    params.Globals.State.Account = undefined;

    console.log(func, "APICall with params=", apiParams);
    Utility.APICall(apiParams, function(error, data) {
        if (error) {
            // console.log(func, "error=", error);
            console.log(func, "error");
            return callback(error, undefined);
        }
        var result = {
            Errors: [],
        };
        console.log(func, "found data");
        if (data == undefined) {
            result.Errors.push("API did not return data");
            return callback(undefined, result);
        }


        params.Globals.State.Errors = result.Errors;
        params.Globals.State.Account = data;
        params.Globals.State.ExecutionTime = new Date() - start;
        return callback(undefined, result);
    });
} // List_Events