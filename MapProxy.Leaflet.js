// MapProxy.Leaflet.js - MapProxy.Leaflet for GCFiddle
// https://leafletjs.com/reference-1.3.0.html
//
/* globals MapProxy, Utils, gDebug, LatLng, L */ // make ESlint happy

"use strict";

MapProxy.Leaflet = {
	position2leaflet: function (position) {
		return position; // not needed
	},
	leaflet2position: function (position) {
		return new LatLng(position.lat, position.lng);
	}
};

MapProxy.Leaflet.Map = function (options) {
	this.init(options);
};

MapProxy.Leaflet.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl, sUrl2;

		this.options = Utils.objectAssign({ }, options);
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		sUrl = this.options.leafletUrl.replace(/^http(s)?:/, sProtocol).replace(/(-src)?\.js$/, ".css");
		Utils.loadStyle(sUrl, function () {
			window.console.log("Leaflet style loaded (" + sUrl + ")");
		});

		sUrl2 = this.options.leafletUrl.replace(/^http(s)?:/, sProtocol);
		Utils.loadScript(sUrl2, function () {
			window.console.log("Leaflet " + L.version + " loaded (" + sUrl2 + ")");
			that.map = L.map(that.options.mapDivId);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				maxZoom: 18
			}).addTo(that.map);

			/*
			L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
				attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>"',
				maxZoom: 18,
				id: "mapbox.streets",
				accessToken: that.options.leafletMapboxKey
			}).addTo(this.map);
			*/

			that.featureGroup = new MapProxy.Leaflet.FeatureGroup({
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
		this.map.setView(MapProxy.Leaflet.position2leaflet(position)); // keep zoom level
	},
	resize: function () {
		var oMap = this.map;

		oMap.invalidateSize();
	},
	privGetMap: function () {
		return this.map;
	}
};


