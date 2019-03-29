// CommonEventHandler.qunit.js - ...
//
/* globals QUnit */

"use strict";

var CommonEventHandler;

if (typeof require !== "undefined") {
	CommonEventHandler = require("../CommonEventHandler.js"); // eslint-disable-line global-require
}


function TestModel() {
	this.testData = {}; // contains: config: {}, variables: {}, examples: {}
}

TestModel.prototype = {
	setTestData: function (sGroup, sId, value) {
		if (!this.testData[sGroup]) {
			this.testData[sGroup] = {};
		}
		this.testData[sGroup][sId] = value;
		return this;
	},
	getTestData: function (sGroup, sId) {
		if (sId === undefined) {
			return this.testData[sGroup];
		}
		return this.testData[sGroup][sId];
	},

	getProperty: function (sProperty) {
		return this.getTestData("config", sProperty);
	},
	setProperty: function (sProperty, sValue) {
		return this.setTestData("config", sProperty, sValue);
	},
	initVariables: function () {
		return this;
	},
	getVariable: function (sVar) {
		return this.getTestData("variables", sVar);
	},
	getAllVariables: function () {
		return this.getTestData("variables");
	}
};


function TestView() {
	this.testData = {};
}

TestView.prototype = {
	setTestData: function (sId, value) {
		this.testData[sId] = value;
		return this;
	},
	getTestData: function (sId) {
		return this.testData[sId];
	},
	setDisabled: function () {
		// empty
	},
	getSelectValue: function (sId) {
		return this.getTestData(sId + "Value");
	},
	setSelectValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	setAreaValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	setSelectTitleFromSelectedOption: function (/* sId */) {
		// empty
	},
	setLabelText: function (sId, value) {
		return this.setTestData(sId + "Text", value);
	},
	setLabelTitle: function (sId, value) {
		return this.setTestData(sId + "Title", value);
	},
	setInputType: function (sId, value) {
		return this.setTestData(sId + "Type", value);
	},
	setInputMin: function (sId, value) {
		return this.setTestData(sId + "Min", value);
	},
	setInputMax: function (sId, value) {
		return this.setTestData(sId + "Max", value);
	},
	setInputStep: function (sId, value) {
		return this.setTestData(sId + "Step", value);
	},
	setInputValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	setInputTitle: function (sId, value) {
		return this.setTestData(sId + "Title", value);
	},
	setInputInvalid: function () {
		// empty
	},
	getSelectLength: function (sId) {
		return this.getTestData(sId + "Length");
	},
	setLegendText: function (sId, value) {
		return this.setTestData(sId + "Text", value);
	},
	getHidden: function (sId) {
		return this.getTestData(sId + "Hidden");
	},
	setHidden: function (sId, value) {
		return this.setTestData(sId + "Hidden", value);
	},
	toogleHidden: function (sId) {
		return this.setTestData(sId + "Hidden", !this.getHidden(sId + "Hidden"));
	},
	attachEventHandler: function () {
		// empty
	},
	detachEventHandler: function () {
		// empty
	}
};


function TestController() {
	// empty
}

TestController.prototype = {
	fnPutChangedInputOnStack: function () {
		// empty
	},
	fnCalculate2: function () {
		// empty
	}
};


