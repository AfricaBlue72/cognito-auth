#!/usr/bin/env node

/* Module: TestScenarios.js
 * Description:   run entire scenarios (multiple JSON files)
 */

/*
 * Boilerplate
 */
'use strict';
const path = require('path');
const M = path.basename(__filename);

/*
 * External libraries
 */
const Process = require('process');
const FS = require('fs');
const Async = require("async");

/*
 * Internal libraries
 */
const Calliope = require("./Calliope");
const Utility = require("./Utility");
const Project = require("./Project");

/*
 * Enable modules from subfolders to easily require() stuff from this folder:
 */
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

const ActionsFolder = './Actions/';

/*
 * Build the Actions[] with individual, external actions
 */
function AddAction(destination, path) {
   var func = M + ".AddAction()";
   console.log(func, "path", path);
   const obj = require(path);
   for (var action in obj) {
      Utility.Printf("%s: adding %s -> %s", func, path, action);
      destination[action] = obj[action];
   }
}

/*
 * Globals
 */
var Globals = {
   Actions: [],
   Statistics: {},
   TestData: {},
   Config: {}
};

/*
 * Test results stored in a way that is compatible with Calliope.Send()
 */
var Results = {
   OS: "Linux",
   Platform: "AWS",
   Build: "TestSuite.js v3",
   TestSuites: "Integration_Tests", // cicd/integration-tests
   TestSuite: [],
};

// Test just one suite FILE
function TestSuite(path, callback) {
   var func = M + ".TestSuite()";
   console.log(func, "path", path);
   console.log("");

   let rawdata = FS.readFileSync(path);
   var testcases = JSON.parse(rawdata);
   console.log(func, "parsed JSON ok");

   /* The object to hold the Calliope-compatible results */
   var testSuite = {
      Name: path,
      TestCase: [],
      Step: 0
   };
   /*
    * Clear state
    */
   Globals.State = {};

   var failures = 0;
   Utility.Banner({ TestSuite: path, Character: "+", Level: 2 });
   /* Loop through all testcases within one suite */
   Async.eachSeries(
      // collection
      testcases,
      // iteratee
      function(testCase, next) {

         testSuite.Step++;
         var space = "";
         if (testSuite.Step < 100) {
            space = " ";
         }
         if (testSuite.Step < 10) {
            space = "  ";
         }
         testCase.Name = "Step " + space + testSuite.Step + ". " + testCase.Name;

         Utility.Banner({ TestSuite: path, TestCase: testCase.Name, Status: "Starting...", Character: "+", Level: 1 });

         var result = {
            Name: testCase.Name,
         };
         if (testCase.Stop == true) {
            Utility.Exit("Stopping", failures);
         }


         if (testCase.Enabled == false) {
            result.Skipped = true;
            testSuite.TestCase.push(result);
            Utility.Banner({ TestSuite: path, TestCase: testCase.Name, Status: "disabled", Character: "/", Level: 1 });
            return next();
         }

         if (testCase.Disabled == true) {
            result.Skipped = true;
            testSuite.TestCase.push(result);
            Utility.Banner({ TestSuite: path, TestCase: testCase.Name, Status: "disabled", Character: "/", Level: 1 });
            return next();
         }

         if (testCase.Action == undefined) {
            var error = M + ": 'Action' not found in " + JSON.stringify(testCase);
            Utility.Exit(error, -1);
         }

         var action = Utility.FindCaseInsensitive(Globals.Actions, testCase.Action);
         if (action == undefined) {
            var error = Utility.Sprintf("%s: Unsupported action '%s' in %j", func, testCase.Action, testCase);
            Utility.Exit(error, -1);
         }

         Globals.Statistics.Actions[testCase.Action.toLowerCase()]++;

         var actionParams = {
            Globals: Globals,
            Options: testCase,
         };

         action(actionParams, function(err, data) {

            if (testCase.Errors == undefined) {
               testCase.Errors = 0;
            }

            if (data == undefined) {
               data = {};
            }

            if (data.Errors == undefined) {
               data.Errors = [];
            }

            if (err) {
               var msg = "action() gave a real error: " + JSON.stringify(err);
               console.error(msg);
               data.Errors.push(msg);
            }

            var actualErrors = data.Errors.length;
            var expectedErrors = testCase.Errors;
            // Utility.Printf("%s: test %s: errors: expected='%s' actual='%s'",
            //    func, testCase.Name, expectedErrors, actualErrors);

            // Convert to number, if possible
            if (typeof expectedErrors == "string" && !isNaN(expectedErrors))
               expectedErrors = parseInt(expectedErrors, 10);
            var failed = true;
            if (typeof expectedErrors == "string") {
               var understood = false;
               if (expectedErrors.startsWith(">=")) {
                  understood = true;
                  var e = parseInt(expectedErrors.slice(2), 10);
                  if (actualErrors >= e)
                     failed = false;
                  else
                     failed = true;
               }
               if (expectedErrors.startsWith(">=") == false && expectedErrors.startsWith(">")) {
                  understood = true;
                  var e = parseInt(expectedErrors.slice(1), 10);
                  if (actualErrors > e)
                     failed = false;
                  else
                     failed = true;
               }
               if (expectedErrors.startsWith("<=")) {
                  understood = true;
                  var e = parseInt(expectedErrors.slice(2), 10);
                  if (actualErrors <= e)
                     failed = false;
                  else
                     failed = true;
               }
               if (expectedErrors.startsWith("<=") == false && expectedErrors.startsWith("<")) {
                  understood = true;
                  var e = parseInt(expectedErrors.slice(1), 10);
                  if (actualErrors < e)
                     failed = false;
                  else
                     failed = true;
               }
               if (!understood) {
                  var error = Utility.Sprintf("%s: test '%s': ERROR cannot parse expected errors '%s'", func, testCase.Name, expectedErrors);
                  console.log(error);
                  data.Errors.push(error);
                  failed = true;
               }
            }
            if (typeof expectedErrors == "number") {
               if (expectedErrors == actualErrors)
                  failed = false;
               else
                  failed = true;
            }
            var failureMessage = "?";
            if (!failed) {
               Utility.Printf("%s: test '%s' OK, got '%s' error(s) and expected '%s'", func, testCase.Name, actualErrors, expectedErrors);
               Utility.Banner({ TestSuite: path, TestCase: testCase.Name, Result: "Passed", Character: "-", Level: 1 });
            }
            else {
               Utility.Printf("%s: test '%s' FAILED, got '%s' error(s) but expected '%s'", func, testCase.Name, actualErrors, expectedErrors);
               Utility.Printf("%s: test '%s': the errors: %j", func, testCase.Name, data.Errors);
               Utility.Banner({ TestSuite: path, TestCase: testCase.Name, Result: "FAILED", Character: "#", Level: 1 });
               if (Globals.Config.Mortal == true) {
                  console.log("died on error (by request)");
                  process.exit(1);
               }
               result.Failure = Utility.JS(data);
               failures++;
            }
            testSuite.TestCase.push(result);
            //testSuite.Step++;
            next();
         });
      },
      // done function
      function() {
         if (failures == 0) {
            Utility.Banner({ TestSuite: path, Character: "-", Result: "Passed", Level: 2 });
         }
         else {
            Utility.Banner({ TestSuite: path, Character: "#", Result: "FAILED", Failures: failures, Level: 2 });
         }
         console.log(M, "done");
         Results.TestSuite.push(testSuite);
         callback();
      }
   ); // Async.eachSeries()
} // TestSuite

