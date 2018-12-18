// MapProxy.js - MapProxy for GCFiddle
//
/* globals Utils */

"use strict";

function MapProxy(options) {
	this.init(options);
}

MapProxy.create = function (options) {
	return new MapProxy(options);
};

MapProxy.AvailableModules = {
	google: "Google",
	leaflet: "Leaflet",
	openlayers: "OpenLayers",
	simple: "Simple"
};

MapProxy.prototype = {
	init: function (options) {
		var that = this,
			sUrl;

		this.options = Utils.objectAssign({
			mapType: ""
		}, options);

		this.mapClass = MapProxy.AvailableModules[this.options.mapType];
		if (this.mapClass) {
			sUrl = "MapProxy." + this.mapClass + ".js";
			Utils.loadScript(sUrl, function () {
				window.console.log(sUrl + " loaded");

				if (that.options.onload) {
					that.options.onload(that);
				}
			});
		}
		return null;
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		this.map = map;
	},
	createMap: function (options) {
		return new MapProxy[this.mapClass].Map(options);
	}
	/*
	createFeatureGroup: function (options) {
		return new MapProxy[this.mapClass].FeatureGroup(options);
	}
	*/
};
// end
