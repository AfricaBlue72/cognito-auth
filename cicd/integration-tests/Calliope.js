// Module: Calliope.js
// Description:   Utilityity functions for Calliope

/*
 * Boilerplate
 */
'use strict';
const path = require('path');
const M = path.basename(__filename);

/*
 * External libraries
 */
const Async = require("async");
const QS = require("querystring");
const Request = require('request');
const XMLBuilder = require("xmlbuilder");

/*
 * Internal libraries
 */
const Utility = require('./Utility');
const Project = require('./Project');


/*
 * We hold some global data
 */
var Globals = {
    ParameterPrefix: Project.Name + '/Test/'
};



/*
 * Export our functions
 */
exports.Initialize = Initialize;
exports.Send = Send;

function Initialize(params, callback) {
    var func = M + ".Initialize()";
    console.log(func, "params", params);

    console.log(func, "Running Globals.Parameters()...");
    Utility.SSMGetParameters({ Prefix: Globals.ParameterPrefix }, function(err, data) {
        if (err) {
            return callback(err, undefined);
        }
        Globals.Parameters = data;
        console.log(func, "done");
        return callback(undefined, data);
    });
} // Initialize()

var TESTBODY = '<?xml version="1.0" encoding="UTF-8"?> <testsuites name = "Integration Tests" ><testsuite name="Standalone"><testcase name="Create" status="false"><failure type="NotEnoughFoo"> details about failure </failure></testcase></testsuite></testsuites>';

function Send(params, callback) {
    var func = M + ".Send()";
    console.log(func, "Running, params=", params);
    /*
     * 1st check params
     */
    var err = Utility.VerifyParameters(func, params, "params", "Results");
    // console.log("err!!", err);
    if (err) return callback(err, undefined);
    var results = params.Results;

    /*
     * 2nd check SSM parameters
     */
    var err = Utility.VerifyParameters(func, Globals.Parameters, "Globals.Parameters", "Calliope/API", "Calliope/APIKey", "Calliope/ProfileId");
    if (err) return callback(err, undefined);

    console.log(func, "running, ProfileId=" + Globals.Parameters["Calliope/ProfileId"]);

    // Build URL
    var url = Globals.Parameters["Calliope/API"] + "/profile/" + Globals.Parameters["Calliope/ProfileId"] + "/import/junit";
    var urlParameters = {};

    if (results.OS) urlParameters.os = results.OS;
    if (results.Platform) urlParameters.platform = results.Platform;
    if (results.Build) urlParameters.build = results.Build;
    if (results.Envelope) urlParameters.envelope = results.Envelope;
    console.log(func, "urlParameters", urlParameters);
    if (Object.keys(urlParameters).length > 0)
        url += "?" + QS.stringify(urlParameters);

    // Build XML to POST
    var XMLObject = {};

    // EXAMPLE OBJECT
    // XMLObject = {
    //     testsuites: {
    //         '@name': "TESTSUITES",
    //         testsuite: [{
    //                 '@name': "TESTSUITE1",
    //                 testcase: [{
    //                         '@name': "testsuite1-testcase1",
    //                         failure: "This is a test don't worry",
    //                     },
    //                     {
    //                         '@name': "testsuite1-testcase2",
    //                     },
    //                 ]
    //             },
    //             {
    //                 '@name': "TESTSUITE2",
    //                 testcase: [{
    //                         '@name': "testsuite2-testcase1",
    //                     },
    //                     {
    //                         '@name': "testsuite2-testcase2",
    //                     },
    //                 ]
    //             }
    //         ]
    //     }
    // };

    XMLObject.testsuites = {
        '@name': results.TestSuites,
        testsuite: [],
    };
    for (var testSuite of results.TestSuite) {
        var xmlTestsuite = {
            '@name': testSuite.Name,
            testcase: [],
        };
        for (var testCase of testSuite.TestCase) {
            var xmlTestcase = {
                '@name': testCase.Name,
                // "system-out": "System out?",
                // "system-err": "System err?", // seems ignored
            };
            if (testCase.Failure != undefined)
                xmlTestcase.failure = testCase.Failure;
            xmlTestsuite.testcase.push(xmlTestcase);
        }
        XMLObject.testsuites.testsuite.push(xmlTestsuite);
    };

    //console.log(func, "XMLObject", XMLObject);
    var XMLString = '<?xml version="1.0" encoding="UTF-8" ?>' + XMLBuilder.create(XMLObject).toString();
    //console.log(func, "XMLString", XMLString);

    // Build Request options
    var options = {
        url: url,
        method: "POST",
        headers: {
            "x-api-key": Globals.Parameters["Calliope/APIKey"],
            'content-type': 'application/xml'
        },
        body: XMLString,
    };
    console.log(func, "options", options);
    Request.post(options, function(error, response, body) {
        console.log(func, "error", error);
        if (error) {
            return callback(error, undefined);
        }
        //console.log(func, "POSTed, response=", response);
        console.log(func, "POSTed ok");
        return callback(undefined, body);
    })
}
