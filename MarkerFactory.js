// MarkerFactory.js - MarkerFactory...
//
/* globals LatLng, Utils */

"use strict";

//
// MarkerFactory: settings={draggable}
function MarkerFactory(options) {
	this.init(options);
}

MarkerFactory.prototype = {
	initMap: function (mapProxy) {
		var aMarkerOptions = [],
			oMarker, oMarkerOptions, i;

		if (mapProxy && mapProxy.getMap()) {
			this.mapProxy = mapProxy;
			for (i = 0; i < this.aMarkerList.length; i += 1) {
				oMarker = this.aMarkerList[i];
				if (oMarker) {
					aMarkerOptions.push(
						{
							position: oMarker.getPosition(),
							label: oMarker.getLabel(),
							title: oMarker.getTitle()
						}
					);
				}
			}
			this.deleteMarkers();
			this.deletePolyline();
			this.deleteInfoWindow();

			this.createInfoWindow();
			for (i = 0; i < aMarkerOptions.length; i += 1) {
				oMarkerOptions = aMarkerOptions[i];
				oMarkerOptions.infoWindow = this.infoWindow;
				this.setMarker(oMarkerOptions, i);
			}
			this.fitBounds();
			this.setPolyline();
			this.showMarkers();
		} else {
			this.mapProxy = null;
		}
	},
	init: function (options) {
		this.positionFormat = options.positionFormat;
		this.oCommonOptions = options;
		this.aMarkerList = [];
		this.initMap(null);
	},
	getMarkers: function () {
		return this.aMarkerList;
	},
	setMarker: function (options, i) {
		var oMarkerOptions = Utils.objectAssign({}, this.oCommonOptions, options),
			mapProxy = this.mapProxy,
			oMarker;

		if (!oMarkerOptions.label) {
			oMarkerOptions.label = Utils.strZeroFormat(String(i), 2);
		}
		if (!oMarkerOptions.title) {
			oMarkerOptions.title = "W" + oMarkerOptions.label;
		}

		oMarkerOptions.infoWindow = this.infoWindow;

		if (i >= this.aMarkerList.length) { // add new marker
			if (mapProxy) {
				oMarker = mapProxy.createMarker(oMarkerOptions);
				if (this.aMarkerList.length === 0) { // for the first marker
					this.setCenter(oMarker);
				}
			} else { // !map
				oMarker = Utils.objectAssign({
					getPosition: function () {
						return this.position;
					},
					getTitle: function () {
						return this.title;
					},
					getLabel: function () {
						return this.label;
					},
					getMap: function () {
						return this.map;
					},
					setMap: function (map) {
						this.map = map;
					}
				}, oMarkerOptions);
			}
		} else { // adapt existing marker
			oMarker = this.aMarkerList[i];
			if (oMarkerOptions.position) {
				oMarker.setPosition(oMarkerOptions.position);
			}
			if (oMarkerOptions.title) {
				oMarker.setTitle(oMarkerOptions.title);
			}
			if (oMarkerOptions.label) {
				oMarker.setLabel(oMarkerOptions.label);
			}
			if (this.infoWindow && this.infoWindow.getAnchor() === oMarker) {
				this.infoWindow.setContent(oMarker);
			}
		}
		if (oMarker) {
			this.aMarkerList[i] = oMarker;
		}
	},
	setMapOnAllMarkers: function (mapProxy) {
		var map, oMarker, i;

		map = mapProxy ? mapProxy.getMap() : null;
		for (i = 0; i < this.aMarkerList.length; i += 1) {
			oMarker = this.aMarkerList[i];
			if (oMarker && oMarker.getMap() !== map) {
				oMarker.setMap(map);
			}
		}
	},
	showMarkers: function () {
		this.setMapOnAllMarkers(this.mapProxy);
	},
	clearMarkers: function () {
		this.setMapOnAllMarkers(null);
	},
	deleteMarkers: function () {
		var oMarker, i;

		this.clearMarkers();
		for (i = 0; i < this.aMarkerList.length; i += 1) {
			oMarker = this.aMarkerList[i];
			if (oMarker && oMarker.destroy) { // needed for OpenLayers?
				oMarker.destroy();
			}
			this.aMarkerList[i] = null;
		}
		this.aMarkerList = [];
	},
	setCenter: function (marker) {
		var mapProxy = this.mapProxy;

		if (mapProxy) {
			mapProxy.getMap().setCenter(marker.getPosition());
		}
	},
	fitBounds: function () {
		var mapProxy = this.mapProxy,
			oBounds, i;

		if (mapProxy) {
			if (this.aMarkerList.length) {
				oBounds = mapProxy.createLatLngBounds();

				for (i = 0; i < this.aMarkerList.length; i += 1) {
					oBounds.extend(this.aMarkerList[i].getPosition());
				}
				mapProxy.getMap().fitBounds(oBounds);
			}
		}
	},
	resize: function () {
		var mapProxy = this.mapProxy;

		if (mapProxy) {
			mapProxy.getMap().resize();
		}
	},
	clearPolyline: function () {
		if (this.polyLine) {
			this.polyLine.setMap(null);
		}
	},
	deletePolyline: function () {
		this.clearPolyline();
		if (this.polyLine && this.polyLine.destroy) { // needed for OpenLayers?
			this.polyLine.destroy();
		}
		this.polyLine = null;
	},
	setPolyline: function () {
		var aList = [],
			mapProxy = this.mapProxy,
			oPolyLineOptions, i;

		if (mapProxy) {
			for (i = 0; i < this.aMarkerList.length; i += 1) {
				aList.push(this.aMarkerList[i].getPosition());
			}
			if (!this.polyLine) {
				oPolyLineOptions = {
					clickable: true,
					strokeColor: "red",
					strokeOpacity: 0.8,
					strokeWeight: 0.5
				};
				this.polyLine = mapProxy.createPolyline(oPolyLineOptions);
			}
			this.polyLine.setMap(mapProxy.getMap());
			this.polyLine.setPath(aList);
		}
	},
	deleteInfoWindow: function () {
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
	},
	createInfoWindow: function () {
		var mapProxy = this.mapProxy,
			that = this;

		if (mapProxy) {
			this.infoWindow = mapProxy.createInfoWindow({
				onGetInfoWindowContent: function (marker) {
					var aDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"], // eslint-disable-line array-element-newline
						sContent, oPreviousMarker, iIndex, oPosition1, oPosition2, iAngle, iDistance, sDirection;

					sContent = marker.getTitle() + "=" + marker.getPosition().toFormattedString(that.positionFormat);
					iIndex = that.aMarkerList.indexOf(marker);
					if (iIndex >= 1) {
						oPreviousMarker = that.aMarkerList[iIndex - 1];
						oPosition1 = oPreviousMarker.getPosition();
						oPosition2 = marker.getPosition();
						iAngle = Math.round(LatLng.prototype.bearingTo.call(oPosition1, oPosition2));
						iDistance = Math.round(LatLng.prototype.distanceTo.call(oPosition1, oPosition2));
						sDirection = aDirections[Math.round(iAngle / (360 / aDirections.length)) % aDirections.length];
						sContent += "<br>" + sDirection + ": " + iAngle + "° " + iDistance + "m";
					}
					return sContent;
				}
			});
		}
	}
};
// end
