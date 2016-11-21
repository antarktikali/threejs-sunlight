SunLight = function (
		coordinates_,
		north_,
		east_,
		nadir_,
		sun_distance_ = 1.0
	) {
	THREE.Object3D.call( this );
	this.type = "SunLight";

	// Latitude and longtitude of the current location on the world
	// Measured as decimal degrees. North and east is positive
	this.coordinates = new THREE.Vector2();
	this.coordinates.copy( coordinates_ );

	// The unit vector that is pointing the north in the scene
	this.north = new THREE.Vector3();
	this.north.copy( north_ );

	// The unit vector that is pointing the east in the scene
	this.east = new THREE.Vector3();
	this.east.copy( east_ );

	// The unit vector that is pointing the ground in the scene, same as gravity
	this.nadir = new THREE.Vector3();
	this.nadir.copy( nadir_ );

	// The distance of the directional light from this object and it's target.
	// the given north vector is multiplied with this value and the resulting
	// vector is the displacement of the directional light from the target.
	this.sun_distance = sun_distance_;

	// The azimuth of the sun. Starts from the north, clockwise. In radians.
	this.azimuth = 0.0;
	// The elevation of the sun. Starts from the horizon. In radians.
	this.elevation = 0.0;

	// Local date and time
	this.localDate = new Date();

	// The directional light in Three.js is managed by a directional vector.
	// To make life easier, I'm adding the light as a child to this hinge object
	// and rotating this object in order to set the light's direction
	this.hingeObject = new THREE.Object3D();
	this.add( this.hingeObject );

	// The directional light which is used as the sun light
	this.directionalLight = new THREE.DirectionalLight(); 
	this.directionalLight.castShadow = true;
	this.hingeObject.add( this.directionalLight );

	// Add the target of the directional light as a child to this object, so
	// that it's world matrix gets updated automatically when this object's
	// position is changed.
	this.add( this.directionalLight.target );
};

SunLight.prototype = Object.assign(
	Object.create( THREE.Object3D.prototype ),
	{
		constructor: SunLight,

		toJSON: function ( meta ) {
			var data = THREE.Object3D.prototype.toJSON.call( this, meta );
			// TODO
			// not implemented yet
			return data;
		}
	} );

// Updates the orientation of the sun using the coordinates and the localDate
SunLight.prototype.updateOrientation = function ( update_date_ = true ) {
	// Update the local date if the parameter is true (true by default).
	if ( update_date_ ) { 
		this.localDate = new Date();
	}

	var solarOrientationCalculator = new this.SolarOrientationCalculator();

	var sunOrientation = solarOrientationCalculator.getAzEl(
			this.coordinates.x,
			this.coordinates.y,
			this.localDate
		);
	this.azimuth = this._degreesToRadians( sunOrientation.azimuth );
	this.elevation = this._degreesToRadians( sunOrientation.elevation );
}

// Updates the directional light based on the sun's orientation and the north
// vector. This is actually done by rotating the hinge object which is the
// parent of the directional light.
SunLight.prototype.updateDirectionalLight = function () {
	// If the elevation is less than zero, there is no sun light.
	// Starting from 2 degrees, start fading the light
	var FADE_OUT_THRESHOLD = 2.0;
	var elevationDegrees = (180.0 * this.elevation / Math.PI );
	if ( elevationDegrees <= 0.0 ) {
		this.directionalLight.intensity = 0.0;
		return;
	} else if ( elevationDegrees <= FADE_OUT_THRESHOLD) {
		this.directionalLight.intensity = elevationDegrees / FADE_OUT_THRESHOLD;
	} else {
		this.directionalLight.intensity = 1.0;
	}
	// Reset the hingeObject's quaternion
	this.hingeObject.quaternion.copy( new THREE.Quaternion() );

	this.directionalLight.position.copy( this.north );
	this.directionalLight.position.multiplyScalar( this.sun_distance );
	var rotator = new THREE.Quaternion();
	rotator.setFromAxisAngle( this.east, this.elevation );
	this.hingeObject.quaternion.premultiply( rotator );
	rotator.setFromAxisAngle( this.nadir, this.azimuth );
	this.hingeObject.quaternion.premultiply( rotator );
}

SunLight.prototype._degreesToRadians = function ( degrees_ ) {
	return ( degrees_ % 360.0 ) * Math.PI / 180.0;
}

// ---
// Methods for calculating the Sun's orientation go below
// ---

SunLight.prototype.SolarOrientationCalculator = function() {
	this.a = "some val";
}

