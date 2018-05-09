// MapProxy.Simple.js - MapProxy.Simple for GCFiddle
//
/* globals MapProxy, Utils */ // make ESlint happy

"use strict";

MapProxy.Simple = { };

MapProxy.Simple.Map = function (options) {
	this.init(options);
};

MapProxy.Simple.Map.prototype = {
	init: function (options) {
		var mapDiv, bHidden, iWidth, iHeight, canvas, i;

		this.options = Utils.objectAssign({
			markerStyle: "green",
			textStyle: "black",
			lineStyle: "red",
			backgroundStyle: "#E6E6E6",
			zoom: 0 // not used
		}, options);
		mapDiv = document.getElementById(this.options.mapDivId);

		bHidden = Utils.setHidden(this.options.mapDivId, false); // make sure canvas is not hidden (allows to get width, height)
		iWidth = mapDiv.clientWidth;
		iHeight = mapDiv.clientHeight;
		Utils.setHidden(this.options.mapDivId, bHidden); // restore
		window.console.log("SimpleMap: width=" + iWidth + " height=" + iHeight + " created");

		this.aCanvas = [];
		for (i = 0; i <= 1; i += 1) {
			canvas = document.createElement("CANVAS");
			canvas.width = iWidth;
			canvas.height = iHeight;
			canvas.id = "canvas" + (i + 1);
			canvas.style.position = "absolute";
			mapDiv.appendChild(canvas);
			this.aCanvas.push(canvas);
		}

		this.oPixelMap = {
			width: iWidth * 8 / 10,
			height: iHeight * 8 / 10
			// will be extended by latBottom, latTop, lngLeft, lngRight in fitBounds()
		};
		if (this.options.onload) {
			this.options.onload(this);
		}
	},
	setZoom: function (zoom) {
		this.zoom = zoom;
	},
	setCenter: function (/* position */) {
		// currently empty
	},
	// https://stackoverflow.com/questions/18838915/convert-lat-lon-to-pixel-coordinate
	// (stretched) Mercator projection
	// map={width, height, latBottom, latTop, lngLeft, lngRight}
	myConvertGeoToPixel: function (position, map) {
		var lat = Utils.toRadians(position.lat),
			lng = Utils.toRadians(position.lng),
			south = Utils.toRadians(map.latBottom),
			north = Utils.toRadians(map.latTop),
			west = Utils.toRadians(map.lngLeft),
			east = Utils.toRadians(map.lngRight),
			mercY = function(lat1) {
				return Math.log(Math.tan(lat1 / 2 + Math.PI / 4));
			},
			ymin = mercY(south),
			ymax = mercY(north),
			xFactor = map.width / ((east - west) || 1),
			yFactor = map.height / ((ymax - ymin) || 1),
			x,
			y;

		x = lng;
		y = mercY(lat);
		x = (x - west) * xFactor;
		y = (ymax - y) * yFactor; // y points south
		return {
			x: x,
			y: y
		};
	},
	privDrawPath: function (path, lineStyle) {
		var context, i, oPos,
			strokeStyle = lineStyle || this.options.lineStyle,
			iLineWidth = 1,
			canvas = this.aCanvas[0];

		if (path.length) {
			context = canvas.getContext("2d");
			if (strokeStyle !== this.options.backgroundStyle) {
				context.save();
				context.translate((canvas.width - this.oPixelMap.width) / 2, (canvas.height - this.oPixelMap.height) / 2);
				context.strokeStyle = strokeStyle;
				context.lineWidth = iLineWidth;
				context.beginPath();
				for (i = 0; i < path.length; i += 1) {
					oPos = this.myConvertGeoToPixel(path[i], this.oPixelMap);
					if (i === 0) {
						context.moveTo(oPos.x, oPos.y);
					} else {
						context.lineTo(oPos.x, oPos.y);
					}
				}
				context.stroke();
				context.restore();
			} else {
				context.clearRect(0, 0, canvas.width, canvas.height); // we simply clear all
			}
		}
	},
	privDrawMarker: function (marker, markerStyle, textStyle) {
		var context, oPos,
			strokeStyle = markerStyle || this.options.markerStyle,
			fillStyle = textStyle || this.options.textStyle,
			iRadius = 10,
			iLineWidth = 1,
			canvas = this.aCanvas[1];

		oPos = this.myConvertGeoToPixel(marker.position, this.oPixelMap);

		context = canvas.getContext("2d");
		context.save();
		context.translate((canvas.width - this.oPixelMap.width) / 2, (canvas.height - this.oPixelMap.height) / 2);
		if (strokeStyle !== this.options.backgroundStyle) {
			context.strokeStyle = strokeStyle;
			context.lineWidth = iLineWidth;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.font = "14px sans-serif";
			context.fillStyle = fillStyle;

			context.beginPath();
			context.arc(oPos.x, oPos.y, iRadius, 0, 2 * Math.PI);
			context.fillText(marker.label, oPos.x, oPos.y);
			context.stroke();
		} else {
			iRadius += Math.ceil(iLineWidth / 2);
			context.clearRect(oPos.x - iRadius, oPos.y - iRadius, iRadius * 2, iRadius * 2);
		}
		context.restore();
	},
	fitBounds: function (bounds) {
		var oBounds = bounds.getBounds();

		// We do no redraw here. Please clear, redraw if needed
		Utils.objectAssign(this.oPixelMap, oBounds);
	},
	resize: function () {
		// maybe not needed
	}
};


