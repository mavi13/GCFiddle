// LatLng.qunit.js - ...
//
/* globals QUnit, LatLng, Utils */

"use strict";

QUnit.module("LatLng Properties", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Properties", function (assert) {
	var oPos = new LatLng(),
		iLat = 49.26883,
		iLng = 8.67422,
		sComment = "comment1",
		sError = "error1",
		sFormat = "dms";

	oPos.setLatLng(iLat, iLng);
	assert.strictEqual(oPos.lat, iLat, iLat);
	assert.strictEqual(oPos.lng, iLng, iLng);

	oPos.setComment(sComment);
	assert.strictEqual(oPos.getComment(), sComment, sComment);

	oPos.error = sError;
	assert.strictEqual(oPos.getError(), sError, sError);

	oPos.setFormat(sFormat);
	assert.strictEqual(oPos.getFormat(), sFormat, sFormat);

	assert.strictEqual(String(oPos), "49.26883,8.67422,comment1,error1,dms", "toString");
});

QUnit.test("Clone", function (assert) {
	var oPos1 = new LatLng().setLatLng(49, 8).setComment("c1").setFormat("dmsc"),
		oPos2;

	oPos1.error = "e1";
	assert.strictEqual(String(oPos1), "49,8,c1,dmsc,e1", "pos1");

	oPos2 = oPos1.clone();
	assert.strictEqual(String(oPos2), "49,8,c1,dmsc,e1", "cloned pos2");

	oPos2.setLatLng(49.2, 8.2).setComment("c2").setFormat("ddc");
	oPos2.error = "e2";
	assert.strictEqual(String(oPos2), "49.2,8.2,c2,ddc,e2", "cloned pos2 modified");

	assert.strictEqual(String(oPos1), "49,8,c1,dmsc,e1", "original pos1 unchanged");
});