// https://leafletjs.com/reference-1.3.4.html#featuregroup
MapProxy.Leaflet.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.Leaflet.FeatureGroup.prototype = {
	init: function (options) {
		var that = this,
			oNewPopup,
			mMarkerDragListener = {
				dragstart: function (event) {
					var oLeafletMarker = event.target,
						oPopup = that.markerGroup.getPopup();

					if (oPopup.isOpen()) {
						oPopup.openOn(oLeafletMarker); // reopen during drag
						if (!oLeafletMarker.getPopup()) {
							oLeafletMarker.bindPopup(oPopup);
						}
					}
				},
				drag: function (event) {
					var oLeafletMarker = event.target,
						oPopup = that.markerGroup.getPopup();

					if (oPopup.isOpen()) {
						oPopup.setContent(that.privGetPopupContent(oLeafletMarker));
					}
				},
				dragend: function (event) {
					var oLeafletMarker = event.target;

					if (oLeafletMarker.getPopup()) {
						oLeafletMarker.unbindPopup();
					}
				}
			};

		this.options = Utils.objectAssign({	}, options);
		this.iPopupSourceId = null; // current marker id with popup
		this.markerGroup = L.featureGroup(); // featureGroup for markers
		this.polylineGroup = L.featureGroup(); // featureGroup for polyline
		this.aMarkerPool = [];

		oNewPopup = new L.Popup();
		this.markerGroup.bindPopup(oNewPopup).on("click", function (event) {
			// https://leafletjs.com/reference-1.3.4.html#event-objects
			var oMarkerGroup = event.target, // event.target === that.markerGroup
				oMarker = event.sourceTarget, // or: event.propagatedFrom (event.layer is deprecated)
				oPopup = oMarkerGroup.getPopup(),
				iOldPopupSourceId = that.iPopupSourceId,
				oOldMarker;

			that.iPopupSourceId = oMarkerGroup.getLayerId(oMarker); // marker with popup id

			if (iOldPopupSourceId && iOldPopupSourceId !== that.iPopupSourceId) { // old marker id different from current marker?
				oOldMarker = oMarkerGroup.getLayer(iOldPopupSourceId);
				if (oOldMarker && oOldMarker.listens("dragstart")) {
					oOldMarker.off(mMarkerDragListener);
					if (gDebug) {
						gDebug.log("DEBUG: drag events removed from old marker id " + iOldPopupSourceId);
					}
				}
			}

			// set drag binding on clicked marker, if not done already
			if (oPopup.isOpen()) {
				if (!oMarker.listens("dragstart")) {
					oMarker.on(mMarkerDragListener);
					if (gDebug) {
						gDebug.log("DEBUG: drag events set to marker id " + that.iPopupSourceId);
					}
				}

				oPopup.setContent(that.privGetPopupContent(oMarker));
			} else if (oMarker.listens("dragstart")) { // not really needed to check
				oMarker.off(mMarkerDragListener);
				if (gDebug) {
					gDebug.log("DEBUG: drag events removed from marker id " + that.iPopupSourceId);
				}
			}
		});
	},

	privSetPolyline: function (path) {
		var aLayers = this.polylineGroup.getLayers(),
			mPolylineOptions, oPolyline;

		if (aLayers.length) {
			oPolyline = aLayers[0];
			oPolyline.setLatLngs(path);
		} else {
			mPolylineOptions = {
				color: "blue", // "red", // default: #3388FF
				weight: 2, // default: 3
				opacity: 0.7 // default: 1
			};
			oPolyline = new L.Polyline(path, mPolylineOptions);
			oPolyline.addTo(this.polylineGroup);
		}
	},

	addMarkers: function (aList) {
		var	aPath = [],
			i, oItem, oMarker, oPosition, aLayers, oPopup;

		oPopup = this.markerGroup.getPopup();
		aLayers = this.markerGroup.getLayers();
		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = MapProxy.Leaflet.position2leaflet(oItem.position);
			aPath.push(oPosition);
			if (!this.aMarkerPool[i]) {
				oMarker = new L.Marker(oPosition, {
					draggable: true,
					label: oItem.label,
					icon: new L.DivIcon({
						html: oItem.label,
						iconSize: [16, 16] // eslint-disable-line array-element-newline
					})
				});
				oMarker.bindTooltip(oItem.title);
				this.aMarkerPool[i] = oMarker;
			} else {
				oMarker = this.aMarkerPool[i];
				oMarker.options.label = oItem.label;
				oMarker.getTooltip().setContent(oItem.title);
				oMarker.setLatLng(oPosition);
				if (oPopup && oPopup.isOpen() && this.markerGroup.getLayerId(oMarker) === this.iPopupSourceId) {
					oPopup.setLatLng(oPosition);
					oPopup.setContent(this.privGetPopupContent(oMarker));
				}
			}

			if (i >= aLayers.length) {
				oMarker.addTo(this.markerGroup);
			}
		}
		this.privSetPolyline(aPath);
	},
	deleteMarkers: function () {
		var oPopup = this.markerGroup.getPopup();

		if (oPopup && oPopup.isOpen()) {
			oPopup.remove();
		}
		this.markerGroup.clearLayers();
		this.polylineGroup.clearLayers();
	},
	setMap: function (map) {
		var oBounds;

		if (map) {
			oBounds = this.markerGroup.getBounds();
			if (oBounds.isValid()) {
				map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			} else {
				window.console.warn("bounds are not vaild.");
			}
			this.polylineGroup.addTo(map.privGetMap());
			this.markerGroup.addTo(map.privGetMap());
		} else if (this.map) {
			this.markerGroup.removeFrom(this.map.privGetMap());
			this.polylineGroup.removeFrom(this.map.privGetMap());
		}
		this.map = map;
	},
	fitBounds: function () {
		var oBounds;

		if (this.map) {
			oBounds = this.markerGroup.getBounds();
			if (oBounds.isValid()) {
				this.map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			}
		}
	},
	privGetPopupContent: function (oLeafletMarker) {
		var oMarkerGroup = this.markerGroup, // event.target === that.markerGroup
			oMarker, aMarkers, oPreviousLeafletMarker, oPreviousMarker,	sContent, iIndex;

		oMarker = {
			title: oLeafletMarker.getTooltip().getContent(), // title
			position: MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng())
		};
		aMarkers = oMarkerGroup.getLayers();
		iIndex = aMarkers.indexOf(oLeafletMarker);
		if (iIndex >= 1) { // not the first one?
			oPreviousLeafletMarker = aMarkers[iIndex - 1];
			oPreviousMarker = {
				title: oPreviousLeafletMarker.getTooltip().getContent(),
				position: MapProxy.Leaflet.leaflet2position(oPreviousLeafletMarker.getLatLng())
			};
		}
		sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(oMarker, oPreviousMarker) : "";
		return sContent;
	}
};
// end
