/*
 * XML - the standalone version, no 'Logger' objects
 */

const Module = "XML";

/*
 * External libraries
 */
var js2xmlparser = require("js2xmlparser");
var xml2js = require('xml2js');

/*
 * Exports
 */
var XML = exports;

/*
 * json2xml: just a wrapper around any XML library that may be used.
 * Note: the parser doesn't insert XMLNS
 */
XML.json2xml = function(name, json, xmlns) {
	var func = Module + ".json2xml()";
	console.log(func, "Entering, json=", json);

	var result = js2xmlparser.parse(name, json);
	if (xmlns != undefined && xmlns != "") {
		console.log(func, "inserting xmlns", xmlns);
		result = result.replace(name, name + ' xmlns="' + xmlns + '"');
	}
	return result;
} // XML.json2xml()

XML.xml2json = function(xml, callback) {
	var func = Module + ".xml2json()";
	console.log(func, "Entering, xml=", xml);
	xml2js.parseString(xml, function(err, result) {
		if (err) {
			console.error(func, "xml2js.parseString() failed", err);
			return callback(err, undefined);
		}
		else {
			//console.error(func, "xml2js.parseString() ok, result is", JSON.stringify(result, 3, 3));
			console.error(func, "xml2js.parseString() ok");
			return callback(undefined, result);
		}
	});
} // XML.xml2json()

/*
 * Generic helper to turn:
 *     aap: [ "noot" ]
 * into:
 *     aap: "noot"
 * and remove the "nsNNN:" prefixes.
 */
XML.FlattenXMLResult = function(input) {
	var output = {};
	if (typeof input == "string") {
		if (input.match(/^ns\d+:/))
			input = input.substring(input.indexOf(":") + 1);
		return input;
	}
	if (typeof input != "object")
		return input;
	for (var key in input) {
		var value = input[key];
		if (Array.isArray(value) && value.length == 1)
			value = value[0];
		key = XML.FlattenXMLResult(key);
		output[key] = XML.FlattenXMLResult(value);
	}
	return output;
} // XML.FlattenXMLResult()