QUnit.module("LatLng Parse, Format", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("Parse format dmm, dmmc", function (assert) {
	var mInput = {
			"N 49° 16.130 E 008° 40.453": {
				testMsg: "normal"
			},
			"N 49 16.130 E 008 40.453": {
				testMsg: "no degree symbols"
			},
			"N 49 16.13 E 8 40.453": {
				testMsg: "no leading or tailing zeros"
			},
			"N49°16.130E008°40.453": {
				testMsg: "no spaces"
			},
			"N49 16.130E008 40.453": {
				testMsg: "no spaces except for missing degree symbols"
			},
			"  N  49 °  16.130  E  008  ° 40.453  ": {
				testMsg: "additional spaces"
			},
			"S 49° 16.130 W 008° 40.453": {
				testMsg: "normal, SW",
				lat: -49.26883333333333,
				lng: -8.674216666666666
			},
			"N 49° 16.130 E 008° 40.453!comment1": {
				testMsg: "normal, with comment",
				comment: "comment1",
				format: "dmmc"
			}
		},
		oResultTemplate = {
			lat: 49.26883333333333,
			lng: 8.674216666666666,
			format: "dmm"
		},
		sInput, oResult, oPos;

	for (sInput in mInput) {
		if (mInput.hasOwnProperty(sInput)) {
			oResult = Utils.objectAssign({}, oResultTemplate, mInput[sInput]);
			delete oResult.testMsg;
			oPos = new LatLng().parse(sInput);
			assert.propEqual(oPos, oResult, sInput + " (" + mInput[sInput].testMsg + ")");
		}
	}
});

QUnit.test("Parse format dms, dmsc", function (assert) {
	var mInput = {
			"N 49° 16' 07.80\" E 008° 40' 27.18\"": {
				testMsg: "normal"
			},
			"N 49 16' 07.80\" E 008 40' 27.18\"": {
				testMsg: "no degree symbols"
			},
			"N 49° 16' 07.8\" E 8° 40' 27.18\"": {
				testMsg: "no leading or tailing zeros"
			},
			"N49°16'07.80\"E008°40'27.18\"": {
				testMsg: "no spaces"
			},
			"N49 16'07.80\"E008 40'27.18\"": {
				testMsg: "no spaces except for missing degree symbols"
			},
			"  N 49 ° 16 ' 07.80 \"  E  008 ° 40  '  27.18  \"  ": {
				testMsg: "additional spaces"
			},
			"S 49° 16' 07.80\" W 008° 40' 27.18\"": {
				testMsg: "normal, SW",
				lat: -49.26883333333333,
				lng: -8.674216666666666
			},
			"N 49° 16' 07.80\" E 008° 40' 27.18\"!comment1": {
				testMsg: "normal, with comment",
				comment: "comment1",
				format: "dmsc"
			}
		},
		oResultTemplate = {
			lat: 49.26883333333333,
			lng: 8.674216666666666,
			format: "dms"
		},
		sInput, oResult, oPos;

	for (sInput in mInput) {
		if (mInput.hasOwnProperty(sInput)) {
			oResult = Utils.objectAssign({}, oResultTemplate, mInput[sInput]);
			delete oResult.testMsg;
			oPos = new LatLng().parse(sInput);
			assert.propEqual(oPos, oResult, sInput + " (" + mInput[sInput].testMsg + ")");
		}
	}
});

QUnit.test("Parse format dd, ddc", function (assert) {
	var mInput = {
			"N 49.26883° E 008.67422°": {
				testMsg: "normal"
			},
			"N 49.26883 E 008.67422": {
				testMsg: "no degree symbols"
			},
			"N 49.26883° E 8.67422°": {
				testMsg: "no leading or tailing zeros"
			},
			"N49.26883°E008.67422°": {
				testMsg: "no spaces"
			},
			"N49.26883 E008.67422": {
				testMsg: "no spaces except for missing degree symbols"
			},
			"  N 49.26883  ° E  008.67422 °  ": {
				testMsg: "additional spaces"
			},
			"S 49.26883° W 008.67422°": {
				testMsg: "normal, SW",
				lat: -49.26883,
				lng: -8.67422
			},
			"N 49.26883° E 008.67422°!comment1": {
				testMsg: "normal, with comment",
				comment: "comment1",
				format: "ddc"
			}
		},
		oResultTemplate = {
			lat: 49.26883,
			lng: 8.67422,
			format: "dd"
		},
		sInput, oResult, oPos;

	for (sInput in mInput) {
		if (mInput.hasOwnProperty(sInput)) {
			oResult = Utils.objectAssign({}, oResultTemplate, mInput[sInput]);
			delete oResult.testMsg;
			oPos = new LatLng().parse(sInput);
			assert.propEqual(oPos, oResult, sInput + " (" + mInput[sInput].testMsg + ")");
		}
	}
});

QUnit.test("Parse: error", function (assert) {
	var oResult = {
			lat: 0,
			lng: 0,
			error: "Cannot parse °"
		},
		bSuppressWarnings = true,
		sInput, oPos;

	sInput = "°";
	oPos = new LatLng().parse(sInput, bSuppressWarnings);
	assert.propEqual(oPos, oResult, oResult.error);

	sInput = "";
	delete oResult.error;
	oPos = oPos.parse(sInput, bSuppressWarnings);
	assert.propEqual(oPos, oResult, "No error (left) when parsing empty coord");
});

QUnit.test("toFormattedString: format like input format", function (assert) {
	var mTest = {
			"N 49° 16.130 E 008° 40.453": {
				format: "dmm"
			},
			"N 49° 16' 07.80\" E 008° 40' 27.18\"": {
				format: "dms"
			},
			"N 49.26883° E 008.67422°": {
				format: "dd"
			},
			"N 49° 16.130 E 008° 40.453!comment1": {
				format: "dmmc",
				comment: "comment1"
			},
			"N 49° 16' 07.80\" E 008° 40' 27.18\"!comment2": {
				format: "dmsc",
				comment: "comment2"
			},
			"N 49.26883° E 008.67422°!comment3": {
				format: "ddc",
				comment: "comment3"
			},
			"S 49° 16.130 W 008° 40.453": {
				format: "dmm",
				lat: -49.26883333333333,
				lng: -8.674216666666666
			}
		},
		oInputTemplate = {
			lat: 49.26883333333333,
			lng: 8.674216666666666
		},
		sTest, oPos, oLatLng, sPos;

	for (sTest in mTest) {
		if (mTest.hasOwnProperty(sTest)) {
			oPos = Utils.objectAssign({}, oInputTemplate, mTest[sTest]);
			oLatLng = new LatLng(oPos.lat, oPos.lng).setFormat(oPos.format).setComment(oPos.comment);
			sPos = oLatLng.toFormattedString();
			assert.strictEqual(sPos, sTest, sTest + " (" + (mTest[sTest].format || "") + ")");
		}
	}
});

QUnit.test("toFormattedString: override input format", function (assert) {
	var mTest = {
			"N 49° 16.130 E 008° 40.453": {
				testFormat: "dmm"
			},
			"N 49° 16' 07.80\" E 008° 40' 27.18\"": {
				testFormat: "dms"
			},
			"N 49.26883° E 008.67422°": {
				testFormat: "dd"
			},
			"N 49° 16.130 E 008° 40.453!comment1": {
				comment: "comment1",
				testFormat: "dmmc"
			},
			"N 49° 16' 07.80\" E 008° 40' 27.18\"!comment2": {
				comment: "comment2",
				testFormat: "dmsc"
			},
			"N 49.26883° E 008.67422°!comment3": {
				comment: "comment3",
				testFormat: "ddc"
			},
			"S 49° 16.130 W 008° 40.453": {
				testFormat: "dmm",
				lat: -49.26883333333333,
				lng: -8.674216666666666
			},
			"S 49° 16' 07.80\" W 008° 40' 27.18\"": {
				testFormat: "dms",
				lat: -49.26883333333333,
				lng: -8.674216666666666
			},
			"S 49.26883° W 008.67422°": {
				testFormat: "dd",
				lat: -49.26883333333333,
				lng: -8.674216666666666
			}
		},
		oInputTemplate = {
			lat: 49.26883333333333,
			lng: 8.674216666666666,
			format: "dms"
		},
		sTest, oPos, oLatLng, sPos;

	for (sTest in mTest) {
		if (mTest.hasOwnProperty(sTest)) {
			oPos = Utils.objectAssign({}, oInputTemplate, mTest[sTest]);
			delete oPos.testFormat;
			oLatLng = new LatLng(oPos.lat, oPos.lng).setFormat(oPos.format).setComment(oPos.comment);
			sPos = oLatLng.toFormattedString(mTest[sTest].testFormat);
			assert.strictEqual(sPos, sTest, sTest + " (" + (mTest[sTest].testFormat || "") + ")");
		}
	}
});

QUnit.test("toFormattedString: error", function (assert) {
	var bSuppressWarnings = true,
		oPos = {
			lat: 49.26883333333333,
			lng: 8.674216666666666
		},
		sTest, // undefined means unknown format
		oLatLng, sPos;

	oLatLng = new LatLng(oPos.lat, oPos.lng);
	sPos = oLatLng.toFormattedString("x1", bSuppressWarnings);
	assert.strictEqual(sPos, sTest, sTest + " (x1)");

	oLatLng.setFormat("x2");
	sPos = oLatLng.toFormattedString("", bSuppressWarnings);
	assert.strictEqual(sPos, sTest, sTest + " (x2)");
});


QUnit.module("LatLng Geodesy Tools", {
	before: function () {
		// prepare something once for all tests
	},
	beforeEach: function () {
		// prepare something before each test
		var data = {
			aPos: [
				new LatLng(49.26883, 8.67422).toFixed(9), // w0="N 49.26883° E 008.67422°", "N 49° 16.130 E 008° 40.453"
				new LatLng(49.26505, 8.67962).toFixed(9), // w1="N 49.26505° E 008.67962°", "N 49° 15.903 E 008° 40.777"
				new LatLng(49.26970, 8.68050).toFixed(9), // w2="N 49.26970° E 008.68050°", "N 49° 16.182 E 008° 40.830"

				new LatLng(49.266940031, 8.676920103).toFixed(9), // wm0="N 49.26694 E 008.67692", "N 49° 16.017 E 008° 40.615"
				new LatLng(49.269265043, 8.677359972).toFixed(9), // wm1
				new LatLng(49.267375001, 8.680059979).toFixed(9) // wm2
			],
			dist: {
				dist01: 574.6186779117294,
				dist02: 465.8032626741822,
				dist12: 520.983961384917
			},
			bear: {
				bear01: 137.00779818179797,
				bear10: 317.01189007469907,
				bear02: 78.01099496559812,
				bear20: 258.01575385181184,
				bear12: 7.039455969586186,
				bear21: 187.04012280093679
			}
		};

		this.data = data;
	},
	afterEach: function () {
		// clean up after each test
	},
	after: function () {
		// clean up once after all tests are done
	}
});

QUnit.test("distanceTo", function (assert) {
	var data = this.data, // eslint-disable-line no-invalid-this
		w = data.aPos,
		dist = data.dist;

	assert.strictEqual(w[0].distanceTo(w[0]), 0, "w0,w0");

	assert.strictEqual(w[0].distanceTo(w[1]).toFixed(11), dist.dist01.toFixed(11), "w0,w1"); // toFixed needed for IE
	assert.strictEqual(w[1].distanceTo(w[0]).toFixed(11), dist.dist01.toFixed(11), "w1,w0");

	assert.strictEqual(w[0].distanceTo(w[2]), dist.dist02, "w0,w2");
	assert.strictEqual(w[2].distanceTo(w[0]), dist.dist02, "w2,w0");

	assert.strictEqual(w[1].distanceTo(w[2]), dist.dist12, "w1,w2");
	assert.strictEqual(w[2].distanceTo(w[1]), dist.dist12, "w2,w1");
});

QUnit.test("bearingTo", function (assert) {
	var data = this.data, // eslint-disable-line no-invalid-this
		w = data.aPos,
		bear = data.bear;

	assert.strictEqual(w[0].bearingTo(w[0]), 0, "w0,w0");

	assert.strictEqual(w[0].bearingTo(w[1]).toFixed(9), bear.bear01.toFixed(9), "w0,w1"); // toFixed needed for IE
	assert.strictEqual(w[1].bearingTo(w[0]).toFixed(9), bear.bear10.toFixed(9), "w1,w0");

	assert.strictEqual(w[0].bearingTo(w[2]).toFixed(9), bear.bear02.toFixed(9), "w0,w2");
	assert.strictEqual(w[2].bearingTo(w[0]).toFixed(9), bear.bear20.toFixed(9), "w2,w0");

	assert.strictEqual(w[1].bearingTo(w[2]), bear.bear12, "w1,w2");
	assert.strictEqual(w[2].bearingTo(w[1]), bear.bear21, "w2,w1");
});

QUnit.test("destinationPoint (projection)", function (assert) {
	var data = this.data, // eslint-disable-line no-invalid-this
		w = data.aPos,
		dist = data.dist,
		bear = data.bear;

	assert.propEqual(w[0].destinationPoint(0, 0).toFixed(9), w[0], "w0->w0");

	assert.propEqual(w[0].destinationPoint(dist.dist01, bear.bear01).toFixed(9), w[1], "w0->w1");
	assert.propEqual(w[1].destinationPoint(dist.dist01, bear.bear10).toFixed(9), w[0], "w1->w0");

	assert.propEqual(w[0].destinationPoint(dist.dist02, bear.bear02).toFixed(9), w[2], "w0->w2");
	assert.propEqual(w[2].destinationPoint(dist.dist02, bear.bear20).toFixed(9), w[0], "w2->w0");

	assert.propEqual(w[1].destinationPoint(dist.dist12, bear.bear12).toFixed(9), w[2], "w1->w2");
	assert.propEqual(w[2].destinationPoint(dist.dist12, bear.bear21).toFixed(9), w[1], "w2->w1");

	assert.propEqual(w[0].destinationPoint(dist.dist01 / 2, bear.bear01).toFixed(9), w[3], "midpoint (w0->w1)/2");
});

QUnit.test("intersection", function (assert) {
	var data = this.data, // eslint-disable-line no-invalid-this
		w = data.aPos,
		bear = data.bear;

	assert.propEqual(LatLng.prototype.intersection(w[0], bear.bear02, w[1], bear.bear12).toFixed(9), w[2], "w0,w1->w2");
	assert.propEqual(LatLng.prototype.intersection(w[0], bear.bear01, w[2], bear.bear21).toFixed(9), w[1], "w0,w2->w1");
	assert.propEqual(LatLng.prototype.intersection(w[1], bear.bear10, w[2], bear.bear20).toFixed(9), w[0], "w1,w2->w0");
});

QUnit.test("intersection error", function (assert) {
	var bSuppressWarnings = true,
		data = this.data, // eslint-disable-line no-invalid-this
		w = data.aPos;

	assert.strictEqual(LatLng.prototype.intersection(w[0], 0, w[0], 0, bSuppressWarnings), null, "w0->w0 (null)");
});

QUnit.test("midpointTo", function (assert) {
	var data = this.data, // eslint-disable-line no-invalid-this
		w = data.aPos;

	assert.propEqual(w[0].midpointTo(w[0]).toFixed(9), w[0], "w0->w0");

	assert.propEqual(w[0].midpointTo(w[1]).toFixed(9), w[3], "w0->w1");
	assert.propEqual(w[1].midpointTo(w[0]).toFixed(9), w[3], "w1->w0");

	assert.propEqual(w[0].midpointTo(w[2]).toFixed(9), w[4], "w0->w2");
	assert.propEqual(w[2].midpointTo(w[0]).toFixed(9), w[4], "w2->w0");

	assert.propEqual(w[1].midpointTo(w[2]).toFixed(9), w[5], "w1->w2");
	assert.propEqual(w[2].midpointTo(w[1]).toFixed(9), w[5], "w2->w1");
});

// end
