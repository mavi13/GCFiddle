// ScriptParser.qunit.js - ...
//
/* globals QUnit */ // ScriptParser

"use strict";

var ScriptParser;

if (typeof require !== "undefined") {
	ScriptParser = require("../../ScriptParser.js"); // eslint-disable-line global-require
}

QUnit.module("ScriptParser", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test

		this.parser = new ScriptParser(
		);
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Load ScriptParser", function (assert) {
	var oParser = this.parser; // eslint-disable-line no-invalid-this

	assert.ok(oParser, "loaded");
});

/*
QUnit.test("Test number", function (assert) {
	var oParser = this.parser; // eslint-disable-line no-invalid-this

	assert.equal(oParser, "loaded");
});
*/

QUnit.module("ScriptParser.lex", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test

		this.parser = new ScriptParser(
		);

		/*
		this.endToken = [
			{
				pos: 11,
				type: "(end)",
				value: 0
			}
		];
		*/
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Whitespace and comments", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mResult = [
			{
				pos: 0,
				type: "(end)",
				value: 0
			}
		],
		sText, oOut;

	sText = "";
	mResult[0].pos = sText.length;
	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, "empty string");

	sText = " \n\n \t \n\n";
	mResult[0].pos = sText.length;
	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, "whitespace");

	sText = "#Comment1";
	mResult[0].pos = sText.length;
	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, "one comment");

	sText = "  # Comment 1\n #Comment2\n  \t#\n\n";
	mResult[0].pos = sText.length;
	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, "two comments with whitespace");

	sText = 1000 / 0;
	mResult[0].pos = 0;
	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, sText);
});

QUnit.test("Operators", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aOperators = "+-*/^%=()[]".split(""),
		mResult = [
			{
				pos: 0,
				type: "+",
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		],
		i, sText, oOut;

	for (i = 0; i < aOperators.length; i += 1) {
		sText = aOperators[i];
		mResult[0].type = sText;
		oOut = oParser.lex(sText);
		assert.deepEqual(oOut, mResult, sText);
	}
});

QUnit.test("Digits and numbers", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aTests = ["0", "00", "0.0", "1234567890.0987654321"], // eslint-disable-line array-element-newline
		mResult = [
			{
				pos: 0,
				type: "number",
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		],
		i, sText, oOut;

	for (i = 0; i < aTests.length; i += 1) {
		sText = aTests[i];
		mResult[0].value = parseFloat(sText);
		mResult[1].pos = sText.length;
		oOut = oParser.lex(sText);
		assert.deepEqual(oOut, mResult, sText);
	}
});

QUnit.test("Infinite long number", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Number is too large or too small",
			pos: 0,
			value: Infinity
		},
		sText = "999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999";

	assert.throws(
		function () { oParser.lex(sText); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; }, // we always check complete error object
		"Error thrown: " + mError.message
	);
});

QUnit.test("String", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aTests = ["", "0", "abc def"], // eslint-disable-line array-element-newline
		mResult = [
			{
				pos: 1,
				type: "string",
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		],
		sSeparator, i, sText, oOut,
		fnPrepareTest = function () {
			sText = aTests[i];
			mResult[0].value = sText;
			sText = sSeparator + sText + sSeparator;
			mResult[1].pos = sText.length;
		};

	sSeparator = '"';
	for (i = 0; i < aTests.length; i += 1) {
		fnPrepareTest();
		/*
		sText = aTests[i];
		mResult[0].value = sText;
		sText = sSeparator + sText + sSeparator;
		mResult[1].pos = sText.length;
		*/
		oOut = oParser.lex(sText);
		assert.deepEqual(oOut, mResult, sText);
	}

	sSeparator = "'";
	for (i = 0; i < aTests.length; i += 1) {
		fnPrepareTest();
		/*
		sText = aTests[i];
		mResult[0].value = sText;
		sText = sSeparator + sText + sSeparator;
		mResult[1].pos = sText.length;
		*/
		oOut = oParser.lex(sText);
		assert.deepEqual(oOut, mResult, sText);
	}
});

QUnit.test("String with escaped newline character", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		sText = '"a\\nb"',
		mResult = [
			{
				pos: 1,
				type: "string",
				value: "a\nb"
			},
			{
				pos: 6,
				type: "(end)",
				value: 0
			}
		],
		oOut;

	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, sText);
});

