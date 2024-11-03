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
exports.Verify = Verify;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */


function Verify(params, callback) {
    var func = M + ".Verify() - ";

    var data = params.Options.Data;
    if (data == undefined)
        data = params.Options.Verify;
    if (data == undefined)
        return callback(undefined, []);

    console.log(func + "data=", data);

    var errors = [];
    for (var expression of data) {
        var substitutedExpression = Utility.SubstituteAll(expression, params.Globals);
        var result = true;

        // Utility.Printf("%s: original verification: %s ", func, expression);
        // Utility.Printf("%s: after substitution: %s", func, substitutedExpression);

        // TODO:  check for harmful expressions before evaluating (but HOW??)
        try {
            // var modified = JSON.stringify(substitutedExpression.replace(/\"/g, '\''));
            // // modified = modified.replace(/\"/g, '\'');
            // console.log(func, 'modified=', modified);
            console.log(func, 'eval on:', substitutedExpression);
            result = eval(substitutedExpression) == true;
        }
        catch (error) {
            console.error(error);
            result = false;
        }
        if (result == false) {
            var error = {
                VerificationFailed: {
                    OriginalVerification: Utility.Sprintf("%s", expression),
                    VerificationAfterSubstitution: Utility.Sprintf("%s", substitutedExpression),
                }
            };
            Utility.Printf("%s: verification FAILURE: %s", func, JSON.stringify(error, 3, 3));
            errors.push(error);
        }
    }
    return callback(undefined, { Errors: errors });
} // Verify()
