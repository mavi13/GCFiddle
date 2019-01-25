// Preprocessor.qunit.js - ...
//
/* globals QUnit */ // ,Preprocessor

"use strict";

var Preprocessor;

if (typeof require !== "undefined") {
	Preprocessor = require("../Preprocessor.js"); // eslint-disable-line global-require
}

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
		oOut;

	oOut = oPre.processText("");
	assert.equal(oOut.script, "", "empty string");

	oOut = oPre.processText("#comment\n#comment\n");
	assert.equal(oOut.script, "#comment\n#comment\n", "commented lines are kept");
});

QUnit.test("prefix text lines with hash comment", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		oOut;

	oOut = oPre.processText("a line");
	assert.equal(oOut.script, "#a line\n", "one line");

	oOut = oPre.processText("line 1\nline2");
	assert.equal(oOut.script, "#line 1\n#line2\n", "two lines");

	oOut = oPre.processText("line 1\n#comment1\nline2");
	assert.equal(oOut.script, "#line 1\n#comment1\n#line2\n", "three mixed lines");
});

QUnit.test("find variables", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		oOut;

	oOut = oPre.processText("a=");
	assert.equal(oOut.script, "#a=\na=0\n", "variable equals nothing");

	oOut = oPre.processText("a=12");
	assert.equal(oOut.script, "#a=12\na=12\n", "variable equals number");

	oOut = oPre.processText("a=b");
	assert.equal(oOut.script, "#a=b\na=0\n", "variable equals variable: use 0");

	oOut = oPre.processText("a=1+2*3-4/5+b-c d e f");
	assert.equal(oOut.script, "#a=1+2*3-4/5+b-c d e f\na=1+2*3-4/5+b-c\n", "variable equals expression with variables");

	oOut = oPre.processText("a=12 \u2013 4"); // \u2013 is a dash which looks line a minus
	assert.equal(oOut.script, "#a=12 - 4\na=12 - 4\n", "during preprocessing, dash is replaced by minus everywhere");

	oOut = oPre.processText("text1 a=0 text2");
	assert.equal(oOut.script, "#text1 a=0 text2\na=0\n", "variable equals number between text");

	oOut = oPre.processText("text1 a  =   0 text2  text3");
	assert.equal(oOut.script, "#text1 a  =   0 text2  text3\na=0\n", "variable equals number with spaces");

	oOut = oPre.processText("c=a+b d=a*b");
	assert.equal(oOut.script, "#c=a+b\nc=a+b\n#d=a*b\nd=a*b\n", "multiple variables in one line");

	oOut = oPre.processText("text1 c=a+b text2 d=a*b text3");
	assert.equal(oOut.script, "#text1 c=a+b text2\nc=a+b\n#d=a*b text3\nd=a*b\n", "multiple variables in one line between text");

	oOut = oPre.processText("text1 x=a+26325 text2");
	assert.equal(oOut.script, "#text1 x=a+26325 text2\nx=a+26325\n", "variable eqals expression");

	oOut = oPre.processText("text1 x = a + b + c + d + 26325 text2 text3");
	assert.equal(oOut.script, "#text1 x = a + b + c + d + 26325 text2 text3\nx=a + b + c + d + 26325\n", "variable eqals expression with spaces");

	oOut = oPre.processText("text1 text2 = text3 * text4 + text5 text6");
	assert.equal(oOut.script, "#text1 text2 = text3 * text4 + text5 text6\ntext2=text3 * text4 + text5\n", "variable eqals expression; long variables");
});

