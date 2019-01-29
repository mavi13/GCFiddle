// CommonEventHandler.qunit.js - ...
//
/* globals QUnit */

"use strict";

var CommonEventHandler;

if (typeof require !== "undefined") {
	CommonEventHandler = require("../CommonEventHandler.js"); // eslint-disable-line global-require
}

var gcMock = { // eslint-disable-line vars-on-top,one-var
	config: {
		example: "GCTEST1"
	},
	model: {
		variables: {},
		exampleIndex: {},
		examples: {},
		initVariables: function () {
			return this;
		},
		getExampleIndex: function (sDatabase) {
			return this.exampleIndex[sDatabase];
		}
	},
	view: {
		data: {
			databaseSelect: "GCTEST1"
		},
		setDisabled: function () {
			// empty
		},
		getSelectValue: function (sId) {
			return this.data[sId];
		},
		setSelectValue: function (sId, value) {
			this.data[sId] = value;
		},
		setAreaValue: function (sId, value) {
			this.data[sId] = value;
		},
		setSelectTitleFromSelectedOption: function () {
			// empty
		},
		attachEventHandler: function () {
			// empty
		},
		detachEventHandler: function () {
			// empty
		}
	},
	controller: {
		categories: {},
		examples: {},
		pendingScripts: [],
		fnPutChangedInputOnStack: function () {
			// empty
		},
		fnCalculate2: function () {
			// empty
		}
	}
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
	var commonEventHandler = new CommonEventHandler(gcMock.model, gcMock.view, gcMock.controller),
		sScript = '$W0="N 49° 18.071 E 008° 42.167" a=213 b=289	$W1=["N 49° 18." a " E 008° 42." b]	#$W2=project($W0,0,50)';

	// commonEventHandler.onExecuteButtonClick();

	commonEventHandler.detachEventHandler();
	assert.strictEqual(sScript, sScript, "TODO");
});

QUnit.test("Load test script", function (assert) {
	var commonEventHandler = new CommonEventHandler(gcMock.model, gcMock.view, gcMock.controller);

	/*
	fnLoadScript = Utils.loadScript;
	Utils.loadScript = function (url, callback, arg) {
		fnLoadScript("../../" + url, callback, arg); // cannot go back
	};
	*/

	//	commonEventHandler.onDatabaseSelectChange(); // TODO

	/*
	Utils.loadScript = fnLoadScript;
	*/

	commonEventHandler.detachEventHandler();
	assert.strictEqual("", "", "TODO");
});
// end
