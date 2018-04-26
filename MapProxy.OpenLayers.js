// MapProxy.OpenLayers.js - MapProxy for OpenLayers
//
/* globals MapProxy, Utils, OpenLayers */ // make ESlint happy

"use strict";

MapProxy.OpenLayers = { };

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
		sUrl = this.options.openLayersUrl.replace(/^http(s)?:/, sProtocol);
		Utils.loadScript(sUrl, function () {
			var bHidden;

			window.console.log("OpenLayers " + OpenLayers.VERSION_NUMBER + " loaded (" + sUrl + ")");
			that.div = document.getElementById(that.options.mapDivId);

			bHidden = Utils.setHidden(that.options.mapDivId, false); // make sure canvas is not hidden
			that.map = new OpenLayers.Map(that.options.mapDivId, { });
			Utils.setHidden(that.options.mapDivId, bHidden); // restore
			that.doInit2();
			if (that.options.onload) {
				that.options.onload(that);
			}
		});
	},
	doInit2: function () {
		var that = this,
			oMarkers, oLines;

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
			featureselected: function(event) {
				var oInternalMarker = event.feature,
					oMarker, oInfoWindow;

				oMarker = that.getRegisteredMarker(oInternalMarker.id);
				oInfoWindow = oMarker.options.infoWindow;

				if (oInfoWindow) {
					oInfoWindow.setContent(oMarker);
					oInfoWindow.open(oMarker.getMap(), oMarker);
				}
			},
			featureunselected: function(event) {
				var oInternalMarker = event.feature,
					oMarker, oInfoWindow;

				oMarker = that.getRegisteredMarker(oInternalMarker.id);
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
				onDrag: function(internalMarker) {
					var oMarker = that.getRegisteredMarker(internalMarker.id),
						oTransformedPosition = oMarker.getPosition(), // new (transformed) position
						oPosition2 = oTransformedPosition.clone().transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326")), // transform back
						oInfoWindow = oMarker.options.infoWindow;

					oMarker.setSimplePosition({ // or: new LatLng(oPosition2.lat, oPosition2.lon)
						lat: oPosition2.lat,
						lng: oPosition2.lon
					});
					if (oInfoWindow && oInfoWindow.getAnchor() === oMarker) {
						oInfoWindow.setContent(oMarker);
						oInfoWindow.setPosition(oTransformedPosition);
					}
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
	getDiv: function () {
		return this.div;
	},
	setCenter: function (position) {
		this.map.setCenter(position);
	},
	fitBounds: function (bounds) {
		return this.map.zoomToExtent(bounds.getBounds());
	},
	resize: function () {
		// maybe not needed
	},
	getMap: function () {
		return this.map;
	},
	registerMarker: function (marker) {
		this.registeredMarkers[marker.marker.id] = marker;
	},
	deRegisterMarker: function (marker) {
		delete this.registeredMarkers[marker.marker.id];
	},
	getRegisteredMarker: function (id) {
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
		this.bounds.extend(position);
	}
};


MapProxy.OpenLayers.Marker = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Marker.prototype = {
	init: function (options) {
		var oPosition, oTransformedPosition;

		this.options = Utils.objectAssign({	}, options);
		oPosition = this.options.position;
		oTransformedPosition = new OpenLayers.LonLat(oPosition.lng, oPosition.lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));

		this.marker = new OpenLayers.Feature.Vector(
			new OpenLayers.Geometry.Point(oTransformedPosition.lon, oTransformedPosition.lat),
			{ // attributes
				position: oPosition,
				title: this.options.title,
				label: this.options.label
			}
		);
		this.map = options.map;
		if (this.map) {
			this.map.registeredMarker(this);
		}
	},
	getTitle: function () {
		return this.marker.attributes.title;
	},
	setTitle: function (title) {
		this.marker.attributes.title = title;
	},
	getLabel: function () {
		return this.marker.attributes.label;
	},
	setLabel: function (label) {
		this.marker.attributes.label = label;
	},
	getSimplePosition: function () {
		return this.marker.attributes.position;
	},
	setSimplePosition: function (position) {
		this.marker.attributes.position = position;
	},
	getPosition: function () {
		var oPosition = this.marker.geometry;

		return new OpenLayers.LonLat(oPosition.x, oPosition.y); // transformed position
	},
	setPosition: function (position) {
		var oLonLat = new OpenLayers.LonLat(position.lng, position.lat).transform(new OpenLayers.Projection("EPSG:4326"), this.map.getMap().getProjectionObject()),
			oInfoWindow;

		this.marker.move(oLonLat);
		this.setSimplePosition(position);

		oInfoWindow = this.options.infoWindow;
		if (oInfoWindow && oInfoWindow.getAnchor() === this) {
			oInfoWindow.setPosition(oLonLat);
		}
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oMarkers, oInfoWindow;

		if (map) {
			oMarkers = map.getMap().getLayersByName("Markers")[0];
			oMarkers.addFeatures(this.marker);
			map.registerMarker(this);
		} else if (this.map) { // delete map?
			oMarkers = this.map.getMap().getLayersByName("Markers")[0];
			oMarkers.removeFeatures(this.marker);
			this.map.deRegisterMarker(this);
			oInfoWindow = this.options.infoWindow;
			if (oInfoWindow && oInfoWindow.getAnchor() === this) {
				oInfoWindow.close();
			}
		}
		this.map = map;
	}
};


MapProxy.OpenLayers.Polyline = function (options) {
	this.init(options);
};

MapProxy.OpenLayers.Polyline.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({	}, options);
		this.polyline = new OpenLayers.Geometry.LineString(this.options);
		this.map = options.map;
	},
	setPath: function (aList) {
		var oPosition, oPoint, i;

		for (i = 0; i < aList.length; i += 1) {
			oPosition = aList[i];
			if (i >= this.polyline.components.length) {
				this.polyline.addPoint(new OpenLayers.Geometry.Point(oPosition.lon, oPosition.lat));
			} else {
				oPoint = this.polyline.components[i];
				oPoint.move(oPosition.lon - oPoint.x, oPosition.lat - oPoint.y);
			}
		}
		if (this.map) {
			this.map.getMap().getLayersByName("Lines")[0].redraw();
		}
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		var oLines,	oFeature;

		if (map) {
			oFeature = new OpenLayers.Feature.Vector(this.polyline, {}, this.options);
			oLines = map.getMap().getLayersByName("Lines")[0];
			oLines.addFeatures(oFeature);
		} else if (this.map) {
			oLines = this.map.getMap().getLayersByName("Lines")[0];
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
			fncloseBoxCallback = function(event) {
				that.close();
				OpenLayers.Event.stop(event);
			};

		this.options = Utils.objectAssign({	}, options);
		this.infoWindow = new OpenLayers.Popup.FramedCloud(null, null, null, null, null, true, fncloseBoxCallback);
	},
	setContent: function (marker) {
		var sContent = this.options.onGetInfoWindowContent ? this.options.onGetInfoWindowContent(marker) : "";

		this.infoWindow.setContentHTML('<div style="font-size:.8em">' + sContent + "</div>");
	},
	setPosition: function (lonlat) {
		this.infoWindow.lonlat = lonlat;
		this.infoWindow.updatePosition();
	},
	open: function (map, marker) {
		this.anchor1 = marker;
		this.infoWindow.lonlat = OpenLayers.LonLat.fromString(marker.marker.geometry.toShortString());
		map.getMap().addPopup(this.infoWindow);
		this.infoWindow.updateSize();
		this.map = map;
	},
	getMap: function() {
		return this.map;
	},
	getAnchor: function() {
		return this.anchor1;
	},
	close: function () {
		this.anchor1 = null;
		if (this.map) {
			this.map.getMap().removePopup(this.infoWindow);
		}
		// this.infoWindow.dispose() ?
	}
};
// end
