#!/usr/bin/env node

'use strict'

console.log("cfdeploy v1.1.2");

/*
 * Usage: CFGo.js <stackname> <stackfile> 
 */
var Path = require('path');
var PROGRAM = Path.basename(process.argv[1], ".js");
var FS = require("fs");
var Async = require("async");
var AWS = require("aws-sdk");
var sprintf = require('sprintf-js').sprintf;
var crypto = require('crypto');
var fs = require('fs');
var uuencode = require('uuencode');
var Helper = require("./Helper");

function printf() {
    console.log.apply(this, arguments);
}

// Global
var Globals = {
    Preview: false,
    Force: false,
    Debug: false,
    Delete: false,
    Region: "eu-west-1",
    WaitForCompletion: true,
    Parameters: [],
};

/*
 * Statuses that make us wait. Map 'STATUS' for 'waitfor' code:
 */
var CloudformationWaitStates = {
    "REVIEW_IN_PROGRESS"   : 'stackCreateComplete',
    "CREATE_IN_PROGRESS"   : 'stackCreateComplete',
    "ROLLBACK_IN_PROGRESS" : 'stackCreateComplete',
    
    "UPDATE_IN_PROGRESS"                          : 'stackUpdateComplete',
    "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS"         : 'stackUpdateComplete',
    "UPDATE_ROLLBACK_IN_PROGRESS"                 : 'stackUpdateComplete',
    "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS": 'stackUpdateComplete'
};

/*
 * --region overwrites Globals.Region *AND* calls AWS.config.update()
 */
AWS.config.update({ region: Globals.Region, maxRetries: 1024 });
var CAPABILITIES = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"];


function CreateStack(params, callback) {
    var id = sprintf("%s.%s: stack '%s'", PROGRAM, "CreateStack()", params.StackName);
    var createParams = {
        StackName: params.StackName,
        Capabilities: CAPABILITIES,
        TemplateBody: "*body*",
        Parameters: Globals.Parameters,
    };
    printf("%s: createParams: %O", id, createParams);
    if (Globals.Preview) {
        printf("%s: Just previewing, will not actually create the stack", id);
        return callback({ Result: "None since preview" });
    }
    createParams.TemplateBody = params.Body;
    var cloudformation = new AWS.CloudFormation();
    cloudformation.createStack(createParams, function(err, data) {
        createParams.TemplateBody = "*body*"; // prevent too much output in error handlers
        if (err)
            return Helper.Fail({ Id: id, Api: "cloudformation.createStack()", Params: createParams, Err: err }, callback);
        if (Globals.WaitForCompletion == false || params.WaitForCompletion == false) {
            printf("%s: Not waiting for stack creation to complete", id);
            return callback(undefined, { Message: "Started stack creation" });
        }
        var waitParams = { StackName: params.StackName };
        printf("%s: About to invoke cloudformation.waitFor('stackCreateComplete') with waitParams: %O", id, waitParams);
        cloudformation.waitFor('stackCreateComplete', waitParams, function(err, data) {
            if (err)
                return Helper.Fail({ Id: id, Api: "cloudformation.waitFor()", Params: createParams, Err: err }, callback);
            data = data.Stacks[0].StackName;
            printf("%s: cloudformation.waitFor() OK, returning data: %O", id, data);
            return callback(undefined, { Message: "Created stack" });
        });
    })
} // CreateStack()