QUnit.test("Unterminated string", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Unterminated string",
			pos: 1,
			value: "abc"
		},
		sText = '"abc';

	assert.throws(
		function () { oParser.lex(sText); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);

	sText = "'abc";
	assert.throws(
		function () { oParser.lex(sText); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Identifier", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aTests = ["a", "abc_", "$a", "$W1"], // eslint-disable-line array-element-newline
		mResult = [
			{
				pos: 0,
				type: "identifier",
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		],
		i, sText, oOut;

	for (i = 0; i < aTests.length; i += 1) {
		sText = aTests[i];
		mResult[0].value = sText;
		mResult[1].pos = sText.length;
		oOut = oParser.lex(sText);
		assert.deepEqual(oOut, mResult, sText);
	}
});

QUnit.test("Formatter", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aTests = ["", "00", "##.###"], // eslint-disable-line array-element-newline
		mResult = [
			{
				pos: 0,
				type: "formatter",
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		],
		sSeparator, i, sText, oOut;

	sSeparator = ":";
	for (i = 0; i < aTests.length; i += 1) {
		sText = aTests[i];
		mResult[0].value = sText;
		sText = sSeparator + sText + sSeparator;
		mResult[1].pos = sText.length;
		oOut = oParser.lex(sText);
		assert.deepEqual(oOut, mResult, sText);
	}
});

QUnit.test("Unterminated formatter", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Unterminated formatter",
			pos: 1,
			value: "000"
		},
		sText = ":000";

	assert.throws(
		function () { oParser.lex(sText); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Multiple tokens", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mResult = [
			{
				pos: 0,
				type: "identifier",
				value: "abc"
			},
			{
				pos: 4,
				type: "=",
				value: 0
			},
			{
				pos: 6,
				type: "number",
				value: 123
			},
			{
				pos: 9,
				type: "(end)",
				value: 0
			}
		],
		sText = "abc = 123",
		oOut;

	oOut = oParser.lex(sText);
	assert.deepEqual(oOut, mResult, sText);
});

QUnit.test("Unrecognized token", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Unrecognized token",
			pos: 0,
			value: "~"
		},
		sText = "~";

	assert.throws(
		function () { oParser.lex(sText); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});


QUnit.module("ScriptParser.parse", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test

		this.parser = new ScriptParser(
		);
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Empty", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "(end)",
				value: 0
			}
		],
		mResult = [],
		oOut;

	oOut = oParser.parse(aParse);
	assert.deepEqual(oOut, mResult, "empty");
});

QUnit.test("Expression a+b", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		// fnNud = function (a) {},
		// fnNud = (function () { return function (a) {}; }()),
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "a"
			},
			{
				pos: 1,
				type: "+",
				value: 0
			},
			{
				pos: 2,
				type: "identifier",
				value: "b"
			},
			{
				pos: 3,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				left: {
					pos: 0,
					type: "identifier",
					value: "a"
				},
				right: {
					pos: 2,
					type: "identifier",
					value: "b"
				},
				type: "+"
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent object prototypes with properties lbp, led, nud as functions
	assert.deepEqual(oOut, mResult, "a+b");
});

QUnit.test("Expression a+b*c", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "a"
			},
			{
				pos: 1,
				type: "+",
				value: 0
			},
			{
				pos: 2,
				type: "identifier",
				value: "b"
			},
			{
				pos: 3,
				type: "*",
				value: 0
			},
			{
				pos: 4,
				type: "identifier",
				value: "c"
			},
			{
				pos: 5,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				left: {
					pos: 0,
					type: "identifier",
					value: "a"
				},
				right: {
					left: {
						pos: 2,
						type: "identifier",
						value: "b"
					},
					right: {
						pos: 4,
						type: "identifier",
						value: "c"
					},
					type: "*"
				},
				type: "+"
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "a+b*c");
});

QUnit.test("Expression (a+b)*c", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "(",
				value: 0
			},
			{
				pos: 1,
				type: "identifier",
				value: "a"
			},
			{
				pos: 2,
				type: "+",
				value: 0
			},
			{
				pos: 3,
				type: "identifier",
				value: "b"
			},
			{
				pos: 4,
				type: ")",
				value: ""
			},
			{
				pos: 5,
				type: "*",
				value: 0
			},
			{
				pos: 6,
				type: "identifier",
				value: "c"
			},
			{
				pos: 7,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				left: {
					left: {
						pos: 1,
						type: "identifier",
						value: "a"
					},
					right: {
						pos: 3,
						type: "identifier",
						value: "b"
					},
					type: "+"
				},
				right: {
					pos: 6,
					type: "identifier",
					value: "c"
				},
				type: "*"
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "a+b*c");
});

QUnit.test("Prefix: -5", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "-",
				value: 0
			},
			{
				pos: 1,
				type: "number",
				value: 5
			},
			{
				pos: 2,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				// pos: 0,
				type: "-",
				right: {
					pos: 1,
					type: "number",
					value: 5
				}
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "-5");
});

