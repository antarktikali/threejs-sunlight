import * as THREE from 'three'

class SunLight extends THREE.Object3D {
    constructor(coordinates_, north_, east_, nadir_, sun_distance_ = 1.0) {
      super();
      this.type = "SunLight";
      this.coordinates = new THREE.Vector2().copy(coordinates_);
      this.north = new THREE.Vector3().copy(north_);
      this.east = new THREE.Vector3().copy(east_);
      this.nadir = new THREE.Vector3().copy(nadir_);
      this.sun_distance = sun_distance_;
      this.azimuth = 0.0;
      this.elevation = 0.0;
      this.localDate = new Date();
      this.hingeObject = new THREE.Object3D();
      this.add(this.hingeObject);
      this.directionalLight = new THREE.DirectionalLight();
      this.directionalLight.castShadow = true;
      this.hingeObject.add(this.directionalLight);
      this.add(this.directionalLight.target);
      this.solarOrientationCalculator = new SolarOrientationCalculator();
    }
  
    toJSON(meta) {
      var data = super.toJSON(meta);
      // TODO
      // not implemented yet
      return data;
    }
  
    updateOrientation(update_date_ = true) {
      if (update_date_) {
        this.localDate = new Date();
      }
      var sunOrientation = this.solarOrientationCalculator.getAzEl(
        this.coordinates.x,
        this.coordinates.y,
        this.localDate
      );
      this.azimuth = this._degreesToRadians(sunOrientation.azimuth);
      this.elevation = this._degreesToRadians(sunOrientation.elevation);
    }
  
    updateDirectionalLight() {
      var FADE_OUT_THRESHOLD = 2.0;
      var elevationDegrees = (180.0 * this.elevation) / Math.PI;
      if (elevationDegrees <= 0.0) {
        this.directionalLight.intensity = 0.0;
        return;
      } else if (elevationDegrees <= FADE_OUT_THRESHOLD) {
        this.directionalLight.intensity = elevationDegrees / FADE_OUT_THRESHOLD;
      } else {
        this.directionalLight.intensity = 1.0;
      }
      this.hingeObject.quaternion.copy(new THREE.Quaternion());
  
      this.directionalLight.position.copy(this.north);
      this.directionalLight.position.multiplyScalar(this.sun_distance);
      var rotator = new THREE.Quaternion();
      rotator.setFromAxisAngle(this.east, this.elevation);
      this.hingeObject.quaternion.premultiply(rotator);
      rotator.setFromAxisAngle(this.nadir, this.azimuth);
      this.hingeObject.quaternion.premultiply(rotator);
    }
  
    _degreesToRadians(degrees_) {
      return ((degrees_ % 360.0) * Math.PI) / 180.0;
    }
  }
  
  class SolarOrientationCalculator {
    constructor() {
      this.a = "some val";
    }
  
    getAzEl(lat_, lon_, date_ = new Date()) {
      var jday = this._getJD(date_);
      var tl = this._getTimeLocal(date_);
      var tz = date_.getTimezoneOffset() / -60;
      var total = jday + tl / 1440.0 - tz / 24.0;
      var T = this._calcTimeJulianCent(total);
      var sunOrientation = this._calcAzEl(false, T, tl, lat_, lon_, tz);
      return sunOrientation;
    }
  

    _getJD( date_ = new Date() ){
    var docmonth = date_.getMonth() + 1;
    var docday = date_.getDate();
    var docyear = date_.getFullYear();
    if ( (this._isLeapYear(docyear)) && (docmonth == 2) ) {
        if (docday > 29) {
            docday = 29;
        } 
    } else {
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
    
    _getTimeLocal( date_ = new Date() ){
    var totalMinutes = 0.0;
    totalMinutes += 60.0 * date_.getHours();
    
    totalMinutes += date_.getMinutes();
    totalMinutes += date_.getSeconds() / 60.0;
    return totalMinutes;
    }
    
    _calcTimeJulianCent( jd ){
    var T = (jd - 2451545.0)/36525.0;
    return T;
    }
    
    _calcAzEl( output, T, localtime, latitude, longitude, zone ){
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
        let azRad = (( Math.sin(this._degToRad(latitude)) *
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
    
    _isLeapYear( yr ){
    return ((yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0);
    }
    
    _radToDeg( angleRad ){
    return (180.0 * angleRad / Math.PI);
    }
    
    _degToRad( angleDeg ){
    return (Math.PI * angleDeg / 180.0);
    }
    
    _calcEquationOfTime( t ){
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
    
    _calcSunDeclination( t ){
    var e = this._calcObliquityCorrection(t);
    var lambda = this._calcSunApparentLong(t);
    
    var sint = Math.sin(this._degToRad(e)) * Math.sin(this._degToRad(lambda));
    var theta = this._radToDeg(Math.asin(sint));
    return theta; // in degree
    }
    
    
    _calcSunRadVector( t ){
    var v = this._calcSunTrueAnomaly(t);
    var e = this._calcEccentricityEarthOrbit(t);
    var R = (1.000001018 * (1 - e * e)) /
        (1 + e * Math.cos(this._degToRad(v)));
    return R; // in AU
    }
    
    _calcObliquityCorrection( t ){
    var e0 = this._calcMeanObliquityOfEcliptic(t);
    var omega = 125.04 - 1934.136 * t;
    var e = e0 + 0.00256 * Math.cos(this._degToRad(omega));
    return e; // in degree
    }
    
    _calcSunApparentLong( t ){
    var o = this._calcSunTrueLong(t);
    var omega = 125.04 - 1934.136 * t;
    var lambda = o - 0.00569 - 0.00478 * Math.sin(this._degToRad(omega));
    return lambda; // in degrees
    }
    
    _calcGeomMeanLongSun(t){
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
    
    _calcEccentricityEarthOrbit(t){
    var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    return e; // unitless
    }
    
    _calcGeomMeanAnomalySun(t){
    var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    return M; // in degrees
    }
    
    _calcSunTrueAnomaly(t){
    var m = this._calcGeomMeanAnomalySun(t);
    var c = this._calcSunEqOfCenter(t);
    var v = m + c;
    return v; // in degrees
    }
    
    _calcMeanObliquityOfEcliptic(t){
    var seconds = 21.448 - t*(46.8150 + t*(0.00059 - t*(0.001813)));
    var e0 = 23.0 + (26.0 + (seconds/60.0))/60.0;
    return e0; // in degrees
    }
    
    _calcSunTrueLong(t){
    var l0 = this._calcGeomMeanLongSun(t);
    var c = this._calcSunEqOfCenter(t);
    var O = l0 + c;
    return O; // in degrees
    }
    
    _calcSunEqOfCenter(t){
    var m = this._calcGeomMeanAnomalySun(t);
    var mrad = this._degToRad(m);
    var sinm = Math.sin(mrad);
    var sin2m = Math.sin(mrad+mrad);
    var sin3m = Math.sin(mrad+mrad+mrad);
    var C = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m *
        (0.019993 - 0.000101 * t) + sin3m * 0.000289;
    return C; // in degrees
    }
}

export {SunLight}