function UpdateStack(params, callback) {
    var id = sprintf("%s.%s: stack '%s'", PROGRAM, "UpdateStack()", params.StackName);
    var updateParams = {
        StackName: params.StackName,
        Capabilities: CAPABILITIES,
        TemplateBody: "*body*",
        Parameters: Globals.Parameters,
    };
    printf("%s: updateParams: %O", id, updateParams);
    updateParams.TemplateBody = params.Body;
    var cloudformation = new AWS.CloudFormation();

    if (Globals.Preview) {
        printf("%s: Just previewing; will not actually update the stack", id);
        return callback(undefined, { Result: "None since preview" });
    }

    cloudformation.updateStack(updateParams, function(err, data) {
        if (err) {
            if (err.message == "No updates are to be performed.") {
                printf("%s: updateStack(): OK ('No updates are to be performed')", id);
                return callback(undefined, { Message: "No changes to stack" });
            }
            else
                return Helper.Fail({ Id: id, Api: "cloudformation.updateStack()", Params: updateParams, Err: err }, callback);
        }
        if (Globals.WaitForCompletion == false || params.WaitForCompletion == false) {
            printf("%s: Not waiting for stack update to complete", id);
            return callback(undefined, { Message: "Started stack update" });
        }
        var waitParams = { StackName: params.StackName };
        printf("%s: About to invoke cloudformation.waitFor('stackUpdateComplete') with waitParams: %O", id, waitParams);
        cloudformation.waitFor('stackUpdateComplete', waitParams, function(err, data) {
            if (err)
                return Helper.Fail({ Id: id, Api: "cloudformation.waitFor('stackUpdateComplete')", Params: waitParams, Err: err }, callback);
            data = data.Stacks[0].StackName;
            printf("%s: waitFor() OK, returning data: %O", id, data);
            return callback(undefined, { Message: "Updated stack" });
        });
    });
} // UpdateStack()

function DeleteStack(params, callback) {
    console.log("XYZ");
    var id = sprintf("%s.%s: stack '%s'", PROGRAM, "DeleteStack()", params.StackName);
    printf("%s: params: %O", id, params);
    var deleteParams = {
        StackName: params.StackName,
    };
    printf("%s: About to invoke cloudformation.deleteStack() with deleteParams: %O", id, deleteParams);
    if (Globals.Preview) {
        printf("%s: Just previewing; will not actually delete the stack", id);
        return callback(undefined, { Message: "Stack not deleted since preview" });
    }

    // return callback({ Message: "REFUSING TO DELETE STACKS" }, undefined);
    var cloudformation = new AWS.CloudFormation();
    cloudformation.deleteStack(deleteParams, function(err, data) {
        if (err)
            return Helper.Fail({ Id: id, Api: "cloudformation.deleteStack()", Params: deleteParams }, callback);
        printf("%s: deleteStack() OK, returned data %O", id, data);
        if (Globals.WaitForCompletion == false || params.WaitForCompletion == false) {
            printf("%s: Not waiting for stack deletion to complete", id);
            return callback(undefined, { Message: "Started stack deletion" });
        }
        var waitParams = deleteParams;
        printf("%s: About to invoke cloudformation.waitFor('stackDeleteComplete') with waitParams: %O", id, waitParams);
        cloudformation.waitFor('stackDeleteComplete', waitParams, function(err, data) {
            if (err)
                return Helper.Fail({ Id: id, Api: "cloudformation.waitFor('stackDeleteComplete')", Params: waitParams, Err: err }, callback);
            printf("%s: waitFor() OK, returning data: %O", id, data);
            return callback(undefined, { Message: "Deleted stack" });
        });
    })
} // DeleteStack()