QUnit.test("Assignment a=5", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "a"
			},
			{
				pos: 1,
				type: "=",
				value: 0
			},
			{
				pos: 2,
				type: "number",
				value: 5
			},
			{
				pos: 3,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				pos: 0,
				type: "assign",
				name: "a",
				value: {
					pos: 2,
					type: "number",
					value: 5
				}
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "a=5");
});

QUnit.test("Function call int(3.54)", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "int"
			},
			{
				pos: 3,
				type: "(",
				value: 0
			},
			{
				pos: 4,
				type: "number",
				value: 3.54
			},
			{
				pos: 8,
				type: ")",
				value: ""
			},
			{
				pos: 9,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				pos: 0,
				type: "call",
				name: "int",
				args: [
					{
						pos: 4,
						type: "number",
						value: 3.54
					}
				]
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "int(3.54)");
});

QUnit.test("Function definition: f(x)=5", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "f"
			},
			{
				pos: 1,
				type: "(",
				value: 0
			},
			{
				pos: 2,
				type: "identifier",
				value: "x"
			},
			{
				pos: 3,
				type: ")",
				value: ""
			},
			{
				pos: 4,
				type: "=",
				value: 0
			},
			{
				pos: 5,
				type: "number",
				value: 5
			},
			{
				pos: 6,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				pos: 0,
				type: "function",
				name: "f",
				args: [
					{
						pos: 2,
						type: "identifier",
						value: "x"
					}
				],
				value: {
					pos: 5,
					type: "number",
					value: 5
				}
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "f(x)=5");
});

QUnit.test("Concatenation [1 2]", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "[",
				value: 0
			},
			{
				pos: 1,
				type: "number",
				value: 1
			},
			{
				pos: 3,
				type: "number",
				value: 2
			},
			{
				pos: 4,
				type: "]",
				value: 0
			},
			{
				pos: 5,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				pos: 0,
				type: "call",
				name: "concat",
				args: [
					{
						pos: 1,
						type: "number",
						value: 1

					},
					{
						pos: 3,
						type: "number",
						value: 2
					}
				]
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "[1 2]");
});

QUnit.test("Assignment and function call: a=b()", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "a"
			},
			{
				pos: 1,
				type: "=",
				value: 0
			},
			{
				pos: 2,
				type: "identifier",
				value: "b"
			},
			{
				pos: 3,
				type: "(",
				value: 0
			},
			{
				pos: 4,
				type: ")",
				value: ""
			},
			{
				pos: 5,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				pos: 0,
				type: "assign",
				name: "a",
				value: {
					pos: 2,
					name: "b",
					type: "call",
					args: []
				}
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "a=b()");
});

QUnit.test("Formatter 0.19:#.#:", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "number",
				value: 0.19
			},
			{
				pos: 4,
				type: "formatter",
				value: "#.#"
			},
			{
				pos: 9,
				type: "(end)",
				value: 0
			}
		],
		mResult = [
			{
				pos: 4,
				type: "formatter",
				value: "#.#",
				left: {
					pos: 0,
					type: "number",
					value: 0.19
				}
			}
		],
		oOut;

	oOut = oParser.parse(aParse);
	oOut = JSON.parse(JSON.stringify(oOut)); // remove parent objects with properties lbp, led, nud
	assert.deepEqual(oOut, mResult, "0.19:#.#:");
});

// ...

QUnit.test("Invalid lvalue at", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Invalid lvalue at",
			pos: 1,
			value: "="
		},
		sText = "1=2",
		aParse = [
			{
				pos: 0,
				type: "number",
				value: 1
			},
			{
				pos: 1,
				type: "=",
				value: 0
			},
			{
				pos: 2,
				type: "number",
				value: 2
			},
			{
				pos: 3,
				type: "(end)",
				value: 0
			}
		];

	assert.throws(
		function () { oParser.parse(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; }, // we always check complete error object
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Invalid argument for function: f(5)=", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Invalid argument 1 for function",
			pos: 0,
			value: "f"
		},
		sText = "f(5)=",
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "f"
			},
			{
				pos: 1,
				type: "(",
				value: 0
			},
			{
				pos: 2,
				type: "number",
				value: 5
			},
			{
				pos: 3,
				type: ")",
				value: ""
			},
			{
				pos: 4,
				type: "=",
				value: 0
			},
			{
				pos: 5,
				type: "(end)",
				value: 0
			}
		];

	assert.throws(
		function () { oParser.parse(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; }, // we always check complete error object
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Unexpected end of file: (", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aItems = [
			"(",
			"["
		],
		mError = {
			message: "Unexpected end of file",
			pos: 1,
			value: ""
		},
		aParse = [
			{
				pos: 0,
				type: null, // will be set
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		],
		i, sText;

	for (i = 0; i < aItems.length; i += 1) {
		sText = aItems[i];
		aParse[0].type = sText;
		assert.throws(
			function () { oParser.parse(aParse); },
			function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; }, // we always check complete error object
			"Error thrown for " + sText + ": " + mError.message
		);
	}
});