QUnit.module("CommonEventHandler test", function (hooks) {
	hooks.beforeEach(function (/* assert */) {
		var that = this; // eslint-disable-line no-invalid-this

		that.oMock = {
			model: new TestModel(),
			view: new TestView(),
			controller: new TestController()
		};
	});

	QUnit.test("onVarSelectChange", function (assert) {
		var oMock = this.oMock, // eslint-disable-line no-invalid-this
			mModelResultA = {
				config: {
					varMax: 20,
					varMin: 0,
					varStep: 1,
					varType: "number"
				},
				variables: {
					$w: "N 49° 18.071 E 008° 42.167",
					a: 12,
					b: "t1"
				}
			},
			mViewResultA = {
				varInputMax: 20,
				varInputMin: 0,
				varInputStep: 1,
				varInputTitle: 12,
				varInputType: "number",
				varInputValue: 12,
				varLabelText: "a",
				varLabelTitle: "a",
				varLegendText: "Variables (undefined)",
				varSelectValue: "a"
			},
			mViewResultB = {
				varInputMax: 20,
				varInputMin: 0,
				varInputStep: 1,
				varInputTitle: "t1",
				varInputType: "text",
				varInputValue: "t1",
				varLabelText: "b",
				varLabelTitle: "b",
				varLegendText: "Variables (2)",
				varSelectLength: 2,
				varSelectValue: "b"
			},
			commonEventHandler = new CommonEventHandler(oMock.model, oMock.view, oMock.controller);

		oMock.model.setTestData("config", "varMin", 0);
		oMock.model.setTestData("config", "varMax", 20);
		oMock.model.setTestData("config", "varStep", 1);
		oMock.model.setTestData("config", "varType", "number");
		oMock.model.setTestData("variables", "a", 12);
		oMock.model.setTestData("variables", "b", "t1");
		oMock.model.setTestData("variables", "$w", "N 49° 18.071 E 008° 42.167");

		oMock.view.setTestData("varSelectValue", "a");
		commonEventHandler.onVarSelectChange();
		assert.deepEqual(oMock.model.testData, mModelResultA, "variable a selected (model)");
		assert.deepEqual(oMock.view.testData, mViewResultA, "variable a selected");

		oMock.view.setTestData("varSelectLength", 2);
		oMock.view.setTestData("varSelectValue", "b");
		commonEventHandler.onVarSelectChange();
		assert.deepEqual(oMock.model.testData, mModelResultA, "variable b selected (model no change)"); // no change
		assert.deepEqual(oMock.view.testData, mViewResultB, "variable b selected");

		commonEventHandler.detachEventHandler();
	});

	QUnit.test("onWaypointSelectChange", function (assert) {
		var oMock = this.oMock, // eslint-disable-line no-invalid-this
			//sScript = '$W0="N 49° 18.071 E 008° 42.167" a=213 b=289	$W1=["N 49° 18." a " E 008° 42." b]	#$W2=project($W0,0,50)',
			mModelResultA = {
				config: {
					waypointFormat: "dmmc"
				},
				variables: {
					$w: "N 49° 18.071 E 008° 42.167!test!Title 1"
				}
			},
			mViewResultA = {
				waypointInputTitle: "N 49° 18.071 E 008° 42.167!test!Title 1",
				waypointInputValue: "N 49° 18.071 E 008° 42.167!test!Title 1",
				waypointLabelText: "$w",
				waypointLabelTitle: "$w",
				waypointSelectLength: 1,
				waypointLegendText: "Waypoints (1)",
				waypointSelectValue: "$w"
			},
			commonEventHandler = new CommonEventHandler(oMock.model, oMock.view, oMock.controller);

		oMock.model.setTestData("config", "waypointFormat", "dmmc");

		oMock.model.setTestData("variables", "$w", "N 49° 18.071 E 008° 42.167!test!Title 1");
		oMock.view.setTestData("waypointSelectLength", 1);
		oMock.view.setTestData("waypointSelectValue", "$w");
		commonEventHandler.onWaypointSelectChange(null);
		assert.deepEqual(oMock.model.testData, mModelResultA, "waypoint $w selected (model)");
		assert.deepEqual(oMock.view.testData, mViewResultA, "waypoint $w selected");

		commonEventHandler.detachEventHandler();
	});

	QUnit.test("onXXXLegendClick", function (assert) {
		var oMock = this.oMock, // eslint-disable-line no-invalid-this
			mModelResultA = {
				config: {
					showScript: false
				}
			},
			mViewResultA = {
				scriptAreaHidden: true
			},
			commonEventHandler = new CommonEventHandler(oMock.model, oMock.view, oMock.controller);

		oMock.model.setTestData("config", "showScript", true);
		oMock.view.setTestData("scriptAreaHidden", false);
		commonEventHandler.onScriptLegendClick();
		assert.deepEqual(oMock.model.testData, mModelResultA, "onScriptLegendClick: Model");
		assert.deepEqual(oMock.view.testData, mViewResultA, "onScriptLegendClick: View");

		commonEventHandler.detachEventHandler();
	});

	QUnit.test("Load test script", function (assert) {
		var oMock = this.oMock, // eslint-disable-line no-invalid-this
			commonEventHandler = new CommonEventHandler(oMock.model, oMock.view, oMock.controller);

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
});
// end
