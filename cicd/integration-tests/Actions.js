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
// const Async = require("async");
// const Querystring = require('querystring');


/*
 * Internal libraries
 */
const Utility = require("./Utility");
const ParametersVerify = require("./ParametersVerify");
const ActionsGeneric = require("./ActionsGeneric");


/*
 * Globals: for all tests
 */
// var Globals = {
//  BASE: "execute-api.eu-west-1.amazonaws.com",
// Prefix: "Test.",
// };
var Globals = ActionsGeneric.Globals;


/*
 * Export initialize- the first and mandatory step before executing the other actions
 */
exports.Initialize = ActionsGeneric.Initialize;


/*
 * Debug helpers
 */
exports.DUMP_GLOBALS = ActionsGeneric.DumpGlobals;
exports.SLEEP = ActionsGeneric.Sleep;
exports.VERIFY = ActionsGeneric.Verify;


/* 
 * The Actions to build scenario's with
 */
exports.CLEAR = ActionsGeneric.Clear;
exports.LIST_EVENT = ListEvent;
exports.LIST_EVENTS = ListEvents;



/*             *
 *   C o d e   * 
 *             */


/*
 * Call API to get one event. params may have an SiteCode.
 */
function ListEvents(params, callback) {
    var func = M + ".ListEvents()";
    params = ActionsGeneric.Substitute(params);
    console.log(func, "running, params=", params);
    console.log("globals now:", Globals);
    var start = new Date();
    var apiparams = {
        "Method": "get",
        "APIKey": Globals.ApiKeys['PRSAPIExternal'],
        // "API": Globals.Parameters['PRSAPIURL'] + "/Public/Events",
        "API": "https://prs." + Globals.Parameters['Environment'] + ".gateway.hcapp.nl/v1/Public/Games",
        "Body": ""
    };
    if (params.SiteCode != undefined) {
        apiparams.API = apiparams.API + "?SiteCode=" + params.SiteCode;
    }
    console.log(func, "APICall with params=", apiparams);
    Utility.APICall(apiparams, function(error, data) {
        if (error) {
            // console.log(func, "error=", error);
            console.log(func, "error");
            return callback(error, undefined);
        }
        var result = {
            Errors: [],
        };
        console.log(func, "data gevonden");
        if (data == undefined) {
            result.Errors.push("API did not return data");
            return callback(undefined, result);
        }
        Globals.State = result;
        Globals.State.Events = data;
        Globals.State.NumberOfEvents = data.length;
        Globals.State.ExecutionTime = new Date() - start;
        return callback(undefined, result);
    });
} // ListEvents


/*
 * Call API to get information about one event. params MUST have an EventId.
 */
function ListEvent(params, callback) {
    var func = M + ".ListEvents()";

    var result = [];

    var error = ParametersVerify.Verify(func, params, "EventId", "*");
    if (error) {
        console.error(func, "ParametersVerify.Verify()", error);
        result.Errors.push(error);
        return callback(undefined, result);
    }

    params = ActionsGeneric.Substitute(params);
    console.log(func, "running, params=", params);
    var start = new Date();
    var apiparams = {
        "Method": "get",
        "APIKey": Globals.ApiKeys['PRSAPIExternal'],
        // "API": Globals.Parameters['PRSAPIURL'] + "/Public/Events",
        "API": "https://prs." + Globals.Parameters['Environment'] + ".gateway.hcapp.nl/v1/Public/Game",
        "Body": ""
    };
    if (params.EventId != undefined) {
        apiparams.API = apiparams.API + "?EventId=" + params.EventId;
    }
    console.log(func, "APICall with params=", apiparams);
    Utility.APICall(apiparams, function(error, data) {
        if (error) {
            // console.log(func, "error=", error);
            console.log(func, "error");
            return callback(error, undefined);
        }
        var result = {
            Errors: [],
        };
        console.log(func, "data gevonden");
        if (data == undefined) {
            result.Errors.push("API did not return data");
            return callback(undefined, result);
        }
        console.log(func, "data:", data);
        console.log(func, "number of events here: ", data.length);
        Globals.State = result;
        Globals.State.Event = data;
        Globals.State.NumberOfEvents = data.length;
        Globals.State.ExecutionTime = new Date() - start;
        return callback(undefined, result);
    });
} // ListEvents
