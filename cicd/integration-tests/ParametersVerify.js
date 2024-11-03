/*
 * Boilerplate
 */
'use strict';
const path = require('path');
const M = path.basename(__filename);

/*
 * External libraries
 */

/*
 * Internal libraries
 */

/*
 * Exports
 */
exports.Verify = Verify;

/*
 * Parameters.Verify()
 *
 * Usage:
 *    var err = Verify(func,params,paramsName,"MandatoryParameter1", "MandatoryParameter2", "OptionalParameter3");
 */


function Verify(func, params, paramsName, ...argv) {
   var func = M + ".Verify()";
   console.log(func, "running");
   if (params == undefined) {
      var err = {
         Message: "Missing parameters (none found)",
      };
      console.error(err);
      return err;
   }

   var result = {
      Function: func,
      ParamsName: paramsName,
      Errors: 0,
      Params: params,
      Argv: argv,
   };

   // Check all params in params
   for (var param in params) {
      if (param == undefined) continue;
      if (params[param] == undefined) continue;
      var found = false;
      // Consider all options
      for (var arg of argv) {
         if (param == arg) {
            if (result.Mandatory == undefined) result.Mandatory = {};
            result.Mandatory[param] = params[param];
            found = true;
            break;
         }
         if (arg.substr(0, 1) == "?" && param == arg.substr(1)) {
            if (result.Optional == undefined) result.Optional = {};
            result.Optional[param] = params[param];
            found = true;
            break;
         }
         if (arg == "*") {
            if (result.Wildcard == undefined) result.Wildcard = {};
            result.Wildcard[param] = params[param];
            found = true;
            break;
         }
      } // all args
      if (!found) {
         if (result.Unknown == undefined) result.Unknown = {};
         result.Unknown[param] = params[param];
         result.Errors++;
      }
   } // all properties in params

   // Check for missing parameters
   for (var arg of argv) {
      if (arg == "*") continue; // ignore wildcard indicator
      if (arg.substr(0, 1) == "?") continue; // ignore optional parameters
      if (params[arg] == undefined) {
         if (result.Missing == undefined) result.Missing = [];
         result.Missing.push(arg);
         result.Errors++;
      }
   }

   // Clean up otherwise we simply get too much
   delete result.Mandatory;
   delete result.Optional;
   delete result.Wildcard;
   delete result.Params;
   delete result.Argv;

   // 'undefined' indicates no errors
   if (result.Errors == 0) {
      // log.Debug("Ok, argv", argv);
      return undefined;
   }
   return { "Invalid Parameters": result };
} // Parameters.Verify()
