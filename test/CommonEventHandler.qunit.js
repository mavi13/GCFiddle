// CommonEventHandler.qunit.js - ...
//
/* globals QUnit */

"use strict";

var CommonEventHandler;

if (typeof require !== "undefined") {
	CommonEventHandler = require("../CommonEventHandler.js"); // eslint-disable-line global-require
}


function TestModel() {
	this.testData = {
		config: {},
		variables: {},
		examples: {}
	};
}

TestModel.prototype = {
	setTestData: function (sGroup, sId, value) {
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
	getVariables: function () {
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
	setSelectTitleFromSelectedOption: function (sId) {
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
	setInputValue: function (sId, value) {
		return this.setTestData(sId + "Value", value);
	},
	setInputTitle: function (sId, value) {
		return this.setTestData(sId + "Title", value);
	},
	getSelectLength: function (sId) {
		return this.getTestData(sId + "Length"); //TTT
	},
	setLegendText: function (sId, value) {
		return this.setTestData(sId + "Text", value);
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
			//sScript = '$W0="N 49° 18.071 E 008° 42.167" a=213 b=289	$W1=["N 49° 18." a " E 008° 42." b]	#$W2=project($W0,0,50)',
			mResultA = {
				varInputTitle: 12,
				varInputType: "number",
				varInputValue: 12,
				varLabelText: "a",
				varLabelTitle: "a",
				varLegendText: "Variables (undefined)",
				varSelectValue: "a"
			},
			mResultB = {
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

		oMock.model.setTestData("config", "variableType", "number");
		oMock.model.setTestData("variables", "a", 12);
		oMock.model.setTestData("variables", "b", "t1");
		oMock.model.setTestData("variables", "$w", "N 49° 18.071 E 008° 42.167");

		oMock.view.setTestData("varSelectValue", "a");
		commonEventHandler.onVarSelectChange();
		assert.deepEqual(oMock.view.testData, mResultA, "variable a selected");


		oMock.view.setTestData("varSelectLength", 2);
		oMock.view.setTestData("varSelectValue", "b");
		commonEventHandler.onVarSelectChange();
		assert.deepEqual(oMock.view.testData, mResultB, "variable b selected");

		/*
		oMock.view.setTestData("varSelectValue", "$w");
		commonEventHandler.onVarSelectChange();
		assert.deepEqual(oMock.view.testData, mResultB, "variable $w selected");
		*/

		commonEventHandler.detachEventHandler();
		//assert.strictEqual(sScript, sScript, "TODO");
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