QUnit.test("Unexpected token", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Unexpected token",
			pos: 0,
			value: ")"
		},
		sText = ")",
		aParse = [
			{
				pos: 0,
				type: ")",
				value: 0
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		];

	assert.throws(
		function () { oParser.parse(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Expected closing parenthesis", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Expected closing parenthesis",
			pos: 1,
			value: ")"
		},
		sText = "(2",
		aParse = [
			{
				pos: 0,
				type: "(",
				value: 0
			},
			{
				pos: 1,
				type: "number",
				value: 2
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		];

	assert.throws(
		function () { oParser.parse(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Expected closing bracket", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Expected closing bracket",
			pos: 1,
			value: "]"
		},
		sText = "[2",
		aParse = [
			{
				pos: 0,
				type: "[",
				value: 0
			},
			{
				pos: 1,
				type: "number",
				value: 2
			},
			{
				pos: 1,
				type: "(end)",
				value: 0
			}
		];

	assert.throws(
		function () { oParser.parse(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Expected closing parenthesis for function", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Expected closing parenthesis for function",
			pos: 1,
			value: ")"
		},
		sText = "f(2",
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "f"
			},
			{
				pos: 1,
				type: "(",
				value: 0
			},
			{
				pos: 2,
				type: "number",
				value: 2
			},
			{
				pos: 3,
				type: "(end)",
				value: 0
			}
		];

	assert.throws(
		function () { oParser.parse(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});


QUnit.module("ScriptParser.evaluate", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test

		this.parser = new ScriptParser(
		);
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Empty", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [],
		sResult = "",
		sOut;

	sOut = oParser.evaluate(aParse);
	assert.equal(sOut, sResult, "empty");
});

QUnit.test("Number: 5", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "number",
				value: 5
			}
		],
		sResult = "5\n",
		sOut;

	sOut = oParser.evaluate(aParse);
	assert.equal(sOut, sResult, "5");
});

QUnit.test("String: '5'", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "string",
				value: "5"
			}
		],
		sResult = "5\n",
		sOut;

	sOut = oParser.evaluate(aParse);
	assert.equal(sOut, sResult, '"5"');
});

QUnit.test("Operators: + - * % / ^", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		iValue1 = 2,
		iValue2 = 5,
		mTests = {
			"+": iValue1 + iValue2,
			"-": iValue1 - iValue2,
			"*": iValue1 * iValue2,
			"%": iValue1 % iValue2,
			"/": iValue1 / iValue2,
			"^": Math.pow(iValue1, iValue2)
		},
		aParse = [
			{
				type: "+",
				left: {
					pos: 0,
					type: "number",
					value: iValue1
				},
				right: {
					pos: 2,
					type: "number",
					value: iValue2
				}
			}
		],
		sTest, sResult, sOut;

	for (sTest in mTests) {
		if (mTests.hasOwnProperty(sTest)) {
			aParse[0].type = sTest;
			sResult = mTests[sTest];
			sOut = oParser.evaluate(aParse);
			assert.equal(sOut, sResult, iValue1 + sTest + iValue2 + "=" + mTests[sTest]);
		}
	}
});

QUnit.test("Operator: - (prefix)", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				type: "-",
				right: {
					pos: 0,
					type: "number",
					value: 5
				}
			}
		],
		sResult = "-5\n",
		sOut;

	sOut = oParser.evaluate(aParse);
	assert.equal(sOut, sResult, "-5");
});

QUnit.test("Multiple operators: (2+4*7-3^2)/3%2", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				type: "%",
				left: {
					type: "/",
					left: {
						type: "-",
						left: {
							type: "+",
							left: {
								type: "number",
								value: 2,
								pos: 1
							},
							right: {
								type: "*",
								left: {
									type: "number",
									value: 4,
									pos: 3
								},
								right: {
									type: "number",
									value: 7,
									pos: 5
								}
							}
						},
						right: {
							type: "^",
							left: {
								type: "number",
								value: 3,
								pos: 7
							},
							right: {
								type: "number",
								value: 2,
								pos: 9
							}
						}
					},
					right: {
						type: "number",
						value: 3,
						pos: 12
					}
				},
				right: {
					type: "number",
					value: 2,
					pos: 14
				}
			}
		],
		sResult = "1\n",
		sOut;

	sOut = oParser.evaluate(aParse);
	assert.equal(sOut, sResult, "(2+4*7-3^2)/3%2=1");
});

