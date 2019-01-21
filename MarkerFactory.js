// MarkerFactory.js - MarkerFactory...
//
/* globals gDebug, Utils */

"use strict";

//
// MarkerFactory: settings={draggable}
function MarkerFactory(options) {
	this.init(options);
}

MarkerFactory.prototype = {
	initMap: function (mapProxy) {
		var aMarkerOptions = this.aMarkerOptions;

		if (mapProxy && mapProxy.getMap()) {
			this.mapProxy = mapProxy;
			this.deleteMarkers();
			this.setMarkers(aMarkerOptions);
		} else {
			this.mapProxy = null;
		}
	},
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
		this.aMarkerOptions = [];
		this.initMap(null);
	},
	addMarkers: function (aMarkerOptions) {
		var oFeatureGroup;

		this.aMarkerOptions = this.aMarkerOptions.concat(aMarkerOptions);
		if (this.mapProxy) {
			oFeatureGroup = this.mapProxy.getMap().getFeatureGroup();
			oFeatureGroup.addMarkers(this.aMarkerOptions); // it is rather a set
			oFeatureGroup.fitBounds();
			oFeatureGroup.setMap(this.mapProxy.getMap());
			if (gDebug) {
				gDebug.log("DEBUG: addMarkers: " + aMarkerOptions.length + " markers added, so we have: " + this.aMarkerOptions.length);
			}
		}
	},
	setMarkers: function (aMarkerOptions) {
		this.aMarkerOptions = [];
		this.addMarkers(aMarkerOptions);
	},
	getMarkers: function () {
		return this.aMarkerOptions;
	},
	deleteMarkers: function () {
		var oFeatureGroup;

		this.aMarkerOptions = [];
		if (this.mapProxy) {
			oFeatureGroup = this.mapProxy.getMap().getFeatureGroup();
			oFeatureGroup.deleteMarkers();
		}
	},
	fitBounds: function () {
		var oFeatureGroup;

		if (this.mapProxy) {
			oFeatureGroup = this.mapProxy.getMap().getFeatureGroup();
			oFeatureGroup.fitBounds();
		}
	},
	resize: function () {
		var mapProxy = this.mapProxy;

		if (mapProxy) {
			mapProxy.getMap().resize();
		}
	},
	setCenter: function (marker) {
		var mapProxy = this.mapProxy;

		if (mapProxy) {
			mapProxy.getMap().setCenter(marker.position);
		}
	}
};
// end
