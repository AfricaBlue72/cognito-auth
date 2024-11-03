#!/usr/local/bin/node

// Boilerplate
const path = require('path');
const M = path.basename(__filename); // 

// External Libraries
const Async = require('async');
const AWS = require('aws-sdk');
const Request = require('request');
const Sprintf = require('sprintf-js').sprintf;
const Process = require("process");

// Internal libraries
const XML = require("./XML.js");

/*
 * Our exports
 */
exports.JS = JS;
exports.Error = Error;
exports.VerifyParameters = VerifyParameters;
exports.APICall = APICall;
exports.CloudformationGetExports = CloudformationGetExports; // result is a map{}
exports.SSMGetParameters = SSMGetParameters; // result is a map{}
exports.Printf = Printf;
exports.Sprintf = Sprintf;
exports.Substitute = Substitute;
exports.SubstituteAll = SubstituteAll;
exports.Filter = Filter;
exports.Banner = Banner;
exports.Exit = Exit;
exports.FindCaseInsensitive = FindCaseInsensitive;
exports.GetCookiesFromHeaders = GetCookiesFromHeaders;
exports.PrintDisassembledJWT = PrintDisassembledJWT;

/*
 * The Code
 */

function JS(o) {
   return JSON.stringify(o, 3, 3);
}


function Error(func, error, callback) {
   var err = {
      Func: func,
      Error: error,
   };
   console.error("ERROR", JS(err));
   return callback(err, undefined);
} // Error()


/*
 * Usage:
 *    var err = fParameters("MyFunction",myParams,"myParams","Property1", "Property...", ...)
 */
function VerifyParameters(funcName, params, paramName, ...argv) {
   var func = M + ".VerifyParameters()";
   for (var key of argv) {
      if (params[key] == undefined) {
         var err = { "Function": funcName, Parameters: paramName, "Missing parameter": key };
         console.error("ERROR", funcName, err);
         return err;
      }
   }
   return undefined;
} // VerifyParameters()


function CloudformationGetExports(params, callback) {
   var func = M + ".CloudformationGetExports()";
   Printf("%s: running...", func);
   var cloudformation = new AWS.CloudFormation( /*{ Region: "eu-west-1" }*/ );
   var listParams = {};
   var map = {};
   Async.doUntil(
      function(next) // iteratee
      {
         Printf("%s: calling ListExports()", func);
         cloudformation.listExports(listParams, function(err, data) {
            if (err) {
               Printf("%s: ERROR: %o", err);
               return Error(func, err, callback);
            }
            // console.log(M + ".CloudformationGetExports(): data=" + JSON.stringify(data));
            for (var exp of data.Exports) {
               map[exp.Name] = exp.Value;
            }
            // console.log(func, "NextToken", listParams.NextToken);
            listParams.NextToken = data.NextToken;
            Printf("%s: ready with ListExports()", func);
            // Printf("map = %s", JSON.stringify(map));
            next();
         });
      },
      function(cb) // test
      {
         if (listParams.NextToken == undefined) {
            Printf("%s: reached the end of the list", func);
            return true;
         }
         else {
            Printf("%s: there are more exports to retrieve", func);
            return false;
         }
      },
      function(err, data) // done
      {
         Printf("%s: done", func);
         var n = 0;
         for (var key in map)
            n++;
         Printf("%s: got #results: %d", func, n);
         callback(undefined, map);
      }
   ); // Async.doUntil()
} // CloudformationGetExports()


function SSMGetParameters(params, callback) {
   var func = M + ".SSMGetParameters()";
   console.log(func, "running...");
   var ssm = new AWS.SSM( /*{ Region: "eu-west-1" }*/ );

   var ssmMap = {};
   var describeParams = {};
   var haveDescribedAllParameters = false;
   Async.doUntil(
      function(next) // iteratee
      {
         console.log(func, "Step 1: ssm.describeParameter()...");
         ssm.describeParameters(describeParams, function(err, data) {
            if (err) return Error(func, err, callback);
            // console.log(M+".getParameters(): data="+JSON.stringify(data));
            var names = [];
            for (var parameter of data.Parameters) {
               if (params.Prefix != undefined) {
                  if (parameter.Name.startsWith(params.Prefix)) {
                     names.push(parameter.Name);
                     console.log(func, "+", parameter.Name);
                  }
                  else {
                     // console.log(func, "-", parameter.Name);
                  }
               }
               else {
                  names.push(parameter.Name);
                  console.log(func, "*", parameter.Name);
               }
            }
            console.log(func, "Have #", names.length);
            describeParams.NextToken = data.NextToken;
            if (describeParams.NextToken == undefined)
               haveDescribedAllParameters = true;
            if (names.length == 0)
               return next();
            console.log(func, "Step 2: Get Parameters..");
            var getParams = {
               Names: names,
               WithDecryption: true,
            };
            ssm.getParameters(getParams, function(err, data) {
               if (err) return callback(err, undefined);
               // console.log(func, "data.Parameters.length=" + data.Parameters.length);
               // console.log(M+".getParameters(): data="+JSON.stringify(data));
               for (var parameter of data.Parameters) {
                  // Remove the Prefix, if used:
                  if (params.Prefix != undefined)
                     ssmMap[parameter.Name.substring(params.Prefix.length)] = parameter.Value;
                  else
                     ssmMap[parameter.Name] = parameter.Value;
               }
               next();
            }); // ssm.getParameters() 
         }); // ssm.getParameters()  
      },
      function(cb) // test
      {
         console.log(func, "test: haveDescribedAllParameters", haveDescribedAllParameters);
         return haveDescribedAllParameters;
      },
      function(next) // callback
      {
         console.log("ssmMap", JS(ssmMap));
         console.log(func, "Step 3: Done.");
         callback(undefined, ssmMap);
      }
   ); // async.doUntil()
} // SSMGetParameters()