SunLight.prototype.SolarOrientationCalculator.prototype.getAzEl =
	function( lat_, lon_, date_ = new Date() )
{
	var jday = this._getJD( date_ );
	var tl = this._getTimeLocal( date_ );
	var tz = date_.getTimezoneOffset() / -60;
	var dst = true;
	var total = jday + tl/1440.0 - tz/24.0;
	var T = this._calcTimeJulianCent( total );
	sunOrientation = this._calcAzEl( false, T, tl, lat_, lon_, tz );
	return sunOrientation;
}

SunLight.prototype.SolarOrientationCalculator.prototype._getJD = 
	function( date_ = new Date() )
{
	var docmonth = date_.getMonth() + 1;
	var docday = date_.getDate();
	var docyear = date_.getFullYear();
	if ( (this._isLeapYear(docyear)) && (docmonth == 2) ) {
		if (docday > 29) {
			docday = 29;
		} 
	} else {
		// 1900 is a known non-leap year
		if (docday > new Date(1900, docmonth, 0).getDate()) {
			docday = new Date(1900, docmonth, 0).getDate();
		}
	}
	if (docmonth <= 2) {
		docyear -= 1;
		docmonth += 12;
	}
	var A = Math.floor(docyear/100);
	var B = 2 - A + Math.floor(A/4);
	var JD = Math.floor(365.25*(docyear + 4716)) + 
		Math.floor(30.6001*(docmonth+1)) + docday + B - 1524.5;
	return JD;
}