function Main(argv) {
   var func = M + ".Main()";
   console.log(func, "argv", argv);
   console.log("");
   var config = {
      ReportToCalliope: false,
      Mortal: false,
      ReportMissing: true,
   };
   var failures = 0;
   Async.series(
      [
         function(next) {
            console.log("reading directory");
            FS.readdir(ActionsFolder, (err, files) => {
               if (err) {
                  return Utility.Exit(err, -1);
               }
               files.forEach(file => {
                  if (file.endsWith(".js")) {
                     console.log(file);
                     AddAction(Globals.Actions, ActionsFolder + file);
                  }
               });
               next();
            });
         }, // Initialize Actions object
         // Init statistics
         function(next) {
            Globals.Statistics.Actions = {};
            for (var action in Globals.Actions)
               Globals.Statistics.Actions[action.toLowerCase()] = 0;
            next();
         },
         // Process arguments
         function(next) {
            Process.argv.splice(0, 2);
            if (Process.argv[0] == "--calliope" || Process.argv[0] == "-c") {
               config.ReportToCalliope = true;
               config.ReportMissing = false;
               Process.argv.splice(0, 1);
            }
            if (Process.argv[0] == "--report" || Process.argv[0] == "-r") {
               config.ReportMissing = true;
               Process.argv.splice(0, 1);
            }
            if (Process.argv[0] == "--silent" || Process.argv[0] == "-s") {
               config.ReportToCalliope = false;
               config.ReportMissing = false;
               Process.argv.splice(0, 1);
            }
            if (Process.argv[0] == "--die_on_error") {
               config.ReportToCalliope = false;
               config.ReportMissing = false;
               Globals.Config.Mortal = true;
               Process.argv.splice(0, 1);
            }
            if (Process.argv[0] == "--help") {
               console.log();
               console.log("use --calliope  . . to sent data out to calliope. (default: false)");
               console.log("    --report  . . . report unused actions. (default: true)");
               console.log("    --silent  . . . do NOT sent data out and do NOT report.");
               console.log("    --die_on_error  makes the testSuite terminate at the first error encounted. (implicit --silent)");
               console.log("    --help  . . . . shows this text and exits.");
               console.log();
               Process.exit(0);
            }

            next();
         },
         // Initialize Actions object
         function(next) {
            Globals.Statistics.Actions["initialize"] = 1;
            Globals.Actions.Initialize({ Globals: Globals, Options: {} }, function(err, data) {
               if (err)
                  return Utility.Exit(err, -1);
               next();
            });
         },
         // Dump config
         function(next) {
            console.log(func, "Working with config:", config);
            next();
         },
         // Initialize Calliope
         function(next) {
            if (config.ReportToCalliope == false)
               return next();
            Calliope.Initialize({}, function(err, data) {
               if (err)
                  return Utility.Exit(err, -1);
               next();
            });
         },
         function(next) {
            Utility.Banner({ Action: "Start", Character: "+", Level: 3 });
            next();
         },
         function(next) {
            // process the arguments of this program as paths to suites
            Async.eachSeries(
               // collection
               argv,
               // iteratee
               TestSuite,
               // done function
               next
            );
         },
         // Print overall results
         function(next) {
            console.log("");
            console.log("OVERALL RESULTS FOR:", Results.TestSuites);
            console.log("");
            for (var testSuite of Results.TestSuite) {
               console.log("TestSuite:", testSuite.Name);
               for (var testCase of testSuite.TestCase) {
                  if (testCase.Failure) {
                     console.log("  *FAIL*  ", testCase.Name, testCase.Failure);
                     failures++;
                  }
                  else if (testCase.Skipped) {
                     console.log("  /skip/  ", testCase.Name);
                  }
                  else {
                     console.log("  --OK--  ", testCase.Name);
                  }
               }
               console.log("");
            }
            next();
         },
         // Print statistics and add to Results
         function(next) {
            var coverageTestSuite = {
               Name: "TEST COVERAGE",
               TestCase: []
            };
            if (config.ReportMissing != false) {
               console.log("");
               console.log("Test Actions used in testcases:");
               for (var action in Globals.Statistics.Actions) {
                  var n = Globals.Statistics.Actions[action];
                  if (n == 0) continue;
                  console.log("       " + action + "(" + n + ")");
                  var text = action + " (" + n + "x)";
                  coverageTestSuite.TestCase.push({ Name: text });
               }
               console.log("");
               var header = "WARNING: TEST ACTIONS NEVER USED ANYWHERE:";
               for (var action in Globals.Statistics.Actions) {
                  var n = Globals.Statistics.Actions[action];
                  if (n > 0) continue;
                  if (header) {
                     console.log(header);
                     header = undefined;
                  }
                  console.log("*****  " + action);
                  coverageTestSuite.TestCase.push({ Name: action, Failure: "NEVER USED" });
               }
               console.log("");
               Results.TestSuite.push(coverageTestSuite);
            }
            next();
         },
         function(next) {
            if (failures == 0) {
               Utility.Banner({ Action: "STARTING", Result: "Passed", Character: "-", Level: 1 });
            }
            else {
               Utility.Banner({ Action: "DONE", Result: "FAILED", Character: "#", Level: 1 });
            }
            next();
         },
         function(next) {
            if (config.ReportToCalliope == false) {
               return next();
            }
            Calliope.Send({ Results: Results }, function(error, data) {
               if (error) {
                  failures++;
                  Utility.Banner({ Action: "CALLIOPE", Result: "FAILED", Character: "#", Level: 1 });
                  return next();
               }
               else {
                  Utility.Banner({ Action: "CALLIOPE", Result: "Passed", Character: "-", Level: 1 });
                  return next();
               }
            });
         },
         function(next) {
            console.log(M, "Done, failures", failures);
            Utility.Exit(Utility.Sprintf("failures: %d", failures), failures);
         }
      ]
   );
} // Main()

Main(Process.argv);
