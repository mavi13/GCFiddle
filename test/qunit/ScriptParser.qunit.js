// ScriptParser.qunit.js - ...
//
/* globals QUnit, ScriptParser */

"use strict";

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
		function (err) { return err.message === mError.message && err.pos === mError.pos && err.value === mError.value; },
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
// end
