SunLight = function ( coordinates_, north_, east_, nadir_ ) {
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

	var sunOrientation = getAzEl(
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
	this.directionalLight.position.copy( this.north );
	var rotator = new THREE.Quaternion();
	rotator.setFromAxisAngle( this.east, this.elevation );
	this.hingeObject.quaternion.premultiply( rotator );
	rotator.setFromAxisAngle( this.nadir, this.azimuth );
	this.hingeObject.quaternion.premultiply( rotator );
}

SunLight.prototype._degreesToRadians = function ( degrees_ ) {
	return ( degrees_ % 360.0 ) * Math.PI / 180.0;
}

