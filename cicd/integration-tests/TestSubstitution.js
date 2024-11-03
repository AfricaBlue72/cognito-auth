#!/bin/env node

/*
 *  
 */

var Utility = require("./Utility.js");

function JS(o) { return JSON.stringify(o, 3, 3); }

var meta = {
    NAME: "Piet Heijn",
    COOKIES: {
        TOKEN: "abc"
    },
    Answer: {
       Key: {
        Key: "The Key"
       }
    }
};

var input = {
    "Name": "${NAME}",
    "Fields": ["1", "2", "3"],
    "Token": "${COOKIES.TOKEN}",
    "Key": "${Answer.Key.Key}"
};

console.log("meta", JS(meta));
console.log("input", JS(input));
var output = Utility.Substitute(input, meta);
console.log("output", JS(output));