function ProcessStack(params, callback) {
    var id = sprintf("%s.%s: stack '%s'", PROGRAM, "ProcessStack()", params.StackName);
    printf("%s: params: %O", id, params);
    printf("%s: Reading newBody from path '%s'", id, params.Path);
    var newBody = FS.readFileSync(params.Path).toString();
    printf("%s: newBody.length: %d", id, newBody.length);
    var cloudformation = new AWS.CloudFormation();

    // step by step
    var currentBody = undefined;
    var currentStatus = undefined;
    var message = "Unknown";

    Async.series([
        // First, retrieve current status
        function(next) {
            var describeParams = {
                StackName: params.StackName,
            };
            printf("%s: About to invoke cloudformation.describeStacks() with describeParams: %O", id, describeParams);
            cloudformation.describeStacks(describeParams, function(err, data) {
                if (err) {
                    // console.log(func, "err", err);
                    printf("%s: Could not retrieve stack", id);
                    if (params.Delete == true) {
                        printf("%s: The stack is not found so nothing to delete", id);
                        return callback(undefined, { Id: id, Message: "Nothing to delete" });
                    }
                    else {
                        printf("%s: About to invoke CreateStack()", id);
                        return CreateStack({ StackName: params.StackName, Body: newBody }, callback);
                    }
                }
                // hack as long as we have /usr/bin/node version 6 in Cloud9
                for (var stackId in data.Stacks) {
                    var stack = data.Stacks[stackId];
                    if (stack.StackName == params.StackName) {
                        currentStatus = stack.StackStatus;
                        printf("%s: cloudformation.describeStacks(): found status: '%s'", id, currentStatus);
                        return next();
                    }
                }
                // Node version 8 code
                // for (var stack of data.Stacks) {
                //     if (stack.StackName == params.StackName) {
                //         currentStatus = stack.StackStatus;
                //         printf("%s: cloudformation.describeStacks(): found status: '%s'", id, currentStatus);
                //         return next();
                //     }
                // }
                // This should never happen. Describe is OK but our stack is not in the results??
                return Helper.Fail({ Id: id, Message: "Could not retrieve stack status" }, callback);
            });
        },
        // If the stack is still CREATING, wait for the result
        function(next) {
            var waitFor = CloudformationWaitStates[currentStatus];
            if(waitFor==undefined)
            {
                printf("%s: status '%s' will not make us wait; continuing.", id, currentStatus);
                return next();
            }
            printf("%s: status '%s' forces us to wait for '%s'", id, currentStatus, waitFor);
            var waitParams = {
                StackName: params.StackName,
            };
            cloudformation.waitFor(waitFor, waitParams, function(err, data) {
                if (err)
                    return Helper.Fail({ Id: id, Api: "cloudformation.waitFor()", Params: waitParams, Err: err }, callback);
                printf("%s: currentStatus '%s': waitFor('%s') OK", id, currentStatus, waitFor);
                // synthetic status
                currentStatus="succesfully-waited-for-"+waitFor;
                return next();
           });
        },
        // Maybe we have to delete the stack first
        function(next) {
            if (currentStatus != "ROLLBACK_COMPLETE") 
            {
                printf("%s: Will continue with the stack since we assume the status '%s' allows it", id, currentStatus);
                return next();
            }
            printf("%s: About to invoke DeleteStack() since the stack is in ROLLBACK_COMPLETE", id);
            if (Globals.Preview) {
                printf("%s: Just previewing; will not actually delete the stack", id);
                message = "Not actually deleted";
                return next();
            }
            // There is a race condition?
            DeleteStack({ StackName: params.StackName, WaitForCompletion: true }, function(error, data) {
                if (error) return callback(error, undefined);
                message = "Deleted";
                printf("%s: Deleted stack, about to invoke CreateStack()", id);
                return CreateStack({ StackName: params.StackName, Body: newBody }, callback);
            })
        },
        // Stack is present so if Delete==true, we know what to do
        function(next) {
            if (params.Delete != true)
                return next();
            var deleteParams = {
                StackName: params.StackName,
            };
            printf("%s: About to invoke DeleteStack() with %O", id, deleteParams);
            DeleteStack(deleteParams, function(error, data) {
                if (error)
                    return callback(error, undefined);
                printf("%s: Deleted stack OK", id);
                return callback(undefined, { Message: "Delete ok", Id: id });
            });
            return; // stop executing any more steps
        },
        // Stack is present so we need to retrieve the currentBody to consider updating it
        function(next) {
            var getParams = {
                StackName: params.StackName,
                TemplateStage: "Original",
            };
            printf("%s: About to invoke cloudformation.getTemplate() with params: %O", id, getParams);
            cloudformation.getTemplate(getParams, function(err, data) {
                if (err)
                    return Helper.Fail({ Id: id, Api: "cloudformation.getTemplate()", Params: getParams, Err: err }, callback);
                currentBody = data.TemplateBody.toString();
                printf("%s: currentBody.length: %d", id, currentBody.length);
                next();
            });
        },
        // Compare currentBody with newBody; maybe updating is not necessary
        function(next) {
            printf("%s: Comparing currentBody and newBody...", id);
            if (currentBody == newBody) {
                printf("%s: currentBody is equal to newBody", id);
                if (Globals.Force) {
                    printf("%s: forcing update", id);
                }
                else {
                    printf("%s: bodies are the same, will compare parameters", id);
                    return next();
                }
            }
            else
                printf("%s: currentBody and newBody are different", id);
            if (Globals.Preview) {
                printf("%s: Just previewing; will not actually update the stack", id);
                return callback(undefined, { Message: "Preview" });
            }
            printf("%s: About to invoke UpdateStack() because body changed...", id);
            return UpdateStack({ StackName: params.StackName, Body: newBody }, callback);
        },
        // Maybe the parameters changed?
        function(next)
        {
            printf("%s: Comparing parameters...", id);
            var getParams = {
                StackName: params.StackName,
            };
            cloudformation.getTemplateSummary(getParams, function(err, data) {
              if (err) return Helper.Fail({ Id: id, Api: "cloudformation.getTemplateSummary()", Params: getParams, Err: err }, callback);
              // Now, compare the parameters 
              var changes=0;
              for(var newParameter of Globals.Parameters)
              {
                  for(var currentParameter of data.Parameters)
                  {
                      if(currentParameter.ParameterKey==newParameter.ParameterKey && currentParameter.ParameterValue!=newParameter.ParameterValue)
                      {
                         changes++;
                         printf("%s: parameter changed: %s: '%s' -> '%s'", id, currentParameter.ParameterKey, currentParameter.ParameterValue,newParameter.ParameterValue);
                      }
                  }
              }
              printf("%s: parameters changed: #%d", id, changes);
              if(changes==0)
              {
                  printf("%s: No changes in parameters too", id);
                 return callback(undefined, { Message: "No changes in parameters too" });
              }
              if (Globals.Preview) {
                printf("%s: Just previewing; will not actually update the stack", id);
                return callback(undefined, { Message: "Preview" });
              }
              printf("%s: About to invoke UpdateStack() because %d parameter(s) changed...", id, changes);
              return UpdateStack({ StackName: params.StackName, Body: newBody }, callback);
            });
        }
    ]);
} // ProcessStack()

