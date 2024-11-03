/*
 * Boilerplate
 */
'use strict';
const path = require('path');
const M = path.basename(__filename);

/*
 * Export initialize- the first and mandatory step before executing the other actions
 */
exports.Sleep = Sleep;

/*
 * params.Globals.
 * params.Actions
 * params.Options
 */

function Sleep(params, callback) {
    var func = M + ".Sleep()";
    var seconds = params.Options.Data.Seconds;
    console.log(func, "running, seconds=" + seconds);
    setTimeout(function() {
        console.log(func, "Done, returning to callback");
        return callback();
    }, 1000 * seconds);

} // Clear()