QUnit.test("Identifier: a", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "a"
			}
		],
		oVariables = {
			a: 5
		},
		sResult = "5\n",
		sOut;

	sOut = oParser.evaluate(aParse, oVariables);
	assert.equal(sOut, sResult, "a=5");
});

QUnit.test("Variable is undefined: a", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Variable is undefined",
			pos: 0,
			value: "a"
		},
		sText = "a",
		aParse = [
			{
				pos: 0,
				type: "identifier",
				value: "a"
			}
		],
		oVariables = {};

	assert.throws(
		function () { oParser.evaluate(aParse, oVariables); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Assign: a=5", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "assign",
				name: "a",
				value: {
					pos: 2,
					type: "number",
					value: 5
				}
			}
		],
		oVariables = { },
		sResult = "a=5\n",
		oResult = {
			a: 5
		},
		sOut;

	sOut = oParser.evaluate(aParse, oVariables);
	assert.equal(sOut, sResult, "a=5");
	assert.deepEqual(oVariables, oResult, "a: 5");
});

QUnit.test("Assign variable which is set to hold: a=2 a=5", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "assign",
				name: "a",
				value: {
					pos: 2,
					type: "number",
					value: 5
				}
			}
		],
		oVariables = {
			a: 3,
			gcfOriginal: {
				a: 2
			}
		},
		sResult = "a=3\n",
		oResult = {
			a: 3,
			gcfOriginal: {
				a: 2
			}
		},
		sOut;

	sOut = oParser.evaluate(aParse, oVariables);
	assert.equal(sOut, sResult, "a=2");
	assert.deepEqual(oVariables, oResult, "a: 2");
});

QUnit.test("Call function: floor(3.54)", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 0,
				type: "call",
				name: "floor",
				args: [
					{
						pos: 6,
						type: "number",
						value: 3.54
					}
				]
			}
		],
		oVariables = { },
		oFunctions = {
			floor: Math.floor
		},
		sResult = "3\n",
		sOut;

	sOut = oParser.evaluate(aParse, oVariables, oFunctions);
	assert.equal(sOut, sResult, "floor(3.54)=3");
});

QUnit.test("Function is undefined: f()", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mError = {
			message: "Function is undefined",
			pos: 0,
			value: "f"
		},
		sText = "f()",
		aParse = [
			{
				pos: 0,
				type: "call",
				name: "f",
				args: []
			}
		];

	assert.throws(
		function () { oParser.evaluate(aParse); },
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
		"Error thrown for " + sText + ": " + mError.message
	);
});

QUnit.test("Define function: f()=5 f()", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				type: "function",
				name: "f",
				args: [],
				value: {
					type: "number",
					value: 5,
					pos: 4
				},
				pos: 0
			},
			{
				type: "call",
				args: [],
				name: "f",
				pos: 6
			}
		],
		oVariables = { },
		oFunctions = { },
		sResult = "5\n",
		sOut;

	sOut = oParser.evaluate(aParse, oVariables, oFunctions);
	assert.equal(sOut, sResult, "f()=5: f()=5");
});

QUnit.test("Formatter 0.19:#.#:", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		aParse = [
			{
				pos: 4,
				type: "formatter",
				value: "#.#",
				left: {
					pos: 0,
					type: "number",
					value: 0.19
				}
			}
		],
		oVariables = { },
		oFunctions = {
			zformat: function (s, length) {
				var i;

				s = String(s);
				for (i = s.length; i < length; i += 1) {
					s = "0" + s;
				}
				return s;
			},
			nformat: function (s, format) {
				var aFormat = format.split(".", 2);

				s = Number(s).toFixed(aFormat[1].length);
				return oFunctions.zformat(s, format.length);
			}
		},
		sResult = "0.2\n",
		sOut;

	sOut = oParser.evaluate(aParse, oVariables, oFunctions);
	assert.equal(sOut, sResult, "0.19:#.#:=0.2");
});


QUnit.module("ScriptParser.calculate", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test

		this.parser = new ScriptParser(
		);
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Empty", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		sInput = "",
		oResult = {
			text: ""
		},
		sOut;

	sOut = oParser.calculate(sInput);
	assert.deepEqual(sOut, oResult, "empty");
});

