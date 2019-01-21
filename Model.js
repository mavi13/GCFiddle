// Model.js - Model
//
/* globals */

"use strict";

function Model(options) {
	this.init(options);
}

Model.prototype = {
	init: function (options) {
		this.config = options.config; // store only a reference
		this.initialConfig = options.initialConfig;

		this.exampleIndex = { }; // example index
		this.examples = { }; // loaded examples per category (properties: category, key, script, title)

		this.initVariables();
	},
	getProperty: function (sProperty) {
		return this.config[sProperty];
	},
	setProperty: function (sProperty, sValue) {
		this.config[sProperty] = sValue;
		return this;
	},
	getAllProperties: function () {
		return this.config;
	},
	getAllInitialProperties: function () {
		return this.initialConfig;
	},

	getVariables: function () {
		return this.variables;
	},
	initVariables: function () {
		this.variables = {
			gcfOriginal: { }
		};
		return this;
	},

	getExampleIndex: function (sCategory) {
		return this.exampleIndex[sCategory];
	},
	setExampleIndex: function (sCategory, oExampleIndex) {
		this.exampleIndex[sCategory] = oExampleIndex;
		if (!this.examples[sCategory]) {
			this.examples[sCategory] = {};
		}
		return this;
	},
	getAllExamples: function (sCategory) {
		return this.examples[sCategory];
	},
	getExample: function (sCategory, sKey) {
		return this.examples[sCategory][sKey];
	},
	setExample: function (oExample) {
		var oExamples = this.examples[oExample.category];

		if (oExamples) {
			oExamples[oExample.key] = oExample;
		} else {
			window.console.error("setExample: Unknown category: " + oExample.category);
		}
		return this;
	}
};

// end