QUnit.test("find waypoints", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		oOut;

	oOut = oPre.processText("N 49° 18.123 E 008° 42.456");
	assert.equal(oOut.script, "#N 49° 18.123 E 008° 42.456\n$W1=\"N 49° 18.123 E 008° 42.456\"\n", "one waypoint");

	oOut = oPre.processText("N49°18.123E008°42.456");
	assert.equal(oOut.script, "#N49°18.123E008°42.456\n$W1=\"N 49° 18.123 E 008° 42.456\"\n", "one waypoint, less spaces");

	oOut = oPre.processText("N 49° 18.123 E 008° 42.456 N 49° 18.789 E 008° 42.987");
	assert.equal(oOut.script, "#N 49° 18.123 E 008° 42.456\n$W1=\"N 49° 18.123 E 008° 42.456\"\n#N 49° 18.789 E 008° 42.987\n$W2=\"N 49° 18.789 E 008° 42.987\"\n", "two waypoints in one line");

	oOut = oPre.processText("N 49° 18.123\nE 008° 42.456");
	assert.equal(oOut.script, "#N 49° 18.123\n#E 008° 42.456\n$W1=\"N 49° 18.123 E 008° 42.456\"\n", "multi line waypoint");

	oOut = oPre.processText("N 49° 18.a E 008° 42.b");
	assert.equal(oOut.script, "#N 49° 18.a E 008° 42.b\n$W1=[\"N 49° 18.\" a \" E 008° 42.\" b]\n", "waypoint with varibles");

	oOut = oPre.processText("N 49° 18.1a7 E 008° 42.05b");
	assert.equal(oOut.script, "#N 49° 18.1a7 E 008° 42.05b\n$W1=[\"N 49° 18.1\" a7 \" E 008° 42.05\" b]\n", "waypoint with number and variable"); //TODO: do not know if a7 or a "7"

	oOut = oPre.processText("N 49° 18+a.a+b E 008° 42+a.a*b");
	assert.equal(oOut.script, "#N 49° 18+a.a+b E 008° 42+a.a*b\n$W1=[\"N 49° \" 18+a \".\" a+b \" E 008° \" 42+a \".\" a*b]\n", "waypoint with simple expression");

	oOut = oPre.processText("N 49° (A-1)(B).(4*A)(B)(A) E 008° (2*A)(5).(A/2)(3*A)(3*A)");
	assert.equal(oOut.script, "#N 49° (A-1)(B).(4*A)(B)(A) E 008° (2*A)(5).(A/2)(3*A)(3*A)\n$W1=[\"N 49° \" (A-1)(B) \".\" (4*A)(B)(A) \" E 008° \" (2*A)(5) \".\" (A/2)(3*A)(3*A)]\n", "waypoint with variables in parenthesis");

	oOut = oPre.processText("N (49) ° (A+1)(B) . (4*A)(B)(A) E (8) ° (2*A)(5) . (A/2)(3*A)(3*A)");
	assert.equal(oOut.script, "#N (49) ° (A+1)(B) . (4*A)(B)(A) E (8) ° (2*A)(5) . (A/2)(3*A)(3*A)\n$W1=[\"N \" (49) \"° \" (A+1)(B) \".\" (4*A)(B)(A) \" E \" (8) \"° \" (2*A)(5) \".\" (A/2)(3*A)(3*A)]\n", "waypoint with variables in parenthesis, with some spaces");

	oOut = oPre.processText("(N 49° 18.123 E 008° 42.456)");
	assert.equal(oOut.script, "#(N 49° 18.123 E 008° 42.456)\n$W1=\"N 49° 18.123 E 008° 42.456\"\n", "waypoint in parenthesis");

	oOut = oPre.processText("N 49° 1B.940 E 008° 30.04[A+1]");
	assert.equal(oOut.script, "#N 49° 1B.940 E 008° 30.04[A+1]\n$W1=[\"N 49° 1\" B \".940 E 008° 30.\" 04[A+1]]\n", "waypoint with expression containing brackets in parenthesis"); //TODO: 0 before 4 is ignored during execution
});


