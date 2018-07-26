// Preprocessor.qunit.js - ...
//
/* globals QUnit, Preprocessor */

"use strict";

QUnit.module("Preprocessor", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test
		var oScriptParser = {
			calculate: function () {
				return {
					text: ""
					// and optional error: ...
				};
			}
		};

		this.pre = new Preprocessor({
			scriptParser: oScriptParser
		});
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Load Preprocessor", function (assert) {
	var oPre = this.pre; // eslint-disable-line no-invalid-this

	assert.ok(oPre, "loaded");
});

QUnit.test("return comment lines unmodified", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sOut = "";

	sOut = oPre.processText("");
	assert.equal(sOut.script, "", "empty string");

	sOut = oPre.processText("#comment\n#comment\n");
	assert.equal(sOut.script, "#comment\n#comment\n", "commented lines are kept");
});

QUnit.test("prefix text lines with dash comment", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sOut = "";

	sOut = oPre.processText("a line");
	assert.equal(sOut.script, "#a line\n", "one line");

	sOut = oPre.processText("line 1\nline2");
	assert.equal(sOut.script, "#line 1\n#line2\n", "two lines");

	sOut = oPre.processText("line 1\n#comment1\nline2");
	assert.equal(sOut.script, "#line 1\n#comment1\n#line2\n", "three mixed lines");
});

QUnit.test("find variables", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sOut = "";

	sOut = oPre.processText("a=12");
	assert.equal(sOut.script, "#a=12\na=12 #\n", "variable equals number");

	sOut = oPre.processText("text1 a=0 text2");
	assert.equal(sOut.script, "#text1 a=0 text2\na=0 # text2\n", "variable equals number in text");

	sOut = oPre.processText("text1 a  =   0 text2");
	assert.equal(sOut.script, "#text1 a  =   0 text2\na=0 # text2\n", "variable equals number with spaces");

	//sOut = oPre.processText("text1 c=a+b d=a*b text2");
	//assert.equal(sOut.script, "#text1 c=a+b d=a*b text2\na=0 # text2\n", "multiple variables in one line (TODO)");

	sOut = oPre.processText("text1 x=a+26325 text2");
	assert.equal(sOut.script, "#text1 x=a+26325 text2\nx=0 #a+26325 text2\n", "variable eqals expression");

	sOut = oPre.processText("text1 x = a + b + c + d + 26325 text2");
	assert.equal(sOut.script, "#text1 x = a + b + c + d + 26325 text2\nx=0 #a + b + c + d + 26325 text2\n", "variable eqals expression with spaces"); //TODO
});

QUnit.test("find waypoints", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sOut = "";

	sOut = oPre.processText("N 49° 18.123 E 008° 42.456");
	assert.equal(sOut.script, "#N 49° 18.123 E 008° 42.456\n$W1=\"N 49° 18.123 E 008° 42.456\"\n", "one waypoint");

	sOut = oPre.processText("N 49° 18.123 E 008° 42.456 N 49° 18.789 E 008° 42.987");
	assert.equal(sOut.script, "#N 49° 18.123 E 008° 42.456\n$W1=\"N 49° 18.123 E 008° 42.456\"\n#N 49° 18.789 E 008° 42.987\n$W2=\"N 49° 18.789 E 008° 42.987\"\n", "two waypoint in one line");
});



// end
