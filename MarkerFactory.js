// MarkerFactory.js - MarkerFactory...
//
/* globals Utils */

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
	updateMarker: function (iMarker) {
		var oMarkerOptions, oFeatureGroup;

		if (this.mapProxy) {
			oMarkerOptions = this.aMarkerOptions[iMarker];
			oFeatureGroup = this.mapProxy.getMap().getFeatureGroup();
			oFeatureGroup.changeMarker(iMarker, oMarkerOptions);
		}
	},
	updateMarkers: function (aNewMarkerOptions) {
		var aMarkerOptions = this.aMarkerOptions,
			positionChanged = false,
			oFeatureGroup, i, oCurrent, oNew;

		if (this.mapProxy) {
			oFeatureGroup = this.mapProxy.getMap().getFeatureGroup();
			for (i = 0; i < aNewMarkerOptions.length; i += 1) {
				oCurrent = aMarkerOptions[i];
				oNew = aNewMarkerOptions[i];

				if (oNew.position.lat !== oCurrent.position.lat || oNew.position.lng !== oCurrent.position.lng) {
					aMarkerOptions[i] = oNew;
					this.updateMarker(i);
					positionChanged = true;
				}
			}
			if (positionChanged) {
				oFeatureGroup.setPolyline(aMarkerOptions);
			}
		}
	},
	addMarkers: function (aMarkerOptions) {
		var oFeatureGroup;

		this.aMarkerOptions = this.aMarkerOptions.concat(aMarkerOptions);
		if (this.mapProxy) {
			oFeatureGroup = this.mapProxy.getMap().getFeatureGroup();
			oFeatureGroup.addMarkers(this.aMarkerOptions); // it is rather a set
			oFeatureGroup.setMap(this.mapProxy.getMap());
			if (Utils.debug > 1) {
				Utils.console.debug("addMarkers: " + aMarkerOptions.length + " markers added, so we have: " + this.aMarkerOptions.length);
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