QUnit.test("Parameters from section: Skip to Content", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "Skip to Content\nThis cache has been archived.\nThis cache is temporarily unavailable.\nYour profile photo myname 1,234 Finds\nGCPREP2 ▼\nMulti-cache\nPreprocessed Test 2\nA cache by GcFiddle\nMessage this owner\nHidden : 07/23/2018\nDifficulty:\n  1.5 out of 5\nTerrain:\n  3.5 out of 5\nSize: Size: regular (regular)\n13 Favorites\nThis is a Premium Member Only cache.\nN 49° 18.071 E 008° 42.167", // Firefox text style
		sText2 = "Skip to Content\nThis cache has been archived.\nThis cache is temporarily unavailable.\nYour profile photo\nmyname\n1,234 Finds\nGCPREP2 ▼\n\nMulti-cache\nPreprocessed Test 2\nA cache by GcFiddle Message this owner Hidden : 07/23/2018\nDifficulty:  1.5 out of 5\nTerrain:  3.5 out of 5\nSize: Size: regular (regular)\n13 Favorites\nThis is a Premium Member Only cache.\nN 49° 18.071 E 008° 42.167", // Chrome text style
		sText3 = "Geocache Description:\nmy description\nSkip to Content \nThis is a Premium Member Only cache. \nThis cache has been archived. \nThis cache is temporarily unavailable. \nYour profile photo myname 1,234 Finds \nGCPREP2 \nMulti-cache \n Preprocessed Test 2\nA cache by GcFiddle\nMessage this owner Hidden : 07/23/2018\nDifficulty: 1.5\nTerrain: 3.5\nSize: Size: regular\n13 Favorites \nN 49° 18.071 E 008° 42.167", // modified text
		mResult = {
			archived: true,
			available: false,
			difficulty: 1.5,
			favorites: 13,
			finds: 1234,
			hidden: "2018-07-23",
			id: "GCPREP2",
			name: "myname",
			owner: "GcFiddle",
			premium: true,
			size: "regular",
			terrain: 3.5,
			title: "Preprocessed Test 2",
			type: "multi-cache",
			waypoint: "N 49° 18.071 E 008° 42.167"
		},
		oOut;

	oOut = oPre.processText(sText1);
	delete oOut.script;
	assert.deepEqual(oOut, mResult, "parameters extracted from text1");

	oPre.init(oPre.options); // init
	oOut = oPre.processText(sText2);
	delete oOut.script;
	assert.deepEqual(oOut, mResult, "parameters extracted from text2");

	oPre.init(oPre.options); // init
	oOut = oPre.processText(sText3);
	// delete oOut.script;
	mResult.script = "#Geocache Description:\n#my description\n";
	assert.deepEqual(oOut, mResult, "parameters extracted from text3");
});

QUnit.test("Parameters from section: Additional Hints", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "Additional Hints (Decrypt)\nzl uvag [plain text]",
		mResult1 = {
			script: "#Additional Hints\n#\n#my hint [plain text]\n"
		},
		sText2 = "Additional Hints (Encrypt)\nmy hint [plain text]\n",
		mResult2 = {
			script: "#Additional Hints\n#\n#my hint [plain text]\n"
		},
		sText3 = "Additional Hints (No hints available.)\nFound It!\nLogged on: 06/06/2018\nView Gallery (8)\nWatch (4)",
		// If there are no hints, we get informations from section: Decryption Key
		mResult3 = {
			galleryCount: 8,
			log: "found",
			loggedOn: "2018-06-06",
			script: "#Additional Hints\n##No hints available.\n",
			watchCount: 4,
			watching: false
		},
		oOut;

	oOut = oPre.processText(sText1);
	assert.deepEqual(oOut, mResult1, "parameters extracted from text1");

	oPre.init(oPre.options); // init
	oOut = oPre.processText(sText2);
	assert.deepEqual(oOut, mResult2, "parameters extracted from text2");

	oPre.init(oPre.options); // init
	oOut = oPre.processText(sText3);
	assert.deepEqual(oOut, mResult3, "parameters extracted from text3");
});

QUnit.test("Parameters from section: Decryption Key", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "Geocache Description:\nmy description\nDecryption Key\nLog geocache\nView Gallery (8)\nWatch (4)",
		mResult1 = {
			galleryCount: 8,
			script: "#Geocache Description:\n#my description\n",
			watchCount: 4,
			watching: false
		},
		sText2 = "Decryption Key\nFound It!\nLogged on: 06/06/2018\nView Gallery (8)\nWatch (4)",
		mResult2 = {
			galleryCount: 8,
			log: "found",
			loggedOn: "2018-06-06",
			watchCount: 4,
			watching: false
		},
		sText3 = "Decryption Key\nDid Not Find\nLogged on: 06/06/2018\nView Gallery (8)\nWatch (4)",
		mResult3 = {
			galleryCount: 8,
			log: "not found",
			loggedOn: "2018-06-06",
			watchCount: 4,
			watching: false
		},
		oOut;

	oOut = oPre.processText(sText1);
	assert.deepEqual(oOut, mResult1, "parameters extracted from text1");

	oPre.init(oPre.options); // init
	oOut = oPre.processText(sText2);
	delete oOut.script;
	assert.deepEqual(oOut, mResult2, "parameters extracted from text2");

	oPre.init(oPre.options); // init
	oOut = oPre.processText(sText3);
	delete oOut.script;
	assert.deepEqual(oOut, mResult3, "parameters extracted from text3");
});