QUnit.test("Calculations", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mTests = {
			5: 5, // Number
			'"5"': "5", // String

			"5+3.14": 8.14, // Number+Number=Number
			'"5"+3.14': 8.14, // String+Number=Number
			'"5"+"3.14"': 8.14, // #String+String=Number

			"[5]": "5",
			'["5" "3.14"]': "53.14", // String String=String
			'["5" 3.14]': "53.14", // String Number=String
			"[5 3.14]": "53.14", // Number Number=String
			'[3.14 "15" 92 65]': "3.14159265",

			"concat()": "",
			"concat(5)": "5",
			'concat("5", "3.14")': "53.14", // String String=String
			'concat("5", 3.14)': "53.14", // String Number=String
			"concat(5, 3.14)": "53.14", // Number Number=String
			'concat(3.14, "15", 92, 65)': "3.14159265",

			"abs(3.14)": 3.14,
			"abs(-3.14)": 3.14,

			"round(3.14)": 3,
			"round(3.54)": 4,
			"round(-3.14)": -3,
			"round(-3.54)": -4,

			"ceil(3.14)": 4,
			"ceil(3.54)": 4,
			"ceil(-3.14)": -3,
			"ceil(-3.54)": -3,

			"floor(3.14)": 3,
			"floor(3.54)": 3,
			"floor(-3.14)": -4,
			"floor(-3.54)": -4,

			"int(3.14)": 3,
			"int(3.54)": 3,
			"int(-3.14)": -3,
			"int(-3.54)": -3,

			"mod(25,7)": 4,
			"mod(-13,64)": -13,

			"log(8)/log(2)": 3,

			"exp(0)": 1,
			"floor(exp(1)*10000)": 2.7182 * 10000,

			"sqrt(9)": 3,

			"min(3.14,4)": 3.14,

			"max(3.14,4)": 4,

			"gcd(1071,1029)": 21,

			"fib(50)": 12586269025,

			"ct(1234567890)": 45,
			'ct("1234567890")': 45,
			'ct("R9z876gh5432%.*^/+-10")': 45,

			'cti("1234567890")': 9,
			'ct(ct("1234567890"))': 9,
			'cti("R9z876gh5432%.*^/+-10")': 9,

			'val("a")': 1,
			'val("Z")': 26,
			'val("abcdefghijklmnopqrstuvw xyz")': 351,
			'val("äöüß")': 0,
			"val(1234567)": 0,
			'val("1234567")': 0,

			'sval("ABCDEFGZz")': "01 02 03 04 05 06 07 26 26",
			'sval("ABCabcxyzxyZäöü")': "01 02 03 01 02 03 24 25 26 24 25 26",

			'vstr("01")': "a",
			'vstr("26")': "z",
			"vstr(1)": "a",
			"vstr(27)": "a",
			'vstr("01 02")': "ab",
			'vstr("01,02")': "ab",
			'vstr("01 02 03 24 25 26")': "abcxyz",
			'vstr("01 02 03 24 25 26",1)': "bcdyza",
			'vstr("00 01 02 03 24 25 26 27",1)': "abcdyzab",
			'vstr(sval("chiffre"))': "chiffre",

			'encode("ABBA17abba","AB7","OS2")': "OSSO12abba",
			'val(encode(lc("ÄÖüß"),"äöüß","{|}~"))': 0,

			'instr("abc","a")': 1,
			'instr("abc","d")': 0,
			'instr("abcABCabc","ab")': 1,
			'instr("abcABCabc","BC")': 5,
			'instr("abcABCabc","ab", 3)': 7, // optional start index

			'len("")': 0,
			'len("abcABCabc")': 9,
			"len(5)": 1,

			'countstr("str1,str2,str3,str4",",")': 3,
			'countstr("str1,str2,str3,str4","str")': 4,

			'count("str1,str2,str3,str4",",")': 3,
			'count("str1,str2,str3,st","str")': "s=4 t=4 r=3",

			'mid("abcABCabc",3,5)': "cABCa",

			'uc("abcäöüABC")': "ABCÄÖÜABC",

			'lc("ABCÄÖÜßabc")': "abcäöüßabc",

			'replace("abcABCabc","bc","Xy")': "aXyABCaXy",

			'reverse("abcZ")': "Zcba",

			'rot13("abcdefghijklmnopqrstuvexyzABC")': "nopqrstuvwxyzabcdefghirklmNOP",

			"0:000:": "000",
			"8.2:000.0:": "008.2",
			"8.2:000.000:": "008.200",

			"zformat(0,3)": "000",
			"zformat(8.2,5)": "008.2",

			"isEqual(1,1)": "true",
			"isEqual(1,2)": "false",

			"ic()": "false",
			"ic(1)": "",

			'getConst("PI")': 3.141592653589793,
			'getConst("E")': 2.718281828459045,

			"10^309": "Infinity",
			"10^310": Math.pow(10, 309), // both Infinity

			"assert(1+4,5)": "",

			'parse("3+4 cls() 5")': "5\n" // Why additional \n?
		},
		sTest, oResult, sOut;

	for (sTest in mTests) {
		if (mTests.hasOwnProperty(sTest)) {
			oResult = {
				text: mTests[sTest]
			};
			if (oResult.text !== "") {
				oResult.text += "\n";
			}
			sOut = oParser.calculate(sTest);
			assert.deepEqual(sOut, oResult, sTest + "=" + mTests[sTest]);
		}
	}
});

