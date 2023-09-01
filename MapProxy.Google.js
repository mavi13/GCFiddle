// MapProxy.Google.js - MapProxy.Google for GCFiddle
// https://developers.google.com/maps/documentation/javascript/reference
//
/* globals MapProxy, Utils, LatLng, google */ // make ESlint happy

"use strict";

MapProxy.Google = {
	position2google: function (position) {
		return new google.maps.LatLng(position.lat, position.lng);
	},
	google2position: function (position) {
		return new LatLng(position.lat(), position.lng());
	}
};

MapProxy.Google.Map = function (options) {
	this.init(options);
};

MapProxy.Google.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl;

		this.options = Utils.objectAssign({}, options);
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		sUrl = sProtocol + "//maps.googleapis.com/maps/api/js" + ((this.options.googleKey) ? "?key=" + this.options.googleKey : "");
		Utils.loadScript(sUrl, function () {
			var mapDiv = document.getElementById(that.options.mapDivId);

			// Google maps needs devicePixelRatio, requestAnimationFrame; available since IE11
			if (typeof google === "undefined") {
				Utils.console.error("Google maps API not available.");
				return;
			}

			Utils.console.log("GoogleMaps " + google.maps.version + " loaded");
			that.map = new google.maps.Map(mapDiv, {
				zoom: that.options.zoom
			});

			google.maps.event.addListener(that.map, "zoom_changed", function () {
				var iFitBoundsZoom = that.fitBoundsZoom;

				if (iFitBoundsZoom && that.map.getZoom() !== iFitBoundsZoom) { // for one waypoint we reduce zoom level
					that.fitBoundsZoom = 0; // avoid recursive call!
					that.map.setZoom(iFitBoundsZoom);
				}
			});

			that.featureGroup = new MapProxy.Google.FeatureGroup({
				onGetInfoWindowContent: options.onGetInfoWindowContent
			});

			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	getFeatureGroup: function () {
		return this.featureGroup;
	},
	setCenter: function (position) {
		this.map.setCenter(MapProxy.Google.position2google(position));
	},
	fitBounds: function (bounds) {
		var oBounds = bounds.getBounds(),
			that = this;

		if (oBounds.getSouthWest()) { // Google maps available? (with API key)
			if (String(oBounds.getSouthWest()) === String(oBounds.getNorthEast())) { // only one waypoint
				this.fitBoundsZoom = that.options.zoom; // limit zoom level
			}
		}
		this.map.fitBounds(oBounds);
	},
	resize: function () {
		var oMap = this.map;

		google.maps.event.trigger(oMap, "resize");
	},
	privGetMap: function () {
		return this.map;
	}
};


MapProxy.Google.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.Google.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
		this.bounds = new google.maps.LatLngBounds();
	},
	getBounds: function () {
		return this.bounds;
	},
	extend: function (position) {
		this.bounds.extend(MapProxy.Google.position2google(position));
	}
};


MapProxy.Google.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.Google.FeatureGroup.prototype = {
	init: function (options) {
		var oPolyLineOptions = {
			strokeColor: "red",
			strokeOpacity: 1,
			strokeWeight: 1.5
		};

		this.options = Utils.objectAssign({}, options);
		this.aMarkerPool = []; // pool of created markers
		this.aMarkers = []; // visible markers
		this.polyLine = new MapProxy.Google.Polyline(oPolyLineOptions);
		this.infoWindow = new MapProxy.Google.InfoWindow();
	},
	changeMarker: function (iMarker, oItem) {
		var oMarker, oPosition;

		oMarker = this.aMarkers[iMarker]; //this.aMarkerPool[iMarker];
		oPosition = oItem.position.clone();
		oMarker.setLabel(oItem.label).setTitle(oItem.title).setPosition(oPosition);
		if (this.infoWindow && this.infoWindow.getAnchor() === oMarker) {
			this.infoWindow.setContent(this.privGetPopupContent(oMarker));
		}
	},
	setPolyline: function (aList) { // for update
		var aPath = [],
			i, oItem, oPosition;

		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = oItem.position.clone();
			aPath.push(oPosition);
		}
		this.polyLine.setPath(aPath);
	},
	addMarkers: function (aList) {
		var aMarkerPool = this.aMarkerPool,
			aMarkers = this.aMarkers,
			aPath = [],
			i, oItem, oPosition, oMarkerOptions, oMarker;

		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = oItem.position.clone();
			aPath.push(oItem.position);
			if (!aMarkerPool[i]) {
				oMarkerOptions = Utils.objectAssign({}, oItem, {
					position: oPosition
				});
				oMarker = new MapProxy.Google.Marker(oMarkerOptions);
				aMarkerPool[i] = oMarker;
			} else {
				oMarker = aMarkerPool[i];
				oMarker.setLabel(oItem.label).setTitle(oItem.title).setPosition(oPosition);
				if (this.infoWindow && this.infoWindow.getAnchor() === oMarker) {
					this.infoWindow.setContent(this.privGetPopupContent(oMarker));
				}
			}
			if (i >= aMarkers.length) {
				aMarkers.push(oMarker);
			}
		}
		this.polyLine.setPath(aPath);
	},
	deleteMarkers: function () {
		if (this.infoWindow) {
			this.infoWindow.close();
		}

		this.setMap(null);
		this.aMarkers = [];

		if (this.polyLine) {
			this.polyLine.setMap(null);
		}
	},
	fitBounds: function () {
		var oBounds, i;

		if (this.map) {
			if (this.aMarkers.length) {
				oBounds = new MapProxy.Google.LatLngBounds();

				for (i = 0; i < this.aMarkers.length; i += 1) {
					oBounds.extend(this.aMarkers[i].getPosition());
				}
				this.map.fitBounds(oBounds);
			}
		}
	},
	setMap: function (map) {
		var aMarkers = this.aMarkers,
			i, oMarker;

		this.map = map;
		if (map) {
			this.fitBounds();
			this.polyLine.setMap(map);
		}
		for (i = 0; i < aMarkers.length; i += 1) {
			oMarker = aMarkers[i];
			oMarker.setMap(map);
		}
	},
	privGetPopupContent: function (oMarker) {
		var aMarkers, oPreviousMarker, sContent, iIndex;

		aMarkers = this.aMarkers;
		iIndex = aMarkers.indexOf(oMarker);
		if (iIndex >= 1) { // not the first one?
			oPreviousMarker = aMarkers[iIndex - 1];
		}
		sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(oMarker, oPreviousMarker) : "";
		return sContent;
	}
};