QUnit.test("Parameters from section: Additional Waypoints", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "Additional Waypoints\nPrefix Lookup Name Coordinate\nVisible	Parking Area P0	P0 Park1 (Parking Area) N 49° 18.071 E 008° 42.191\nNote:\n",
		mResult1 = {
			script: "#Additional Waypoints\n#Prefix Lookup Name Coordinate\n#Visible Parking Area P0 P0 Park1 (Parking Area) N 49° 18.071 E 008° 42.191\n$W1=\"N 49° 18.071 E 008° 42.191\"\n#Note:\n"
		},
		oOut;

	oOut = oPre.processText(sText1);
	assert.deepEqual(oOut, mResult1, "waypoints extracted");
});

QUnit.test("Parameters from section: n Logged Visits", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "Geocache Description:\nmy description\n21 Logged Visits\n"
			+ "p member 1\n[Premium Member] Premium Member\n[Caches Found] 1584\nWrite note Write note\n03/14/2016\nLog message text 1.\nView Log\n"
			+ "just :P (4)\n[Member] Member\n[Caches Found] 423\nFound it Found it\n09/06/2014\nFound it.\nView Log\n"
			+ "member3\nMember\nCaches Found 82\nDidn't find it Didn't find it\n04/21/2014\nNot found text\nView Log\n"
			+ "reviewer 1\n[Reviewer] Reviewer\nProfile photo for reviewer 1\n[Caches Found] 25\nPublish ListingPublish Listing\n01/31/2014\nPublished\nView Log\n"
			+ "special 1\nMember Member\nCaches Found17\nFound it Found it 05/22/2014\nFound it.\nView Log\n",
		mResult1 = {
			logs: [
				{
					date: "2016-03-14",
					finds: 1584,
					name: "p member 1",
					premium: true,
					text: "Log message text 1.",
					type: "note"
				},
				{
					date: "2014-09-06",
					finds: 423,
					name: "just :P (4)",
					premium: false,
					text: "Found it.",
					type: "found"
				},
				{
					date: "2014-04-21",
					finds: 82,
					name: "member3",
					premium: false,
					text: "Not found text",
					type: "not found"
				},
				{
					date: "2014-01-31",
					finds: 25,
					name: "reviewer 1",
					premium: false,
					text: "Published",
					type: "published"
				},
				{
					date: "2014-05-22",
					finds: 17,
					name: "special 1",
					premium: false,
					text: "Found it.",
					type: "found"
				}
			],
			script: "#Geocache Description:\n#my description\n"
		},
		oOut;

	oOut = oPre.processText(sText1);
	assert.deepEqual(oOut, mResult1, "parameters extracted from text1");
});

QUnit.test("Parameters from section: Current Time", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "Geocache Description:\nmy description\nCurrent Time: 06/30/2018 00:43:12 Pacific Daylight Time (07:43 GMT)\n"
			+ "Last Updated: 2017-02-04T18:39:52Z on 02/04/2017 10:39:52 (UTC-08:00) Pacific Time (US & Canada) (18:39 GMT)\n",
		mResult1 = {
			currentGMTTime: "07:43",
			currentTime: "2018-06-30T07:43:12Z",
			lastUpdated: "2017-02-04T18:39:52Z",
			script: "#Geocache Description:\n#my description\n"
		},
		oOut;

	oOut = oPre.processText(sText1);
	assert.deepEqual(oOut, mResult1, "parameters extracted from text1");
});

QUnit.test("Use ScriptParser to add undefined variables", function (assert) {
	var oPre = this.pre, // eslint-disable-line no-invalid-this
		sText1 = "a=b+c",
		mResult1 = {
			script: "b=0 #not detected\nc=0 #not detected\n#a=b+c\na=b+c\n"
		},
		aMissingVars = [
			"b",
			"c"
		],
		oScriptParser = {
			calculate: function (script) {
				var oRet = {},
					i;

				for (i = 0; i < aMissingVars.length; i += 1) {
					if (script.indexOf(aMissingVars[i] + "=") < 0) {
						oRet.error = {
							message: "Variable is undefined",
							value: aMissingVars[i]
						};
						break;
					}
				}
				return oRet;
			}
		},
		oOut;

	oPre.init({
		scriptParser: oScriptParser
	});
	oOut = oPre.processText(sText1);
	assert.deepEqual(oOut, mResult1, "undefinied variables added");
});
// end