QUnit.test("Calculations: Trigonometry", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mTests = {
			"d2r(1)*180": Math.PI,
			"1/r2d(1)*180": Math.PI,
			"r2d(d2r(90))": 90,
			"int(d2r(90)*10000+0.5)/10000": 1.5708,

			"sin(90)": 1,
			"sin(60)": Math.sqrt(3) / 2,
			"int(sin(30)*10000+0.5)/10000": 1 / 2,
			"int(sin(45)*10000+0.5)/10000": Math.floor(1 / Math.sqrt(2) * 10000 + 0.5) / 10000,
			"sin(r2d(d2r(90)))": 1,

			"cos(0)": 1,
			"int(cos(45)*10000+0.5)/10000": Math.floor(1 / Math.sqrt(2) * 10000 + 0.5) / 10000,
			"int(cos(60)*10000+0.5)/10000": 1 / 2,

			"int(tan(30)*10000+0.5)/10000": Math.floor(1 / Math.sqrt(3) * 10000 + 0.5) / 10000,
			"int(tan(45)*10000+0.5)/10000": 1,
			"int(tan(60)*10000+0.5)/10000": Math.floor(Math.sqrt(3) * 10000 + 0.5) / 10000,

			"int(asin(sin(45))*10000+0.5)/10000": 45,
			"sin(asin(d2r(45)))": 45 * Math.PI / 180,

			"acos(cos(45))": 45,
			"int(cos(acos(d2r(45)))*10000+0.5)/10000": Math.floor(45 * Math.PI / 180 * 10000 + 0.5) / 10000,

			"atan(1)": 45,
			"int(atan(tan(45))*10000+0.5)/10000": 45
		},
		sTest, oResult, sOut;

	for (sTest in mTests) {
		if (mTests.hasOwnProperty(sTest)) {
			oResult = {
				text: mTests[sTest]
			};
			if (oResult.text !== "") {
				oResult.text += "\n";
			}
			sOut = oParser.calculate(sTest);
			assert.deepEqual(sOut, oResult, sTest + "=" + mTests[sTest]);
		}
	}
});

QUnit.test("Calculations: Waypoints", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		w0 = "N 49° 16.130 E 008° 40.453",
		w1 = "N 49° 15.903 E 008° 40.777",
		w2 = "N 49° 16.182 E 008° 40.830",
		wm1 = "N 49° 16.017 E 008° 40.615",
		wm2 = "N 49° 16' 02.58\" E 008° 40' 48.18\"",
		wm3 = "N 49.26927° E 008.67735°",
		mTests = {
			"int(bearing($W0,$W1))": 137,
			"int(bearing($W1,$W0))": 317,
			"int(bearing($W0,$W2))": 78,
			"int(bearing($W2,$W0))": 258,
			"int(bearing($W1,$W2))": 7,
			"int(bearing($W2,$W1))": 187,

			"cb($W0,78,$W1,7)": w2,
			"cb($W0,137,$W2,187)": w1,
			"cb($W1,317,$W2,258)": w0,

			"distance($W0,$W0)": 0,
			"int(distance($W0,$W1)+0.5)": 575,
			"int(distance($W1,$W0)+0.5)": 575,
			"int(distance($W0,$W2)+0.5)": 466,
			"int(distance($W1,$W2))": 521,

			"project($W0,137,575)": w1,
			"project($W0,78,466)": w2,
			"project($W1,317,575)": w0,
			"project($W1,7,521)": w2,

			"midpoint($W0,$W1)": wm1,
			"project($W0,bearing($W0,$W1),distance($W0,$W1)/2)": wm1,

			'format($W0,"dmm")': w0,
			'format($W0,"dms")': "N 49° 16' 07.80\" E 008° 40' 27.18\"",
			'format($W0,"dd")': "N 49.26883° E 008.67422°",
			'format("N49°16.130E008°40.453","dmm")': w0,
			'format("N 49.26883 E 8.67422","dmm")': w0, // convert dd to dmm
			'format(midpoint($W1,$W2),"dms")': wm2,
			'format($WM2,"dmm")': "N 49° 16.043 E 008° 40.803",
			'format($WM2,"dd")': "N 49.26738° E 008.68005°",
			"project($W1,bearing($W1,$WM2)+0.1,distance($W1,$WM2)*1.994)": w2, // (with fragile corrections)

			'format(midpoint($W2,$W0),"dd")': wm3,
			'format($WM3,"dmm")': "N 49° 16.156 E 008° 40.641",
			'format($WM3,"dms")': "N 49° 16' 09.37\" E 008° 40' 38.46\""
		},
		sTest, oVar, oResult, sOut;

	for (sTest in mTests) {
		if (mTests.hasOwnProperty(sTest)) {
			oResult = {
				text: mTests[sTest]
			};
			if (oResult.text !== "") {
				oResult.text += "\n";
			}
			oVar = {
				$W0: w0,
				$W1: w1,
				$W2: w2,
				$WM1: wm1,
				$WM2: wm2,
				$WM3: wm3
			};
			sOut = oParser.calculate(sTest, oVar);
			assert.deepEqual(sOut, oResult, sTest + "=" + mTests[sTest]);
		}
	}
});