function APICall(params, callback) {
   var func = M + ".APICall()";

   /*
    * Some parameter validation 
    */
   var err = VerifyParameters(func, params, "params", "API");
   if (err) return callback(err, undefined);

   /*
    * Allow overriding settings from the actions parameters
    */
   var headers = {};
   if (params.Headers)
      headers = params.Headers;
   for (var key of ["APIKey", "ApiKey", "X-API-Key", "X-Api-Key", "X-API-KEY", "x-api-key"])
      if (params[key] != undefined && params[key] != "")
         headers["X-API-Key"] = params[key];
   if (params.Authorization)
      headers["Authorization"] = params.Authorization;
   if (params.ContentType)
      headers["Content-Type"] = params.ContentType;

   /* 
    * Validate params.Method
    */
   var method = params.Method;
   if (method == undefined)
      method = "get";
   method = method.toLowerCase();
   switch (method) {
      case "post":
      case "get":
      case "delete":
         break;
      default:
         return Error(func, { "Invalid parameter": Sprintf("Unsupported method '%s'", method) }, callback);
   } // test for supported methods
   if (Request[method] == undefined)
      return Error(func, { "Request does not support": Sprintf("Unsupported method '%s'", method) }, callback);

   /*
    * Create the params object for Request()
    */
   var requestParams = {
      method: method,
      headers: headers,
      url: params.API,
   };
   if (params.Options) {
      for (var key in params.Options)
         requestParams[key] = params.Options[key];
   }
   if (params.Body) {
      if (typeof params.Body == "object")
         requestParams.body = JSON.stringify(params.Body); // JS(params.Body);
      else
         requestParams.body = params.Body;
   }
   console.log(func, "requestParams=");
   console.log(requestParams);

   /*
    * Finally, call Request()
    */
   Request[method](requestParams, function(error, response, body) {
      if (error != undefined && error != {}) {
         console.log(func, "Request failed with error", error);
         console.log(func, "response", response);
         console.log(func, "body", body);
         return callback(error, undefined);
      }
      console.log(func, "Processing response...");
      console.log(func, "body=" + body);
      console.log(func, "response.headers=" + JSON.stringify(response.headers));
      var cookies = GetCookiesFromHeaders(response.headers);
      console.log(func, "cookies", JSON.stringify(cookies));
      console.log(func, "response.statusCode", response.statusCode);
      if (response.statusCode != 200 && response.statusCode != "200") {
         var error = {
            Message: "Unexpected status code",
            StatusCode: response.statusCode,
            Body: body,
         };
         return callback(error, undefined);
      }
      console.log(func, "response.headers", response.headers);

      /*
       * XML ?
       */
      if (response.headers["content-type"] == "application/xml") {
         console.log(func, "Content-Type is XML; parsing");
         XML.xml2json(body, function(error, data) {
            if (error) {
               console.error(func, "XML.xml2json() failed", error);
               return callback(error, undefined);
            }
            var result = XML.FlattenXMLResult(data);
            // I have no better way to return the cookies...
            result.Cookies = cookies;
            return callback(undefined, result);
         });
         return;
      }

      /* 
       * Assume JSON and if parsing fails, return the body as a string object
       */
      var result;
      console.log(func, "Assuming Content-Type is JSON; parsing");
      try {
         if (body == undefined)
            result = {};
         else
            result = JSON.parse(body);
         //console.log(func, "** result=", JS(result));
         // return callback(undefined, result);
      }
      catch (e) {
         if (e) {
            console.log(func, "Warning: cannot parse the body- returning it as a string");
            console.log(func, "body", body);
            console.log(func, "exeption e:", e);
            // return callback(undefined, { body: body });
            result = body;
         }
         // return Error(func, { Message: "Cannot parse json in body", Body: body }, callback);
      }
      // I have no better way to return the cookies...
      result.Cookies = cookies;
      return callback(undefined, result);
   });
} // APICall()


