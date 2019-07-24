// LatLng.js - LatLng...
//
// based on: http://www.movable-type.co.uk/scripts/latlong.html, https://github.com/chrisveness/geodesy
// Latitude/longitude spherical geodesy tools, (c) Chris Veness 2002-2016
//
/* globals */

"use strict";

var Utils;

if (typeof require !== "undefined") {
	Utils = require("./Utils.js"); // eslint-disable-line global-require
}

function LatLng(lat, lng) {
	this.init(lat, lng);
}

LatLng.toRadians = function (deg) {
	return deg * Math.PI / 180;
};

LatLng.toDegrees = function (rad) {
	return rad * 180 / Math.PI;
};

LatLng.prototype = {
	init: function (lat, lng) {
		this.setLatLng(lat, lng);
		// other properties: format, comment, error
	},
	clone: function () {
		var oClone = new LatLng(),
			sKey;

		for (sKey in this) {
			if (this.hasOwnProperty(sKey)) {
				oClone[sKey] = this[sKey];
			}
		}
		return oClone;
	},
	setLatLng: function (lat, lng) {
		this.lat = Number(lat);
		this.lng = Number(lng);
		return this;
	},
	getComment: function () {
		return (this.comment !== undefined) ? this.comment : "";
	},
	setComment: function (sComment) {
		this.comment = sComment;
		return this;
	},
	getFormat: function () {
		return this.format;
	},
	setFormat: function (sFormat) {
		this.format = sFormat;
		return this;
	},
	getError: function () {
		return this.error;
	},
	setError: function (sError) {
		this.error = sError;
		return this;
	},
	toString: function () {
		var aValues = [],
			sKey;

		// Object.values (only available since ES 2017)
		for (sKey in this) {
			if (this.hasOwnProperty(sKey)) {
				aValues.push(this[sKey]);
			}
		}
		return String(aValues);
	},
	distanceTo: function (point) {
		var radius = 6371e3,
			phi1 = LatLng.toRadians(this.lat),
			lambda1 = LatLng.toRadians(this.lng),
			phi2 = LatLng.toRadians(point.lat),
			lambda2 = LatLng.toRadians(point.lng),
			deltaphi = phi2 - phi1,
			deltalambda = lambda2 - lambda1,

			a = Math.sin(deltaphi / 2) * Math.sin(deltaphi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltalambda / 2) * Math.sin(deltalambda / 2),
			c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
			d = radius * c;

		return d;
	},
	bearingTo: function (point) {
		var phi1 = LatLng.toRadians(this.lat),
			phi2 = LatLng.toRadians(point.lat),
			deltalambda = LatLng.toRadians(point.lng - this.lng),

			// see http://mathforum.org/library/drmath/view/55417.html
			y = Math.sin(deltalambda) * Math.cos(phi2),
			x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltalambda),
			theta = Math.atan2(y, x);

		return (LatLng.toDegrees(theta) + 360) % 360;
	},
	destinationPoint: function (distance, bearing) {
		var radius = 6371000, // see http://www.edwilliams.org/avform.htm#LL (former: http://williams.best.vwh.net/avform.htm#LL)
			delta = Number(distance) / radius, // angular distance in radians
			theta = LatLng.toRadians(Number(bearing)),

			phi1 = LatLng.toRadians(this.lat),
			lambda1 = LatLng.toRadians(this.lng),

			sinphi1 = Math.sin(phi1),
			cosphi1 = Math.cos(phi1),
			sindelta = Math.sin(delta),
			cosdelta = Math.cos(delta),
			sintheta = Math.sin(theta),
			costheta = Math.cos(theta),

			sinphi2 = sinphi1 * cosdelta + cosphi1 * sindelta * costheta,
			phi2 = Math.asin(sinphi2),
			y = sintheta * sindelta * cosphi1,
			x = cosdelta - sinphi1 * sinphi2,
			lambda2 = lambda1 + Math.atan2(y, x);

		return new LatLng(LatLng.toDegrees(phi2), (LatLng.toDegrees(lambda2) + 540) % 360 - 180); // normalise to −180..+180°
	},
	intersection: function (p1, bearing1, p2, bearing2, bSuppressWarnings) { // no "this" used
		// see http://www.edwilliams.org/avform.htm#Intersection (former: http://williams.best.vwh.net/avform.htm#Intersection)
		var phi1 = LatLng.toRadians(p1.lat),
			lambda1 = LatLng.toRadians(p1.lng),
			phi2 = LatLng.toRadians(p2.lat),
			lambda2 = LatLng.toRadians(p2.lng),
			theta13 = LatLng.toRadians(Number(bearing1)),
			theta23 = LatLng.toRadians(Number(bearing2)),
			deltaphi = phi2 - phi1,
			deltalambda = lambda2 - lambda1,
			delta12, cosThetaa, cosThetab, thetaa, thetab, theta12, theta21, alpha1, alpha2, alpha3, delta13, phi3, deltalambda13, lambda3;

		delta12 = 2 * Math.asin(Math.sqrt(Math.sin(deltaphi / 2) * Math.sin(deltaphi / 2)
			+ Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltalambda / 2) * Math.sin(deltalambda / 2))); // distance

		if (delta12 === 0) {
			if (!bSuppressWarnings) {
				Utils.console.warn("intersection: distance=" + delta12);
			}
			return new LatLng(0, 0).setError("intersection distance=0");
		}

		// initial/final bearings between points
		cosThetaa = (Math.sin(phi2) - Math.sin(phi1) * Math.cos(delta12)) / (Math.sin(delta12) * Math.cos(phi1));
		cosThetab = (Math.sin(phi1) - Math.sin(phi2) * Math.cos(delta12)) / (Math.sin(delta12) * Math.cos(phi2));
		thetaa = Math.acos(Math.min(Math.max(cosThetaa, -1), 1)); // protect against rounding errors
		thetab = Math.acos(Math.min(Math.max(cosThetab, -1), 1)); // protect against rounding errors

		theta12 = Math.sin(lambda2 - lambda1) > 0 ? thetaa : 2 * Math.PI - thetaa;
		theta21 = Math.sin(lambda2 - lambda1) > 0 ? 2 * Math.PI - thetab : thetab;

		alpha1 = (theta13 - theta12 + Math.PI) % (2 * Math.PI) - Math.PI; // angle 2-1-3
		alpha2 = (theta21 - theta23 + Math.PI) % (2 * Math.PI) - Math.PI; // angle 1-2-3

		if (Math.sin(alpha1) === 0 && Math.sin(alpha2) === 0) {
			if (!bSuppressWarnings) {
				Utils.console.warn("intersection: infinite intersections");
			}
			return new LatLng(0, 0).setError("infinite intersections");
		}
		if (Math.sin(alpha1) * Math.sin(alpha2) < 0) {
			if (!bSuppressWarnings) {
				Utils.console.warn("intersection: ambiguous intersection");
			}
			return new LatLng(0, 0).setError("ambiguous intersection");
		}

		alpha3 = Math.acos(-Math.cos(alpha1) * Math.cos(alpha2) + Math.sin(alpha1) * Math.sin(alpha2) * Math.cos(delta12));
		delta13 = Math.atan2(Math.sin(delta12) * Math.sin(alpha1) * Math.sin(alpha2), Math.cos(alpha2) + Math.cos(alpha1) * Math.cos(alpha3));
		phi3 = Math.asin(Math.sin(phi1) * Math.cos(delta13) + Math.cos(phi1) * Math.sin(delta13) * Math.cos(theta13));
		deltalambda13 = Math.atan2(Math.sin(theta13) * Math.sin(delta13) * Math.cos(phi1), Math.cos(delta13) - Math.sin(phi1) * Math.sin(phi3));
		lambda3 = lambda1 + deltalambda13;

		return new LatLng(LatLng.toDegrees(phi3), (LatLng.toDegrees(lambda3) + 540) % 360 - 180); // normalise to −180..+180°
	},
	midpointTo: function (point) {
		var phi1 = LatLng.toRadians(this.lat),
			lambda1 = LatLng.toRadians(this.lng),
			phi2 = LatLng.toRadians(point.lat),
			deltaLambda = LatLng.toRadians(point.lng - this.lng),

			Bx = Math.cos(phi2) * Math.cos(deltaLambda),
			By = Math.cos(phi2) * Math.sin(deltaLambda),

			x = Math.sqrt((Math.cos(phi1) + Bx) * (Math.cos(phi1) + Bx) + By * By),
			y = Math.sin(phi1) + Math.sin(phi2),
			phi3 = Math.atan2(y, x),
			lambda3 = lambda1 + Math.atan2(By, Math.cos(phi1) + Bx);

		return new LatLng(LatLng.toDegrees(phi3), (LatLng.toDegrees(lambda3) + 540) % 360 - 180); // normalise to −180..+180°
	},
	parse: function (coord, bSuppressWarnings) {
		var lat = 0,
			lng = 0,
			sFormat, iCommentIndex, aParts, bParseOk;

		function dmm2position() {
			aParts = coord.match(/^\s*(N|S)\s*(\d+)\s*[° ]\s*(\d+\.\d+)\s*(E|W)\s*(\d+)\s*[° ]\s*(\d+\.\d+)/); // dmm
			if (aParts && aParts.length === 7) {
				lat = parseInt(aParts[2], 10) + parseFloat(aParts[3]) / 60;
				lng = parseInt(aParts[5], 10) + parseFloat(aParts[6]) / 60;
				if (aParts[1] === "S") {
					lat = -lat;
				}
				if (aParts[4] === "W") {
					lng = -lng;
				}
				sFormat = "dmm";
				return true;
			}
			return false;
		}

		function dms2position() {
			aParts = coord.match(/^\s*(N|S)\s*(\d+)\s*[° ]\s*(\d+)\s*'\s*(\d+\.?\d*)\s*"\s*(E|W)\s*(\d+)\s*[° ]\s*(\d+)\s*'\s*(\d+\.?\d*)\s*"/);
			if (aParts && aParts.length === 9) {
				lat = parseInt(aParts[2], 10) + parseFloat(aParts[3]) / 60 + parseFloat(aParts[4]) / 3600;
				lng = parseInt(aParts[6], 10) + parseFloat(aParts[7]) / 60 + parseFloat(aParts[8]) / 3600;
				if (aParts[1] === "S") {
					lat = -lat;
				}
				if (aParts[5] === "W") {
					lng = -lng;
				}
				sFormat = "dms";
				return true;
			}
			return false;
		}

		function dd2position() {
			aParts = coord.match(/^\s*(N|S)\s*(\d+\.\d+)\s*[° ]\s*(E|W)\s*(\d+\.\d+)\s*°?/);
			if (aParts && aParts.length === 5) {
				lat = parseFloat(aParts[2]);
				lng = parseFloat(aParts[4]);
				if (aParts[1] === "S") {
					lat = -lat;
				}
				if (aParts[3] === "W") {
					lng = -lng;
				}
				sFormat = "dd";
				return true;
			}
			return false;
		}

		iCommentIndex = coord.indexOf("!");
		if (iCommentIndex >= 0) {
			this.comment = coord.substr(iCommentIndex + 1);
			coord = coord.substr(0, iCommentIndex);
		} else if (this.comment !== undefined) { // comment was set?
			delete this.comment;
		}

		bParseOk = dmm2position() || dms2position() || dd2position();
		this.lat = lat;
		this.lng = lng;
		if (sFormat) {
			this.format = sFormat + ((this.comment) ? "c" : "");
		}
		delete this.error;
		if (!bParseOk && coord !== "") {
			this.error = "Cannot parse " + coord;
			if (!bSuppressWarnings) {
				Utils.console.warn("parse2position: Cannot parse '" + coord + "'");
			}
		}
		return this;
	},
	toFixed: function (iDigits) {
		this.lat = this.lat.toFixed(iDigits);
		this.lng = this.lng.toFixed(iDigits);
		return this;
	},
	toFormattedString: function (format, bSuppressWarnings) {
		var sValue, sComment;

		function position2dmm(position) {
			var lat = Math.abs(position.lat),
				lng = Math.abs(position.lng),
				latNS = (position.lat >= 0) ? "N" : "S",
				lngEW = (position.lng >= 0) ? "E" : "W",
				latdeg = Math.floor(lat),
				latmin = (lat - latdeg) * 60,
				lngdeg = Math.floor(lng),
				lngmin = (lng - lngdeg) * 60;

			return latNS + " " + Utils.strZeroFormat(latdeg, 2) + "° " + Utils.strZeroFormat(latmin.toFixed(3), 6) + " " + lngEW + " " + Utils.strZeroFormat(lngdeg, 3) + "° " + Utils.strZeroFormat(lngmin.toFixed(3), 6);
		}

		function position2dms(position) {
			var lat = Math.abs(position.lat),
				lng = Math.abs(position.lng),
				latNS = (position.lat >= 0) ? "N" : "S",
				lngEW = (position.lng >= 0) ? "E" : "W",
				latdeg = Math.floor(lat),
				latmin = Math.floor((lat - latdeg) * 60),
				latsec = Math.round((lat - latdeg - latmin / 60) * 1000 * 3600) / 1000,
				lngdeg = Math.floor(lng),
				lngmin = Math.floor((lng - lngdeg) * 60),
				lngsec = Math.floor((lng - lngdeg - lngmin / 60) * 1000 * 3600) / 1000;

			return latNS + " " + Utils.strZeroFormat(latdeg, 2) + "° " + Utils.strZeroFormat(latmin, 2) + "' " + Utils.strZeroFormat(latsec.toFixed(2), 5) + "\" "
				+ lngEW + " " + Utils.strZeroFormat(lngdeg, 3) + "° " + Utils.strZeroFormat(lngmin, 2) + "' " + Utils.strZeroFormat(lngsec.toFixed(2), 5) + "\"";
		}

		function position2dd(position) {
			var lat = position.lat,
				lng = position.lng,
				latNS = (lat >= 0) ? "N" : "S",
				lngEW = (lng >= 0) ? "E" : "W",
				sDD;

			if (latNS === "S") {
				lat = -lat;
			}
			if (lngEW === "W") {
				lng = -lng;
			}
			sDD = latNS + " " + Utils.strZeroFormat(lat.toFixed(5), 8) + "° " + lngEW + " " + Utils.strZeroFormat(lng.toFixed(5), 9) + "°";
			return sDD;
		}

		format = format || this.format || "dmm";
		if (format.charAt(format.length - 1) === "c") {
			format = format.substr(0, format.length - 1);
			sComment = this.getComment();
		}
		switch (format) {
		case "dmm":
			sValue = position2dmm(this);
			break;
		case "dms":
			sValue = position2dms(this);
			break;
		case "dd":
			sValue = position2dd(this);
			break;
		default:
			sValue = undefined; // undefined means unknown format
			if (!bSuppressWarnings) {
				Utils.console.warn("position2string: Unknown format: " + format);
			}
		}
		if (sComment) {
			sValue += "!" + sComment;
		}
		return sValue;
	}
};


if (typeof module !== "undefined" && module.exports) {
	module.exports = LatLng;
}
// end
