// MapProxy.Leaflet.js - MapProxy.Leaflet for GCFiddle
// https://leafletjs.com/reference-1.3.0.html
//
/* globals MapProxy, Utils, LatLng, L */ // make ESlint happy

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
	/*
	setZoom: function (zoom) {
		this.map.setZoom(zoom);
	},
	*/
	setCenter: function (position) {
		this.map.setView(MapProxy.Leaflet.position2leaflet(position), this.options.zoom);
	},
	/*
	fitBounds: function (bounds) {
		this.map.fitBounds(bounds.getBounds(), {
			padding: [10, 10] // eslint-disable-line array-element-newline
		});
	},
	*/
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
						oPopup = that.featureGroup.getPopup();

					if (oPopup.isOpen()) {
						oPopup.openOn(oLeafletMarker); // reopen during drag
						if (!oLeafletMarker.getPopup()) {
							oLeafletMarker.bindPopup(oPopup);
						}
					}
				},
				drag: function (event) {
					var oLeafletMarker = event.target,
						oPopup = that.featureGroup.getPopup();

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
		this.iPopupSourceId = null; // current marker with popup
		this.featureGroup = L.featureGroup(); // for the markers
		this.polylineGroup = L.featureGroup(); // for the polyline

		oNewPopup = new L.Popup();
		this.featureGroup.bindPopup(oNewPopup).on("click", function (event) {
			// https://leafletjs.com/reference-1.3.4.html#event-objects
			var oFeatureGroup = event.target, // event.target === that.featuregroup
				oMarker = event.sourceTarget, // or: event.propagatedFrom (event.layer is deprecated)
				oPopup = oFeatureGroup.getPopup(),
				iOldPopupSourceId = that.iPopupSourceId,
				oOldMarker;

			that.iPopupSourceId = oFeatureGroup.getLayerId(oMarker); // marker with popup id

			if (iOldPopupSourceId && iOldPopupSourceId !== that.iPopupSourceId) { // old marker id different from current marker?
				oOldMarker = oFeatureGroup.getLayer(iOldPopupSourceId);
				if (oOldMarker && oOldMarker.listens("dragstart")) {
					oOldMarker.off(mMarkerDragListener); //TTT remove events (the popup closes also when clickingsomewhere else, then they will be kept active)
					window.console.log("DEBUG: drag events removed from old marker " + iOldPopupSourceId);
				}
			}

			// set drag binding on clicked marker, if not done already
			if (oPopup.isOpen()) {
				if (!oMarker.listens("dragstart")) {
					//old: oLeafletMarker.on("dragstart", that.privOnDragStart.bind(that)).on("drag", that.privOnDrag.bind(that)).on("dragend", that.privOnDragEnd.bind(that)); /check Onject.bind)
					oMarker.on(mMarkerDragListener);
					window.console.log("DEBUG: drag events set to marker " + that.iPopupSourceId);
				}

				oPopup.setContent(that.privGetPopupContent(oMarker));
			} else if (oMarker.listens("dragstart")) { // not really needed to check
				oMarker.off(mMarkerDragListener); //TTT remove events (the popup closes also when clickingsomewhere else, then they will be kept active)
				window.console.log("DEBUG: drag events removed from marker " + that.iPopupSourceId);
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

	/*
	privOnDragStart: function (event) {
		var oLeafletMarker = event.target,
			oPopup = this.featureGroup.getPopup();

		if (oPopup.isOpen()) {
			oPopup.openOn(oLeafletMarker); // reopen during drag
			if (!oLeafletMarker.getPopup()) {
				oLeafletMarker.bindPopup(oPopup);
			}
		}
	},
	privOnDrag: function (event) {
		var oLeafletMarker = event.target,
			oPopup = this.featureGroup.getPopup();

		if (oPopup.isOpen()) {
			oPopup.setContent(this.privGetPopupContent(oLeafletMarker));
		}
	},
	privOnDragEnd: function (event) {
		var oLeafletMarker = event.target;

		if (oLeafletMarker.getPopup()) {
			oLeafletMarker.unbindPopup();
		}
	},
	*/

	addMarkers: function (aList) {
		var	aPath = [],
			i, oItem, oMarker, oPosition, aLayers, oPopup;

		oPopup = this.featureGroup.getPopup();
		/*
		if (!oPopup.isOpen()) {
			oPopup = null; // oPopup is <> null if it exists and is open
		}
		*/

		aLayers = this.featureGroup.getLayers();
		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = MapProxy.Leaflet.position2leaflet(oItem.position);
			aPath.push(oPosition);
			if (i >= aLayers.length) {
				oMarker = new L.Marker(oPosition, {
					draggable: true,
					label: oItem.label,
					icon: new L.DivIcon({
						html: oItem.label,
						iconSize: [16, 16] // eslint-disable-line array-element-newline
					})
				});

				oMarker.bindTooltip(oItem.title);
				/* moved to click event
				if (oPopup) { // we need to bind the drag events to every marker
					if (Object.bind) {
						oMarker.on("dragstart", this.privOnDragStart.bind(this)).on("drag", this.privOnDrag.bind(this)).on("dragend", this.privOnDragEnd.bind(this));
					}
				}
				*/

				oMarker.addTo(this.featureGroup);
				// leafLetId = this.featureGroup.getLayerId(oMarker); this.featureGroup.getLayer(leafLetId);
			} else {
				oMarker = aLayers[i];
				oMarker.options.label = oItem.label;
				oMarker.getTooltip().setContent(oItem.title);

				oMarker.setLatLng(oPosition);

				if (oPopup && oPopup.isOpen() && this.featureGroup.getLayerId(oMarker) === this.iPopupSourceId) {
					oPopup.setLatLng(oPosition);
					oPopup.setContent(this.privGetPopupContent(oMarker));
				}
			}
		}
		this.privSetPolyline(aPath);
	},
	deleteMarkers: function () {
		this.featureGroup.clearLayers(); // delete markers
		//TODO: put markers in a marker pool and reuse?
		this.polylineGroup.clearLayers(); // and polyline
	},
	/*
	getMap: function () {
		return this.map;
	},
	*/
	setMap: function (map) {
		var oBounds;

		if (map) {
			oBounds = this.featureGroup.getBounds();
			if (oBounds.isValid()) {
				map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			} else {
				window.console.warn("bounds are not vaild.");
			}
			this.polylineGroup.addTo(map.privGetMap());
			this.featureGroup.addTo(map.privGetMap());
		} else if (this.map) {
			this.featureGroup.removeFrom(this.map.privGetMap());
			this.polylineGroup.removeFrom(this.map.privGetMap());
		}
		this.map = map;
	},
	fitBounds: function () {
		var oBounds;

		if (this.map) {
			oBounds = this.featureGroup.getBounds();
			if (oBounds.isValid()) {
				this.map.privGetMap().fitBounds(oBounds, {
					padding: [10, 10] // eslint-disable-line array-element-newline
				});
			}
		}
	},
	privGetPopupContent: function (oLeafletMarker) {
		var oFeatureGroup = this.featureGroup, // event.target === that.featuregroup
			oMarker, aMarkers, oPreviousLeafletMarker, oPreviousMarker,	sContent, iIndex;

		oMarker = {
			title: oLeafletMarker.getTooltip().getContent(), // title
			position: MapProxy.Leaflet.leaflet2position(oLeafletMarker.getLatLng())
		};
		aMarkers = oFeatureGroup.getLayers();
		iIndex = aMarkers.indexOf(oLeafletMarker);
		if (iIndex >= 1) { // not the first one?
			oPreviousLeafletMarker = aMarkers[iIndex - 1];
			oPreviousMarker = {
				title: oPreviousLeafletMarker.getTooltip().getContent(), // title
				position: MapProxy.Leaflet.leaflet2position(oPreviousLeafletMarker.getLatLng())
			};
		}
		//sContent = this.privGetInfoWindowContent2(oMarker, oPreviousMarker);
		sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(oMarker, oPreviousMarker) : "";
		return sContent;
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
	/*
	, deleteFeatureGroup: function () {
		this.deleteMarkers();
		this.polyLine = null;
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
	}
	*/
};
// end