/*
 * Substitute: parse variables
 *
 * Usage: 
 *    var o = {
 *        Age: 21,
 *        Name: ${Person.Name}
 *    };
 *    var data = {
 *    { 
 *       Person: {
 *          Name: "Pieter"
 *       }
 *    };
 *    var result = Substitute(o,data);
 * 
 */
function Substitute(object, data) {
   var func = M + ".Substitute()";

   // console.log(func, "object=", object);

   if (Array.isArray(object)) {
      var result = [];
      for (var key in object) {
         result[key] = Substitute(object[key], data);
      }
      return result;
   }
   if (typeof object == "object") {
      var result = {};
      for (var key in object) {
         result[SubstituteKey(key, data)] = Substitute(object[key], data);
      }
      return result;
   }
   if (typeof object != "string") {
      return object;
   }

   /*
    * Replace ${variable} embedded in the string 'object':
    */
   var output = object;
   var current = 0;
   var start = object.indexOf("${", current);
   while (start >= 0) {
      var end = object.indexOf("}", start + 1);
      if (end > 0) {
         end++;
         var variable = object.slice(start, end);
         // console.log("from:" + start + " to:" + end + " is:<" + variable + ">");
         var replaceWith = SubstituteKey(variable, data);
         if (start == 0 && end == object.length) {
            // 'object' is simply '${something}'. Try not to stringify it here
            output = replaceWith;
         }
         else {
            if (typeof replaceWith != "string" && typeof replaceWith != "number")
               replaceWith = JSON.stringify(replaceWith);
            output = output.replace(variable, replaceWith);
         }
         current = end;
      }
      else
         current = start + 1;
      start = object.indexOf("${", current);
   }
   // console.log(func, "output=", output);

   return output; // return SubstituteKey(object, data);

} // Substitute()


function SubstituteKey(o, data) {
   var a = o.substring(2).slice(0, -1);
   // 'a' could be "Some.Data.Thing" which is actually a key (no object hierarchy):

   if (data[a] != undefined) {
      return data[a];
   }
   a = a.split(".");
   while (a.length >= 1) {

      if (data == undefined || data[a[0]] == undefined)
         data = o; // we cannot indicate failure since a another run on another data may work!
      else
         data = data[a[0]];
      a.shift();
   }
   return data;
}


/*
 * Use all keys in META as data for substitution
 */
function SubstituteAll(object, meta) {

   // console.log('SubstituteAll, object before=', object);

   for (var key in meta) {
      // console.log("SubstituteAll()-meta[" + key + "] before=", meta[key]);
      object = Substitute(object, meta[key]);
      // console.log("SubstituteAll()-meta[" + key + "] after=", meta[key]);
   }

   // console.log('SubstituteAll, object after=', object);
   return object;
}


// /*
//  * Use all keys in META as data for substitution
//  */
// function SubstituteAll(object, meta) {

//    // When you stringify the object there's just a string which eliminates any strange errors due to sub-documents
//    var stringifiedObject = JSON.stringify(object);

//    // console.log('SubstituteAll, object before=', object);

//    for (var key in meta) {
//       // console.log("SubstituteAll()-meta[" + key + "] before=", meta[key]);
//       stringifiedObject = Substitute(stringifiedObject, meta[key]);
//       // console.log("SubstituteAll()-meta[" + key + "] after=", meta[key]);
//    }

//    console.log('SubstituteAll, object after=', stringifiedObject);
//    return JSON.parse(stringifiedObject);
// }

/*
 *
 */
var FILTER_KEYS = [
   "Password",
   "APIKey"
];

function Filter(o) {
   if (o == undefined) return o;
   if (typeof o == "object") {
      var result = {};
      for (var key in o) {
         result[key] = Filter(o[key]);
      }
      return result;
   }
   if (typeof o != "string")
      return o;
   //
   for (var filterKey of FILTER_KEYS) {
      if (o.toLowerCase() != filterKey.toLowerCase())
         continue;
      return "@@@@@";
   }
   return o;
} // Filter()


