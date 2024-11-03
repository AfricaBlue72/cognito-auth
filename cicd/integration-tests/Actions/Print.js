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

/*
 * Internal libraries
 */
const Utility = require("../Utility.js");

/*
 * Export initialize- the first and mandatory step before executing the other actions
 */
exports.Print = Print;
// exports.PrintJWT = PrintJWT;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 *
 */

function Print(params, callback) {
    var func = M + ".Print()";

    var data = params.Options.Data;
    if (data == undefined)
        return callback(undefined, []);

    /*
     * The IF(data) here below are for the variable to be PRINTed.
     * The IF(result) is about formatting the result to be PRINTed.
     */
    if (Array.isArray(data)) {
        for (var o of data) {
            var result = Utility.SubstituteAll(o, params.Globals);
            if (typeof result == "object") result = JSON.stringify(result, 3, 3);
            Utility.Printf("%s: [%s] %s", func, o, result);
        }
    }
    else {
        if (typeof data == "object") {
            for (var key in data) {
                var result = Utility.SubstituteAll(data[key], params.Globals);
                if (typeof result == "object") result = JSON.stringify(result, 3, 3);
                Utility.Printf("%s: %s = %s", func, data[key], result);
            }
        }
        else {
            if (typeof data == "string" || typeof data == "number") {
                var result = Utility.SubstituteAll(data, params.Globals);
                if (typeof result == "object") result = JSON.stringify(result, 3, 3);
                Utility.Printf("%s: %s = %s", func, data, result);
            }
        }
    }
    return callback(undefined, []);
} // Print()


function PrintJWT(params, callback) {
    var func = M + ".Print()";

    var data = params.Options.Data;
    if (data == undefined)
        return callback(undefined, []);

    /*
     * The IF(data) here below are for the variable to be PRINTed.
     * The IF(result) is about formatting the result to be PRINTed.
     */
    var errors = [];
    if (Array.isArray(data)) {
        for (var o of data) {
            var result = Utility.SubstituteAll(o, params.Globals);
            if (typeof result == "object") result = JSON.stringify(result, 3, 3);
            Utility.Printf("%s: [%s] %s:", func, o, result);
            var ok = Utility.PrintDisassembledJWT(result);
            if (!ok) errors.push({ Message: "Cannot JWT disassemble(1)", jwt: result })
        }
    }
    else {
        if (typeof data == "object") {
            for (var key in data) {
                var result = Utility.SubstituteAll(data[key], params.Globals);
                if (typeof result == "object") result = JSON.stringify(result, 3, 3);
                Utility.Printf("%s: %s = %s:", func, key, result);
                var ok = Utility.PrintDisassembledJWT(result);
                if (!ok) errors.push({ Message: "Cannot JWT disassemble(2)", jwt: result })
            }
        }
        else {
            if (typeof data == "string" || typeof data == "number") {
                var result = Utility.SubstituteAll(data, params.Globals);
                if (typeof result == "object") result = JSON.stringify(result, 3, 3);
                Utility.Printf("%s: %s = %s:", func, data, result);
                var ok = Utility.PrintDisassembledJWT(result);
                if (!ok) errors.push({ Message: "Cannot JWT disassemble(3)", jwt: result })
            }
        }
    }

    if (errors.length) {
        console.log(func, "#errors", errors.length);
        return callback(errors, undefined);
    }
    return callback(undefined, errors);
} // PrintJWT()