/*
 * Update the Lambda code
 */
function UpdateLambdaCode(params, callback) {
    var id = sprintf("%s.%s: stack '%s'", PROGRAM, "UpdateLambdaCode()", params.StackName);
    printf("%s: params: %O", id, params);
    var lambda = new AWS.Lambda();
    var configuration = undefined;
    var localSHA = undefined;
    var localCode = "";
    var message = "Unknown";
    Async.series([
        // Get the existing configuration first
        function(next) {
            var getParams = {
                FunctionName: params.StackName,
            };
            printf("%s: About to invoke lambda.getFunction() with getParams: %O", id, getParams);
            lambda.getFunction(getParams, function(err, data) {
                if (err)
                    return Helper.Fail({ Id: id, Api: "lambda.getFunction()", Params: getParams, Err: err }, callback);
                configuration = data.Configuration;
                printf("%s: getFunction: FunctionName:'%s'", id, configuration.FunctionName);
                printf("%s: configuration.CodeSha256: '%s'", id, configuration.CodeSha256);
                printf("%s: configuration.CodeSize:   %d", id, configuration.CodeSize);
                // printf("%s: Code: %O", id, data.Code);
                next();
            });
        },
        // Get the SHA256 from the 'local' zip
        function(next) {
            var shasum = crypto.createHash('sha256');
            var buffers = [];
            fs.createReadStream(params.LambdaZip)
                .on("data", function(chunk) {
                    shasum.update(chunk);
                    buffers.push(chunk);
                })
                .on("end", function() {
                    localCode = Buffer.concat(buffers);
                    localSHA = shasum.digest('base64');
                    printf("%s: localSHA: '%s'", id, localSHA);
                    printf("%s: localCode has length %d", id, localCode.length);
                    next();
                });
        },
        // Compare and act 
        function(next) {
            if (configuration.CodeSha256 == localSHA) {
                printf("%s: Code has not changed (sha256 codes are equal)", id);
                if (Globals.Force)
                    printf("%s: Forcing update", id);
                else {
                    message = "Nothing to update";
                    return next();
                }
            }
            var updateParams = {
                FunctionName: params.StackName,
                ZipFile: "<zip here>",
            };
            printf("%s: About to invoke lambda.updateFunctionCode() with params %O", id, updateParams);
            if (Globals.Preview) {
                printf("%s: Just previewing; will not really update function code", id);
                return next();
            }
            updateParams.ZipFile = localCode; // uuencode.encode(lambdaCode); // new Buffer???
            lambda.updateFunctionCode(updateParams, function(err, data) {
                if (err)
                    return Helper.Fail({ Id: id, Api: "lambda.updateFunctionCode()", Params: updateParams, Err: err }, callback);
                printf("%s: updateFunctionCode() OK, data: %O", id, data);
                if (data.CodeSha256 != localSHA) {
                    printf("%s: ERROR, returned unexpected CodeSha256: '%s'", id, data.CodeSha256);
                    return callback({ Error: "Unexpected result when update function code" }, undefined);
                }
                message = "Updated";
                next();
            }); // UpdateFunctionCode()
        },
        // Done
        function(next) {
            printf("%s: OK, done", id);
            callback(undefined, { Message: message });
        }
    ])
} // UpdateLambdaCode()