MapProxy.Google.Marker = function (options) {
	this.init(options);
};

MapProxy.Google.Marker.prototype = {
	init: function (options) {
		var oMarkerOptions;

		this.options = Utils.objectAssign({}, options);
		oMarkerOptions = this.options;

		this.marker = new google.maps.Marker({
			position: MapProxy.Google.position2google(oMarkerOptions.position),
			label: oMarkerOptions.label,
			title: oMarkerOptions.title,
			draggable: true
		});
		google.maps.event.addListener(this.marker, "click", this.fnMarkerClick.bind(this)); // is it ok to use bind?
		google.maps.event.addListener(this.marker, "drag", this.fnMarkerDrag.bind(this));
		google.maps.event.addListener(this.marker, "dragend", this.fnMarkerDragEnd.bind(this));
	},

	fnMarkerClick: function () {
		var oFeatureGroup = this.map.getFeatureGroup(),
			oInfoWindow = oFeatureGroup.infoWindow;

		if (oInfoWindow) {
			if (oInfoWindow.getAnchor() !== this) {
				oInfoWindow.setContent(oFeatureGroup.privGetPopupContent(this));
				oInfoWindow.open(this.map, this);
			} else {
				oInfoWindow.close();
			}
		}
	},

	fnMarkerDrag: function () {
		var oFeatureGroup = this.map.getFeatureGroup(),
			oInfoWindow = oFeatureGroup.infoWindow;

		if (oInfoWindow && oInfoWindow.getAnchor() === this) {
			oInfoWindow.setContent(oFeatureGroup.privGetPopupContent(this));
		}
	},

	fnMarkerDragEnd: function () {
		this.getPosition(); // will update position (to detect change in setPosition)
	},

	getPosition: function () {
		var oPos = this.marker.getPosition();

		if (oPos) { // without API key we won't get a position
			this.options.position.setLatLng(oPos.lat(), oPos.lng()); // update position; MapProxy.Google.google2position(oPos)
		}
		return this.options.position;
	},
	setPosition: function (position) {
		if (String(this.options.position) !== String(position)) {
			this.options.position = position.clone();
			this.marker.setPosition(MapProxy.Google.position2google(position));
		}
		return this;
	},
	getTitle: function () {
		return this.options.title;
	},
	setTitle: function (title) {
		if (this.options.title !== title) {
			this.options.title = title;
			this.marker.setTitle(title);
		}
		return this;
	},
	setLabel: function (label) {
		if (this.options.label !== label) {
			this.options.label = label;
			this.marker.setLabel(label);
		}
		return this;
	},
	setMap: function (map) {
		this.map = map;
		this.marker.setMap(map ? map.privGetMap() : null);
		return this;
	},
	privGetMarker: function () {
		return this.marker;
	}
};


MapProxy.Google.Polyline = function (options) {
	this.init(options);
};

MapProxy.Google.Polyline.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
		this.polyline = new google.maps.Polyline(this.options);
	},
	setPath: function (path) {
		this.polyline.setPath(path);
	},
	setMap: function (map) {
		this.map = map;
		this.polyline.setMap(map ? map.privGetMap() : null);
	}
};


MapProxy.Google.InfoWindow = function (options) {
	this.init(options);
};

MapProxy.Google.InfoWindow.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
		this.infoWindow = new google.maps.InfoWindow();
	},
	setContent: function (sContent) {
		this.infoWindow.setContent(sContent);
	},
	getAnchor: function () {
		return this.anchor;
	},
	open: function (map, marker) {
		this.anchor = marker;
		this.infoWindow.open(map.privGetMap(), marker.privGetMarker());
	},
	close: function () {
		this.anchor = null;
		this.infoWindow.close();
	}
};
// end