// Returns the current time in minutes without the DST
SunLight.prototype.SolarOrientationCalculator.prototype._getTimeLocal = 
	function( date_ = new Date() )
{
	var totalMinutes = 0.0;
	totalMinutes += 60.0 * date_.getHours();
	// TODO
	// Remove one hour if DST is in effect
	totalMinutes += date_.getMinutes();
	totalMinutes += date_.getSeconds() / 60.0;
	return totalMinutes;
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcTimeJulianCent =
	function( jd )
{
	var T = (jd - 2451545.0)/36525.0;
	return T;
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcAzEl =
	function( output, T, localtime, latitude, longitude, zone )
{
	var result = { "azimuth": 0.0, "elevation": 0.0 };
	var eqTime = this._calcEquationOfTime(T);
	var theta  = this._calcSunDeclination(T);
	var solarTimeFix = eqTime + 4.0 * longitude - 60.0 * zone;
	var earthRadVec = this._calcSunRadVector(T);
	var trueSolarTime = localtime + solarTimeFix;
	while (trueSolarTime > 1440)
	{
		trueSolarTime -= 1440;
	}
	var hourAngle = trueSolarTime / 4.0 - 180.0;
	if (hourAngle < -180) 
	{
		hourAngle += 360.0;
	}
	var haRad = this._degToRad(hourAngle);
	var csz = Math.sin(this._degToRad(latitude)) *
		Math.sin(this._degToRad(theta)) + Math.cos(this._degToRad(latitude)) *
		Math.cos(this._degToRad(theta)) * Math.cos(haRad);
	if (csz > 1.0) 
	{
		csz = 1.0;
	} else if (csz < -1.0) 
	{ 
		csz = -1.0;
	}
	var zenith = this._radToDeg(Math.acos(csz));
	var azDenom = ( Math.cos(this._degToRad(latitude)) *
		Math.sin(this._degToRad(zenith)) );
	if (Math.abs(azDenom) > 0.001) {
		azRad = (( Math.sin(this._degToRad(latitude)) *
			Math.cos(this._degToRad(zenith)) ) -
			Math.sin(this._degToRad(theta))) / azDenom;
		if (Math.abs(azRad) > 1.0) {
			if (azRad < 0) {
				azRad = -1.0;
			} else {
				azRad = 1.0;
			}
		}
		var azimuth = 180.0 - this._radToDeg(Math.acos(azRad))
		if (hourAngle > 0.0) {
			azimuth = -azimuth;
		}
	} else {
		if (latitude > 0.0) {
			azimuth = 180.0;
		} else { 
			azimuth = 0.0;
		}
	}
	if (azimuth < 0.0) {
		azimuth += 360.0;
	}
	var exoatmElevation = 90.0 - zenith;

	// Atmospheric Refraction correction

	if (exoatmElevation > 85.0) {
		var refractionCorrection = 0.0;
	} else {
		var te = Math.tan(this._degToRad(exoatmElevation));
		if (exoatmElevation > 5.0) {
			var refractionCorrection = 58.1 / te - 0.07 / (te*te*te) +
				0.000086 / (te*te*te*te*te);
		} else if (exoatmElevation > -0.575) {
			var refractionCorrection = 1735.0 + exoatmElevation *
				(-518.2 + exoatmElevation * (103.4 + exoatmElevation *
					(-12.79 + exoatmElevation * 0.711) ) );
		} else {
			var refractionCorrection = -20.774 / te;
		}
		refractionCorrection = refractionCorrection / 3600.0;
	}

	var solarZen = zenith - refractionCorrection;

	result.azimuth = Math.floor(azimuth*100 +0.5)/100.0;
	result.elevation = Math.floor((90.0-solarZen)*100+0.5)/100.0;
	return result;
}

SunLight.prototype.SolarOrientationCalculator.prototype._isLeapYear = 
	function( yr )
{
  return ((yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0);
}

SunLight.prototype.SolarOrientationCalculator.prototype._radToDeg =
	function( angleRad )
{
  return (180.0 * angleRad / Math.PI);
}

SunLight.prototype.SolarOrientationCalculator.prototype._degToRad =
	function( angleDeg )
{
  return (Math.PI * angleDeg / 180.0);
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcEquationOfTime =
	function( t )
{
	var epsilon = this._calcObliquityCorrection(t);
	var l0 = this._calcGeomMeanLongSun(t);
	var e = this._calcEccentricityEarthOrbit(t);
	var m = this._calcGeomMeanAnomalySun(t);

	var y = Math.tan(this._degToRad(epsilon)/2.0);
	y *= y;

	var sin2l0 = Math.sin(2.0 * this._degToRad(l0));
	var sinm   = Math.sin(this._degToRad(m));
	var cos2l0 = Math.cos(2.0 * this._degToRad(l0));
	var sin4l0 = Math.sin(4.0 * this._degToRad(l0));
	var sin2m  = Math.sin(2.0 * this._degToRad(m));

	var Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 -
		0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
	return this._radToDeg(Etime)*4.0; // in minutes of time
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcSunDeclination =
	function( t )
{
	var e = this._calcObliquityCorrection(t);
	var lambda = this._calcSunApparentLong(t);

	var sint = Math.sin(this._degToRad(e)) * Math.sin(this._degToRad(lambda));
	var theta = this._radToDeg(Math.asin(sint));
	return theta; // in degree
}


SunLight.prototype.SolarOrientationCalculator.prototype._calcSunRadVector =
	function( t )
{
	var v = this._calcSunTrueAnomaly(t);
	var e = this._calcEccentricityEarthOrbit(t);
	var R = (1.000001018 * (1 - e * e)) /
		(1 + e * Math.cos(this._degToRad(v)));
	return R; // in AU
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcObliquityCorrection =
	function( t )
{
	var e0 = this._calcMeanObliquityOfEcliptic(t);
	var omega = 125.04 - 1934.136 * t;
	var e = e0 + 0.00256 * Math.cos(this._degToRad(omega));
	return e; // in degree
}


SunLight.prototype.SolarOrientationCalculator.prototype._calcSunApparentLong =
	function( t )
{
	var o = this._calcSunTrueLong(t);
	var omega = 125.04 - 1934.136 * t;
	var lambda = o - 0.00569 - 0.00478 * Math.sin(this._degToRad(omega));
	return lambda; // in degrees
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcGeomMeanLongSun = 
	function(t)
{
	var L0 = 280.46646 + t * (36000.76983 + t*(0.0003032));
	while(L0 > 360.0)
	{
		L0 -= 360.0;
	}
	while(L0 < 0.0)
	{
		L0 += 360.0;
	}
	return L0; // in degrees
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcEccentricityEarthOrbit = 
	function(t)
{
	var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
	return e; // unitless
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcGeomMeanAnomalySun = 
	function(t)
{
	var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
	return M; // in degrees
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcSunTrueAnomaly = 
	function(t)
{
	var m = this._calcGeomMeanAnomalySun(t);
	var c = this._calcSunEqOfCenter(t);
	var v = m + c;
	return v; // in degrees
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcMeanObliquityOfEcliptic = 
	function(t)
{
	var seconds = 21.448 - t*(46.8150 + t*(0.00059 - t*(0.001813)));
	var e0 = 23.0 + (26.0 + (seconds/60.0))/60.0;
	return e0; // in degrees
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcSunTrueLong = 
	function(t)
{
	var l0 = this._calcGeomMeanLongSun(t);
	var c = this._calcSunEqOfCenter(t);
	var O = l0 + c;
	return O; // in degrees
}

SunLight.prototype.SolarOrientationCalculator.prototype._calcSunEqOfCenter = 
	function(t)
{
	var m = this._calcGeomMeanAnomalySun(t);
	var mrad = this._degToRad(m);
	var sinm = Math.sin(mrad);
	var sin2m = Math.sin(mrad+mrad);
	var sin3m = Math.sin(mrad+mrad+mrad);
	var C = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m *
		(0.019993 - 0.000101 * t) + sin3m * 0.000289;
	return C; // in degrees
}