function DeployPath(params, callback) {
    var id = sprintf("%s.%s", PROGRAM, "DeployPath()");
    printf("%s: params: %O", id, params);
    var path = params.Path;
    if (path.endsWith(".yaml")) {
        printf("%s: Found 'yaml' extension, will process stack with template from '%s'", id, path);
        var stackParams = {
            StackName: path.slice(0, -5),
            Path: path,
            Delete: Globals.Delete,
        }
        ProcessStack(stackParams, function(error, data) {
            if (error) return callback(error, undefined);
            printf("%s: stackName '%s': result: %O", id, stackParams.StackName, data);
            return callback(undefined, data);
        });
        return;
    }
    if (path.endsWith(".zip")) {
        printf("%s: Found 'zip' extension; will update Lambda with zip '%s'", id, path);
        var lambdaParams = {
            StackName: path.slice(0, -4),
            LambdaZip: path,
        }
        printf("%s: About to invoke UpdateLambdaCode() with lambdaParams %O", id, lambdaParams);
        UpdateLambdaCode(lambdaParams, function(error, data) {
            if (error) return callback(error, undefined);
            printf("%s: stackName '%s': data: %O", id, lambdaParams.StackName, data);
            return callback(undefined, data);
        });
        return;
    }
    // Ignore .js
    if (path.endsWith(".js"))
        return callback(undefined, { Id: id, Message: "Ignoring path", Path: path });
    return Helper.Fail({ Id: id, Message: "Do not understand extension in path", Path: path }, callback);
} // DeployPath()

