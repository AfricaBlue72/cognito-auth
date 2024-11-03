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
exports.Clear = Clear;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */

function Clear(params, callback) {
    var func = M + ".Clear()";
    console.log(func, "running");
    params.Globals.State = {};
    params.Globals.Cookies = {};
    return callback(undefined, { "Cleared": "OK" });
} // Clear()
