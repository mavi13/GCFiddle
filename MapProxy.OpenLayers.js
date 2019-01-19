// MapProxy.OpenLayers.js - MapProxy for OpenLayers
// http://dev.openlayers.org/releases/OpenLayers-2.13.1/doc/apidocs/files/OpenLayers-js.html
//
/* globals MapProxy, Utils, LatLng, OpenLayers */ // make ESlint happy

"use strict";

MapProxy.OpenLayers = {
	oProjectionEPSG4326: null, // geographic, set in init
	oProjectionEPSG900913: null, // spherical mercator, set in init

	position2openlayers: function (position) {
		var oPos = new OpenLayers.LonLat(position.lng, position.lat).transform(MapProxy.OpenLayers.oProjectionEPSG4326, MapProxy.OpenLayers.oProjectionEPSG900913);

		return oPos;
	},
	openlayers2position: function (position) {
		var oPos = position.clone().transform(MapProxy.OpenLayers.oProjectionEPSG900913, MapProxy.OpenLayers.oProjectionEPSG4326); // transform back

		return new LatLng(oPos.lat, oPos.lon);
	}
};

MapProxy.OpenLayers.Map = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Map.prototype = {
	init: function (options) {
		var that = this,
			sProtocol, sUrl;

		this.options = Utils.objectAssign({ }, options);
		this.registeredMarkers = {};
		sProtocol = (window.location.protocol === "https:") ? window.location.protocol : "http:";
		sUrl = this.options.openlayersUrl.replace(/^http(s)?:/, sProtocol);
		Utils.loadScript(sUrl, function () {
			var mapDivId = that.options.mapDivId,
				bHidden;

			window.console.log("OpenLayers " + OpenLayers.VERSION_NUMBER + " loaded (" + sUrl + ")");
			bHidden = Utils.setHidden(mapDivId, false); // make sure canvas is not hidden
			that.map = new OpenLayers.Map(mapDivId, { });
			Utils.setHidden(mapDivId, bHidden); // restore
			that.doInit2();

			that.featureGroup = new MapProxy.OpenLayers.FeatureGroup({
				onGetInfoWindowContent: options.onGetInfoWindowContent
			});

			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	doInit2: function () {
		var that = this,
			oMarkers, oLines;

		MapProxy.OpenLayers.oProjectionEPSG4326 = new OpenLayers.Projection("EPSG:4326"); // geographic
		MapProxy.OpenLayers.oProjectionEPSG900913 = new OpenLayers.Projection("EPSG:900913"); // spherical mercator

		oMarkers = new OpenLayers.Layer.Vector("Markers", {
			// http://docs.OpenLayers.org/library/feature_styling.html
			styleMap: new OpenLayers.StyleMap(
				{
					"default": {
						fillColor: "#FF5500",
						fillOpacity: 0.4,
						fontFamily: "Courier New, monospace",
						fontSize: "12px",
						fontWeight: "bold",
						label: "${label}",
						labelOutlineColor: "white",
						labelOutlineWidth: 3,
						pointRadius: 12,
						strokeColor: "#00FF00",
						strokeOpacity: 0.9,
						strokeWidth: 1,
						title: "${title}"
					},
					select: {
						strokeWidth: 3,
						pointRadius: 14
					}
				}
			)
		});

		oMarkers.events.on({
			featureselected: function (event) {
				var oInternalMarker = event.feature,
					oMarker, oInfoWindow;

				oMarker = that.privGetRegisteredMarker(oInternalMarker.id);
				oInfoWindow = oMarker.options.infoWindow;

				if (oInfoWindow) {
					oInfoWindow.setContent(that.getFeatureGroup().privGetPopupContent(oMarker));
					oInfoWindow.open(oMarker.getMap(), oMarker);
				}
			},
			featureunselected: function (event) {
				var oInternalMarker = event.feature,
					oMarker, oInfoWindow;

				oMarker = that.privGetRegisteredMarker(oInternalMarker.id);
				oInfoWindow = oMarker.options.infoWindow;
				if (oInfoWindow) {
					oInfoWindow.close();
				}
			}
		});

		oLines = new OpenLayers.Layer.Vector("Lines");

		this.map.addLayers([
			new OpenLayers.Layer.OSM("OSM", [ // use https now!
				"https://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
				"https://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
				"https://c.tile.openstreetmap.org/${z}/${x}/${y}.png"
			]),
			// new OpenLayers.Layer.OSM("OSM2", ["https://tile.openstreetmap.org/${z}/${x}/${y}.png"]), // also ok?
			new OpenLayers.Layer.OSM("OpenCycleMap", [ // needs also an API key
				"http://a.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
				"http://b.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
				"http://c.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png"
			]),
			oMarkers,
			oLines
		]);

		this.map.addControls([
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.Zoom(),
			new OpenLayers.Control.LayerSwitcher()
		]);

		if (OpenLayers.Control.DragFeature) { // add DragFeature before SelectFeature!
			this.map.addControl(new OpenLayers.Control.DragFeature(oMarkers, {
				autoActivate: true,
				onDrag: function (internalMarker) {
					var oMarker = that.privGetRegisteredMarker(internalMarker.id),
						oInfoWindow = oMarker.options.infoWindow,
						oPosition;

					if (oInfoWindow && oInfoWindow.getAnchor() === oMarker) {
						oPosition = oMarker.getPosition(); // update position
						oInfoWindow.setContent(that.getFeatureGroup().privGetPopupContent(oMarker));
						oInfoWindow.privSetPosition(oPosition);
					}
				},
				onComplete: function (internalMarker) { // on dragend
					var oMarker = that.privGetRegisteredMarker(internalMarker.id);

					oMarker.getPosition(); // update position (to detect change in setPosition)
				}
			}));
		}

		this.map.addControl(new OpenLayers.Control.SelectFeature(
			oMarkers, {
				toggle: true,
				toggleKey: "ctrlKey",
				autoActivate: true
			}
		));

		if (OpenLayers.Control.KeyboardDefaults) {
			this.map.addControl(new OpenLayers.Control.KeyboardDefaults()); // not in OpenLayers.light version
		}
		if (OpenLayers.Control.OverviewMap) {
			this.map.addControl(new OpenLayers.Control.OverviewMap()); // not in OpenLayers.light version
		}
	},
	getFeatureGroup: function () {
		return this.featureGroup;
	},
	setCenter: function (position) {
		this.map.setCenter(MapProxy.OpenLayers.position2openlayers(position));
	},
	fitBounds: function (bounds) {
		return this.map.zoomToExtent(bounds.getBounds());
	},
	resize: function () {
		// maybe not needed
	},
	privGetMap: function () {
		return this.map;
	},
	privRegisterMarker: function (marker) {
		this.registeredMarkers[marker.privGetMarker().id] = marker;
	},
	privUnregisterMarker: function (marker) {
		delete this.registeredMarkers[marker.privGetMarker().id];
	},
	privGetRegisteredMarker: function (id) {
		return this.registeredMarkers[id];
	}
};


MapProxy.OpenLayers.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.bounds = new OpenLayers.Bounds(options);
	},
	getBounds: function () {
		return this.bounds;
	},
	extend: function (position) {
		this.bounds.extend(MapProxy.OpenLayers.position2openlayers(position));
	}
};


MapProxy.OpenLayers.FeatureGroup = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.FeatureGroup.prototype = {
	init: function (options) {
		var oPolyLineOptions = {
			strokeColor: "red",
			strokeOpacity: 0.8,
			strokeWidth: 2
		};

		this.options = Utils.objectAssign({	}, options);
		this.aMarkerPool = [];
		this.aMarkers = [];
		this.polyLine = new MapProxy.OpenLayers.Polyline(oPolyLineOptions);
		this.infoWindow = new MapProxy.OpenLayers.InfoWindow();
	},
	addMarkers: function (aList) {
		//OpenLayers.Geometry.Collection() //CHECK
		var aMarkers = this.aMarkers,
			aPath = [],
			i, oItem, oPosition, oMarkerOptions, oMarker;

		for (i = 0; i < aList.length; i += 1) {
			oItem = aList[i];
			oPosition = oItem.position.clone();
			aPath.push(oPosition);
			if (!this.aMarkerPool[i]) {
				oMarkerOptions = Utils.objectAssign({}, oItem, {
					position: oPosition,
					infoWindow: this.infoWindow
				});
				oMarker = new MapProxy.OpenLayers.Marker(oMarkerOptions);
				this.aMarkerPool[i] = oMarker;
			} else {
				oMarker = this.aMarkerPool[i];
				oMarker.setLabel(oItem.label).setTitle(oItem.title).setPosition(oItem.position);
				if (this.infoWindow && this.infoWindow.getAnchor() === oMarker) {
					this.infoWindow.setContent(this.privGetPopupContent(oMarker));
				}
			}

			if (i >= aMarkers.length) {
				aMarkers.push(oMarker);
			}
		}

		if (this.polyLine) {
			this.polyLine.setPath(aPath);
		}
	},
	deleteMarkers: function () {
		var oSelectFeature;

		if (this.map) {
			oSelectFeature = this.map.privGetMap().getControlsByClass("OpenLayers.Control.SelectFeature")[0];
			oSelectFeature.unselectAll();
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
				oBounds = new MapProxy.OpenLayers.LatLngBounds();

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


MapProxy.OpenLayers.Marker = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Marker.prototype = {
	init: function (options) {
		var oMarkerOptions, oTransformedPosition;

		this.options = Utils.objectAssign({	}, options);
		oMarkerOptions = this.options;

		oTransformedPosition = MapProxy.OpenLayers.position2openlayers(oMarkerOptions.position);

		this.marker = new OpenLayers.Feature.Vector(
			new OpenLayers.Geometry.Point(oTransformedPosition.lon, oTransformedPosition.lat),
			oMarkerOptions //TTT attributes
			/*
			{ // attributes
				position: oMarkerOptions.oPosition, //TTT
				title: this.options.title,
				label: this.options.label
			}
			*/
		);
		this.map = options.map;
		if (this.map) {
			this.map.registeredMarker(this);
		}
	},

	getPosition: function () {
		var oPoint = this.marker.geometry,
			oPos = new OpenLayers.LonLat(oPoint.x, oPoint.y).transform(MapProxy.OpenLayers.oProjectionEPSG900913, MapProxy.OpenLayers.oProjectionEPSG4326); // transformed position;  MapProxy.OpenLayers.openlayers2position(oPos)

		this.options.position.setLatLng(oPos.lat, oPos.lon); // update position
		return this.options.position;
	},
	setPosition: function (position) {
		var oLonLat, oInfoWindow, oPoint;

		if (String(this.options.position) !== String(position)) {
			this.options.position = position.clone();
			oLonLat = MapProxy.OpenLayers.position2openlayers(position);
			if (this.marker.layer) { // marker visible on layer?
				this.marker.move(oLonLat);
			} else {
				oPoint = this.marker.geometry;
				oPoint.move(oLonLat.lon - oPoint.x, oLonLat.lat - oPoint.y);
			}
			oInfoWindow = this.options.infoWindow;
			if (oInfoWindow && oInfoWindow.getAnchor() === this) {
				oInfoWindow.privSetPosition(position);
			}
		}
		return this;
	},
	getTitle: function () {
		return this.options.title; // or: this.marker.attributes.title;
	},
	setTitle: function (title) {
		if (this.options.title !== title) {
			this.options.title = title;
			this.marker.attributes.title = title;
		}
		return this;
	},
	/*
	getLabel: function () {
		return this.marker.attributes.label;
	},
	*/
	setLabel: function (label) {
		if (this.options.label !== label) {
			this.options.label = label;
			this.marker.attributes.label = label;
		}
		return this;
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oMarkers, oInfoWindow;

		if (map) {
			oMarkers = map.privGetMap().getLayersByName("Markers")[0];
			oMarkers.addFeatures(this.marker);
			map.privRegisterMarker(this);
		} else if (this.map) { // delete map?
			oMarkers = this.map.privGetMap().getLayersByName("Markers")[0];
			oMarkers.removeFeatures(this.marker);
			this.map.privUnregisterMarker(this);
			oInfoWindow = this.options.infoWindow;
			if (oInfoWindow && oInfoWindow.getAnchor() === this) {
				oInfoWindow.close();
			}
		}
		this.map = map;
		return this;
	},
	privGetMarker: function () {
		return this.marker;
	},
	destroy: function () {
		this.marker.destroy();
	}
};


MapProxy.OpenLayers.Polyline = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Polyline.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({
			clickable: true
			// strokeColor: "red",
			// strokeOpacity: 0.8,
			// strokeWidth: 2
		}, options);
		this.polyline = new OpenLayers.Geometry.LineString(this.options); // cannot remove last 2 points from it
		this.map = options.map;
		this.aPointPool = [];
	},
	setPath: function (aList) {
		var oPosition, oPoint, i;

		for (i = 0; i < aList.length; i += 1) {
			oPosition = MapProxy.OpenLayers.position2openlayers(aList[i]);
			if (!this.aPointPool[i]) {
				oPoint = new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat);
				this.aPointPool[i] = oPoint;
			} else {
				oPoint = this.aPointPool[i];
				oPoint.move(oPosition.lon - oPoint.x, oPosition.lat - oPoint.y);
			}

			if (i >= this.polyline.components.length) {
				this.polyline.addPoint(oPoint);
			}
		}
		// remove additional points
		for (i = this.polyline.components.length - 1; i >= aList.length; i -= 1) {
			oPoint = this.polyline.components[i];
			this.polyline.removePoint(oPoint); // cannot remove last 2 points!
		}
		if (this.polyline.components.length > aList.length) { // more points left?
			this.polyline.components.length = aList.length; // throw them away
		}
		if (this.map) {
			this.map.privGetMap().getLayersByName("Lines")[0].redraw();
		}
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oLines,	oFeature;

		if (map) {
			oFeature = new OpenLayers.Feature.Vector(this.polyline, {}, this.options);
			oLines = map.privGetMap().getLayersByName("Lines")[0];
			oLines.addFeatures(oFeature);
		} else if (this.map) {
			oLines = this.map.privGetMap().getLayersByName("Lines")[0];
			oLines.removeAllFeatures();
		}
		this.map = map;
	}
};


MapProxy.OpenLayers.InfoWindow = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.InfoWindow.prototype = {
	init: function (options) {
		var that = this,
			fncloseBoxCallback = function (event) {
				that.close();
				OpenLayers.Event.stop(event);
			};

		this.options = Utils.objectAssign({	}, options);
		this.infoWindow = new OpenLayers.Popup.FramedCloud(null, null, null, null, null, true, fncloseBoxCallback);
	},
	setContent: function (sContent) {
		this.infoWindow.setContentHTML('<div style="font-size:.8em">' + sContent + "</div>");
	},
	privSetPosition: function (lonlat) {
		this.infoWindow.lonlat = MapProxy.OpenLayers.position2openlayers(lonlat);
		this.infoWindow.updatePosition();
	},
	open: function (map, marker) {
		this.anchor = marker;
		this.infoWindow.lonlat = OpenLayers.LonLat.fromString(marker.privGetMarker().geometry.toShortString());
		map.privGetMap().addPopup(this.infoWindow);
		this.infoWindow.updateSize();
		this.map = map;
	},
	getAnchor: function () {
		return this.anchor;
	},
	close: function () {
		this.anchor = null;
		if (this.map) {
			this.map.privGetMap().removePopup(this.infoWindow);
		}
	}
	// destroy not needed for infoWindow because it requires blocks to remove
};
// end
