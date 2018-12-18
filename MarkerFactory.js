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
			//this.fg = mapProxy.createFeatureGroup();
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

	/*
	privGetInfoWindowContent2: function (marker, previousMarker) {
		var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
			sContent, oPosition1, oPosition2, iAngle, iDistance, sDirection;

		sContent = marker.title + "=" + marker.position.toFormattedString(this.options.positionFormat); //TTT TODO

		if (previousMarker) {
			oPosition1 = previousMarker.position;
			oPosition2 = marker.position;
			iAngle = Math.round(LatLng.prototype.bearingTo.call(oPosition1, oPosition2));
			iDistance = Math.round(LatLng.prototype.distanceTo.call(oPosition1, oPosition2));
			sDirection = aDirections[Math.round(iAngle / (360 / aDirections.length)) % aDirections.length];
			sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
		}
		return sContent;
	}
	*/
};
// end
