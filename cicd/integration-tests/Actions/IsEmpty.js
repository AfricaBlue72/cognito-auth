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
exports.IsEmpty = IsEmpty;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */

function IsEmpty(params, callback) {
    var func = M + ".NotEmpty() - ";

    var data = params.Options.Data;
    if (data == undefined)
        data = params.Options.NotEmpty;
    if (data == undefined)
        return callback(undefined, []);

    console.log(func + "data=", data);

    var errors = [];
    for (var expression of data) {
        var substitutedExpression = Utility.SubstituteAll(expression, params.Globals);

        if (!(substitutedExpression == undefined || substitutedExpression == "" || substitutedExpression == expression)) {
            var error = {
                NotEmptyFailed: {
                    Original: Utility.Sprintf("%s", expression),
                    AfterSubstitution: Utility.Sprintf("%s", substitutedExpression),
                }
            };
            Utility.Printf("%s: FAILURE: %s", func, JSON.stringify(error, 3, 3));
            errors.push(error);
        }
    }
    return callback(undefined, { Errors: errors });
} // IsEmpty()
