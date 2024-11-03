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
const XML = require("../XML.js");

/*
 * Export initialize- the first and mandatory step before executing the other actions
 */
exports.APIGet = APIGet;
exports.APIPost = APIPost;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */

function APIGet(params, callback) {
    var func = M + ".APIGet()";
    Utility.Printf("%s: running, Options initially: %j", func, params.Options);
    params.Options = Utility.SubstituteAll(params.Options, params.Globals);
    Utility.Printf("%s: running, Options after substitution: %j", func, params.Options);

    var getParams = {
        API: params.Options.URL,
        Method: "GET",
        Headers: {},
        Options: params.Options.Options,
    };
    // overrides
    for (var key in getParams)
        if (params.Options[key]) getParams[key] = params.Options[key];

    getParams = Utility.SubstituteAll(getParams, params.Globals);
    Utility.Printf("%s: getParams: %j", func, getParams);

    Utility.APICall(getParams, function(err, data) {
        if (err)
            return callback(undefined, { Errors: [err] });
        // if (data.body.error)
        //     return callback(undefined, { Errors: [data.body.error] });
        Utility.Printf("%s: data: %3j", func, data);
        StoreCookies(params.Globals.State, data);
        err = Store(params.Globals.State, params.Options.Store, data);
        if (err)
            return callback(undefined, { Errors: [err] });
        return callback(undefined, { func: "OK", data: data });
    });
} // APIGet()

function APIPost(params, callback) {
    var func = M + ".APIPost()";
    Utility.Printf("%s: running, Options initially: %j", func, params.Options);
    params.Options = Utility.SubstituteAll(params.Options, params.Globals);
    Utility.Printf("%s: running, Options after substitution: %j", func, params.Options);

    var body = undefined;
    if (params.Options.Body)
        body = params.Options.Body;
    if (params.Options.XMLBody) {
        var count = 0;
        for (var key in params.Options.XMLBody) {
            count++;
            if (count > 1) {
                var error = {
                    Message: "Cannot handle more than one object in XMLBody",
                    Key: key,
                    Source: func
                };
                console.error(error);
                return callback(error, undefined);
            }
            var kv = key.split("!");
            if (kv == undefined || kv.length != 2) {
                var error = {
                    Message: "Cannot split the key into <key:xmlns>",
                    Key: key,
                    Source: func
                };
                console.error(error);
                return callback(error, undefined);
            }
            body = XML.json2xml(kv[0], params.Options.XMLBody[key], kv[1]);
            Utility.Printf("%s: generated xml body: '%s'", func, body);
        }
        if (count != 1) {
            var error = {
                Message: "Cannot find any object in XMLBody",
                Source: func
            };
            console.error(error);
            return callback(error, undefined);
        }
    }

    var postParams = {
        API: params.Options.URL,
        Method: "POST",
        Body: body,
        APIKey: "",
        Headers: {},
        Options: params.Options.Options,
    };
    // overrides
    for (var key in postParams)
        if (params.Options[key]) postParams[key] = params.Options[key];

    postParams = Utility.SubstituteAll(postParams, params.Globals);
    Utility.Printf("%s: postParams: %j", func, postParams);

    Utility.APICall(postParams, function(err, data) {
        if (err)
            return callback(undefined, { Errors: [err] });
        // if (data.body.error)
        //     return callback(undefined, { Errors: [data.body.error] });
        Utility.Printf("%s: resulting: %3j", func, data);
        StoreCookies(params.Globals.State, data);

        err = Store(params.Globals.State, params.Options.Store, data);
        if (err)
            return callback(undefined, { Errors: [err] });
        return callback(undefined, { func: "OK", data: data });
    });
} // APIPost()

/*
 * StoreCookies:
 *   data: data from APICall
 *   existing: existing.Cookies.X = X
 */
function StoreCookies(existing, data) {
    var func = M + ".StoreCookies()";
    if (existing.Cookies == undefined)
        existing.Cookies = {};
    existing = existing.Cookies;
    for (var cookieName in data.Cookies) {
        if (existing[cookieName] != undefined)
            console.log(func, "will overwrite", cookieName + "=" + existing[cookieName]);
        console.log(func, "storing", cookieName + "=" + data.Cookies[cookieName]);
        existing[cookieName] = data.Cookies[cookieName];
    }
} // StoreCookies()

/* 
 * Store properties found in the result 
 */
function Store(destination, storeParams, data) {
    var func = M + ".Store()";
    // console.log(func, "data", JSON.stringify(data, 3, 3));
    if (storeParams == undefined)
        return undefined;
    for (var key in storeParams) {
        var value = Utility.Substitute(key, data);
        // console.log(func, "key=" + key, "value=" + value);
        if (value == undefined || value == key) {
            var error = {
                Source: func,
                Message: "Result does not contain the key we want to store",
                Key: key
            };
            console.error(error);
            return error;
        }
        var property = storeParams[key];
        console.log(func, "Storing key  =" + key);
        console.log(func, "        value=" + value);
        console.log(func, "        as   :" + property);
        destination[property] = value;
    }
    return undefined; // no error
} // Store()