QUnit.test("Calculations: User defined functions", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mTests = {
			"f()=3.14 f()": 3.14,
			"f(x)=3.14*x f(2)": 6.28,
			"f(x)=floor(x) f(3.14)": 3,
			"f(x)=floor(x) f(3.14) f(3.99)": "3\n3",
			"f(x,y)=x*y f(2,3)": 6, // function with two parameters
			"f(x,y)=x*y f2(i)=f(i,i*i)*i f2(2)": 16, // function calling newly defined function
			"myMod(x,n)=((x%n)+n)%n myMod(-13, 64)": 51 // https://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
		},
		sTest, oResult, sOut;

	for (sTest in mTests) {
		if (mTests.hasOwnProperty(sTest)) {
			oResult = {
				text: mTests[sTest]
			};
			if (oResult.text !== "") {
				oResult.text += "\n";
			}
			sOut = oParser.calculate(sTest);
			assert.deepEqual(sOut, oResult, sTest + "=" + mTests[sTest]);
		}
	}
});

QUnit.test("Calculations: Exceptions", function (assert) {
	var oParser = this.parser, // eslint-disable-line no-invalid-this
		mTests = {
			'parse("?")': "Unrecognized token: '?' (pos 0-1)",
			'parse("/")': "Unexpected token: '/' (pos 0-1)",
			'parse("a")': "Variable is undefined: 'a' (pos 0-1)",
			'parse("a=")': "Unexpected end of file: '' (pos 2-2)",
			'parse("a=b")': "Variable is undefined: 'b' (pos 2-3)",
			'parse("1=1")': "Invalid lvalue at: '=' (pos 1-2)",
			'parse("1+5-28=")': "Invalid lvalue at: '=' (pos 6-7)",
			'parse("1*a=")': "Invalid lvalue at: '=' (pos 3-4)",
			'parse("2^ f(9,u)+8 * 9=")': "Invalid lvalue at: '=' (pos 15-16)",
			'parse("f(5*10)=")': "Invalid argument 1 for function: 'f' (pos 0-1)",
			'parse("f(b,5*10)=")': "Invalid argument 2 for function: 'f' (pos 0-1)",
			'parse("f()")': "Function is undefined: 'f' (pos 0-1)",
			'parse("(a")': "Expected closing parenthesis: ')' (pos 1-2)",
			'parse("f(1")': "Expected closing parenthesis for function: ')' (pos 1-2)",
			'parse("format(\\"N 49° 16.130 E 008° 40.453\\",\\"x1\\")")': "Unknown format: 'x1' (pos 0-2)",
			'parse("getConst(\\"FOO\\")")': "Unknown constant: 'FOO' (pos 0-3)",
			'parse("assert(1,2)")': "Assertion failed: '1 != 2': 'assert' (pos 0-6)",
			'parse("cls(1)")': "Wrong number of arguments for function: 'cls' (pos 0-3)",
			'parse("len()")': "Wrong number of arguments for function: 'len' (pos 0-3)"
		},
		sTest, oResult, sOut;

	for (sTest in mTests) {
		if (mTests.hasOwnProperty(sTest)) {
			oResult = {
				text: mTests[sTest]
			};
			if (oResult.text !== "") {
				oResult.text += "\n";
			}
			sOut = oParser.calculate(sTest);
			assert.deepEqual(sOut, oResult, sTest + "=" + mTests[sTest]);
		}
	}
});
// end