MapProxy.Simple.LatLngBounds = function (options) {
	this.init(options);
};

MapProxy.Simple.LatLngBounds.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({
			latBottom: Number.MAX_VALUE,
			latTop: Number.MIN_VALUE,
			lngLeft: Number.MAX_VALUE,
			lngRight: Number.MIN_VALUE
		}, options); // latBottom, latTop, lngLeft, lngRight
	},
	getBounds: function () {
		return this.options;
	},
	extend: function (position) {
		var oBounds = this.options;

		oBounds.latBottom = Math.min(oBounds.latBottom, position.lat);
		oBounds.latTop = Math.max(oBounds.latTop, position.lat);
		oBounds.lngLeft = Math.min(oBounds.lngLeft, position.lng);
		oBounds.lngRight = Math.max(oBounds.lngRight, position.lng);
	}
};


MapProxy.Simple.Marker = function (options) {
	this.init(options);
};

MapProxy.Simple.Marker.prototype = {
	init: function (options) {
		Utils.objectAssign(this, options); // position, title, label, map
	},
	getPosition: function () {
		return this.position;
	},
	setPosition: function (position) {
		if (this.position.lat !== position.lat || this.position.lng !== position.lng) {
			if (this.map) {
				this.map.privDrawMarker(this, this.map.options.backgroundStyle, this.map.options.backgroundStyle); // old marker
			}
			this.position = position;
			if (this.map) {
				this.map.privDrawMarker(this); // new marker
			}
		}
	},
	getTitle: function () {
		return this.title;
	},
	setTitle: function (title) {
		this.title = title;
	},
	getLabel: function () {
		return this.label;
	},
	setLabel: function (label) {
		this.label = label;
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		if (this.map) {
			this.map.privDrawMarker(this, this.map.options.backgroundStyle, this.map.options.backgroundStyle); // old marker
		}
		this.map = map;
		if (this.map) {
			this.map.privDrawMarker(this); // new marker
		}
	}
};


MapProxy.Simple.Polyline = function (options) {
	this.init(options);
};

MapProxy.Simple.Polyline.prototype = {
	init: function (options) {
		this.map = options.map;
		this.strokeColor = options.strokeColor;
		// MyPolyline: options={map, strokeColor, strokeOpacity, strokeWeight}
	},
	setPath: function (path) {
		if (this.map) {
			if (this.path) {
				this.map.privDrawPath(this.path, this.map.options.backgroundStyle); // old path: background (draw over old path)
			}
			this.map.privDrawPath(path, this.strokeColor); // new path
		}
		this.path = path;
	},
	getMap: function () {
		return this.map;
	},
	setMap: function (map) {
		if (this.map && this.path) {
			this.map.privDrawPath(this.path, this.map.options.backgroundStyle); // old path: background (draw over old path)
		}
		this.map = map;
		if (this.map && this.path) {
			this.map.privDrawPath(this.path, this.strokeColor); // new path
		}
	}
};


MapProxy.Simple.InfoWindow = function (options) { // not yet implemented
	this.init(options);
};

MapProxy.Simple.InfoWindow.prototype = {
	init: function (options) {
		this.options = Utils.objectAssign({}, options);
	},
	setContent: function (path) {
		this.path = path;
	},
	getAnchor: function () {
		return this.anchor;
	},
	open: function (map, marker) {
		this.anchor = marker;
	},
	close: function () {
		this.anchor = null;
	}
};
// end