function Main(argv, callback) {
    // if (argv.length < 2)
    //     throw "Missing arguments";

    var id = sprintf("%s.%s", PROGRAM, "Main()");

    printf("%s: argv: %s", id, JSON.stringify(argv));

    /*
     * Consolidate errors
     */
    var errors = [];

    /*
     * First, parse arguments (into Globals.NNN) and build paths[]
     */
    var paths = [];
    var i = 0;
    while (i < argv.length) {
        var arg = argv[i];
        var param = argv[i + 1];
        switch (arg) {
            case "--preview":
                Globals.Preview = true;
                printf("%s: Enabled preview", id);
                i++;
                break;
            case "--debug":
                Globals.Debug = true;
                printf("%s: Enabled debug", id);
                i++;
                break;
            case "--force":
                Globals.Force = true;
                printf("%s: Enabled force", id);
                i++;
                break;
            case "--delete":
                Globals.Delete = true;
                printf("%s: Enabled delete", id);
                i++;
                break;
            case "--wait":
            case "--wait-for-completion":
                Globals.WaitForCompletion = true;
                printf("%s: Enabled wait-for-completion", id);
                i++;
                break;
            case "--nowait":
            case "--no-wait":
            case "--no-wait-for-completion":
                Globals.WaitForCompletion = false;
                printf("%s: Disabled wait-for-completion", id);
                i++;
                break;
            case "--role":
                if (param == undefined) throw "Missing argument to " + arg;
                Globals.Role = param;
                i += 2;
                break;
            case "--external-id":
                if (param == undefined) throw "Missing argument to " + arg;
                Globals.ExternalId = param;
                i += 2;
                break;
            case "--account-id":
            case "--account-ids":
                if (param == undefined) throw "Missing argument to " + arg;
                Globals.AccountIds = param.split(",");
                i += 2;
                break;
            case "--region":
                if (param == undefined) throw "Missing argument to " + arg;
                Globals.Region = param;
                AWS.config.update({ region: Globals.Region });
                i += 2;
                break;
            case "--parameter":
                if (param == undefined) throw "Missing argument to " + arg;
                var kv = param.split("=");
                if(kv.length!=2) throw "Cannot split 'key=value' with " + arg;
                Globals.Parameters.push(
                    {
                        ParameterKey: kv[0],
                        ParameterValue: kv[1]
                    }
                );
                i += 2;
                break;
            default:
                paths.push(arg);
                i++;
        } // switch(arg);
    };
    printf("%s: Globals: %O", id, Globals);

    /*
     * Now, process paths[] one by one
     */
    Async.eachOfSeries(
        // collection
        paths,
        // iteratee
        function(path, key, next) {
            if (Globals.AccountIds != undefined) {
                if (Globals.Role == undefined)
                    Globals.Role = "AWSCloudFormationStackSetExecutionRole";
                Async.eachOfSeries(
                    // Collection
                    Globals.AccountIds,
                    // Iteratee
                    function(accountId, key, next) {
                        var assumeParams = {
                            RoleArn: sprintf("arn:aws:iam::%s:role/%s", accountId, Globals.Role),
                            ExternalId: Globals.ExternalId,
                            RoleSessionName: Globals.Role,
                        };
                        printf("%s: About to invoke Helper.AssumeRole() with params %O", id, assumeParams);
                        Helper.AssumeRole(assumeParams, function(error, data) {
                            if (error) {
                                errors.push(sprintf("Error assuming role %s", assumeParams.RoleArn));
                                return next(); // do not deploy if assumeRole failed!
                            }
                            printf("%s: Helper.AssumeRole(): OK, data %O", id, data);
                            DeployPath({ Path: path }, function(error, data) {
                                if (error) {
                                    errors.push(sprintf("Error deploying path %s after assumeRole to %s", path, assumeParams.RoleArn));
                                }
                                next();
                            });
                        });
                    },
                    // Callback
                    function() {
                        return next();
                    }
                );
            }
            else {
                DeployPath({ Path: path }, function(error, data) {
                    if (error)
                        errors.push(sprintf("Error deploying path %s", path));
                    next();
                });
            }
        },
        // callback
        function() {
            if (errors.length == 0)
                return callback(undefined, { Message: "No errors" });
            printf("%s: SUMMARY OF ERRORS", id);
            for (var errorId in errors) {
                var error = errors[errorId];
                printf("%s: %O", id, error);
            }
            return callback(errors, undefined);
        }
    ); // async.eachOfSeries over paths[]
} // Main()

Main(process.argv.splice(2), function(error, data) {
    if (error)
        process.exit(-1);
    else
        process.exit(0);
});