// Show a Banner
function Banner(params) {
   // Build
   var line = "";
   for (var j = 0; j < 120; j++)
      line += params.Character;
   var col = "";
   for (var x = 0; x < params.Level; x++)
      col += params.Character;
   var emptyCol = col;
   while (emptyCol.length < (120 - col.length))
      emptyCol += params.Character;
   emptyCol += col;
   // Start drawing
   console.log("");
   for (var i = 0; i < params.Level; i++)
      console.log(line);
   console.log(emptyCol);
   if (params.Date == undefined)
      params.Date = new Date();
   for (var key in params) {
      if (key == "Character") continue;
      if (key == "Level") continue;
      // var w = col + "    " + key + " : " + params[key] + "   ";
      var w = Sprintf("%s  %10s : %s  ", col, key, params[key]);
      while (w.length < (120 - col.length))
         w += params.Character;
      w += col;
      console.log(w);
   }
   console.log(emptyCol);
   for (var i = 0; i < params.Level; i++)
      console.log(line);
   console.log("");
} // Banner

// Help quit without having 'async()' catch our throws
function Exit(s, e) {
   if (e == undefined) e = 0;
   console.error(s);
   Process.exit(e);
}


/*
 * Find an element in the array using case-insensitive comparisons
 */
function FindCaseInsensitive(collection, key) {
   for (var collectionKey in collection) {
      if (collectionKey.toLowerCase() == key.toLowerCase())
         return collection[collectionKey];
   }
   return undefined;
} // FindCaseInsensitive()


/*
 * Printf directly to Console
 */
function Printf() {
   console.log(Sprintf.apply(this, arguments));
}

/*
 * Get cookies from a 'headers' array
 */
function GetCookiesFromHeaders(headers) {
   var func = M + "GetCookiesFromHeaders()";
   console.log(func, "running");
   var cookies = {};
   if (headers == undefined)
      return undefined;
   //console.log(func, "headers", JS(headers));
   for (var header in headers) {
      if (header.toLowerCase() != "set-cookie") continue;
      var values = headers[header]; // set-cookie: [ "cookie1=value1; another=another", "again=something", ...]
      for (var value of values) {
         console.log(func, "header:" + header, "value:" + value);;
         for (var cookie of value.split(";")) {
            var kv = cookie.split("=");
            if (kv == undefined || kv.length != 2)
               continue;
            var cookieName = kv[0].trim();
            var cookieValue = kv[1].trim();
            console.log(func, "   cookie: <" + cookieName + ">=<" + cookieValue + ">");
            cookies[cookieName] = cookieValue;
            break; // the rest of the line contains cookie properties we, for now, ignore
         }
      }
   }
   console.log(func, "returning cookies", JS(cookies));
   return cookies;
} // GetCookiesFromHeaders()

/* 
 * Disassemble and print JWT
 */
function PrintDisassembledJWT(jwt) {
   var func = M + ".PrintDisassembledJWT()";
   var a = jwt.split(".");
   if (a.length <= 0) {
      console.error(func, "Cannot split JWT correctly", jwt);
      return false;
   }
   console.log(func, "a.length", a.length);
   var header, ascii;
   try {
      ascii = new Buffer.from(a[0], 'base64').toString("ascii");
      header = JSON.parse(ascii);
   }
   catch (e) {
      console.error(func, "Could not JSON parse: '" + ascii + "'");
      return false;
   }

   console.log("   header: ", JSON.stringify(header, 3, 3));

   /*
    * We cannot deal with encrypted tokens, such as Cognito Refresh Tokens
    */
   if (header.enc != undefined) {
      console.log(func, "-- encrypted, bailing out");
      return true;
   }

   var payload = JSON.parse(new Buffer.from(a[1], 'base64').toString("ascii"));
   if (payload["custom:data"] != undefined)
      payload["custom:data"] = JSON.parse(payload["custom:data"]);
   payload = InterpretTimestamps(payload);
   console.log("   payload: ", JSON.stringify(payload, 3, 3));

   // var signature = JSON.parse(new Buffer.from(a[2], 'base64').toString("ascii"));
   // console.log("   signature: ", JSON.stringify(signature, 3, 3));
   return true;
} // PrintDisassembledJWT()

/*
 * If possible, convert <timestamp> to a readable Date() so we can debug expiry dates
 */
function InterpretTimestamps(o) {
   if (Array.isArray(o)) {
      var result = [];
      for (var elem of o)
         result.push(InterpretTimestamps(elem));
      return result;
   }
   if (typeof o == "object") {
      result = {};
      for (var x in o)
         result[x] = InterpretTimestamps(o[x])
      return result;
   }
   if (typeof o != "number")
      return o;
   var d = new Date(o * 1000);
   if (d.getFullYear() < 2020 || d.getFullYear() > 2199)
      return o;
   return o + " <" + d.toString() + ">";
}
