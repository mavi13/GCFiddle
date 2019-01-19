// CommonEventHandler.qunit.js - ...
//
/* globals QUnit, CommonEventHandler, Utils, LatLng, MapProxy */

"use strict";

var gDebug = {
		log: window.console.log,
		level: 1
	},
	gcFiddle = {
		config: {}
	};


QUnit.module("CommonEventHandler test", {
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
	var oHandler = new CommonEventHandler().attach(),
		sScript = '$W0="N 49° 18.071 E 008° 42.167" a=213 b=289	$W1=["N 49° 18." a " E 008° 42." b]	#$W2=project($W0,0,50)';

	//oHandler.onExecuteButtonClick();

	oHandler.detach();
	assert.strictEqual("", "", "TODO");
});

// end
