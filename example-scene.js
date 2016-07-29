var scene, root, renderer, camera, controls;
init();
createScene();
animate();

function init () {
	scene = new THREE.Scene();
	root = new THREE.Object3D();
	scene.add( root );
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	document.body.appendChild( renderer.domElement );
	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000.0
	);
	camera.position.z = 50.0;
	controls = new THREE.OrbitControls( camera );
	controls.addEventListener( "change", render );
}

function animate () {
	requestAnimationFrame( animate );
	controls.update();
	render();
}

function render () {
	renderer.render( scene, camera );
}

function createScene () {
	// Create the objects
	// In this case z+ is north, y- is the gravity.
	var ground = createBox( 50.0, 1.0, 50.0, 0x99ff99 );
	ground.position.set( 0.0, 0.0, 0.0 );
	root.add( ground );
	// Cube in the middle
	var cube = createBox( 5.0, 5.0, 5.0 );
	cube.position.set( 0.0, 5.0, 0.0 );
	root.add( cube );
	// North pole indicator
	var northIndicator = createBox( 2.0, 2.0, 8.0, 0xff0000 );
	northIndicator.position.set( 0.0, 1.0, 20.0 );
	root.add( northIndicator );

	// Add an ambient light
	root.add( new THREE.AmbientLight( 0x333333) );

	// Create the sun light and add it to the scene
	var sunLight = new SunLight(
		// Oulu
		new THREE.Vector2( 65.05, 25.47 ),
		new THREE.Vector3( 0.0, 0.0, 1.0 ),
		new THREE.Vector3( -1.0, 0.0, 0.0 ),
		new THREE.Vector3( 0.0, -1.0, 0.0 )
	);
	root.add( sunLight );

	sunLight.updateOrientation(true);
	sunLight.updateDirectionalLight();

	// Adjust the directional light's shadow camera dimensions
	sunLight.directionalLight.shadow.camera.right = 30.0;
	sunLight.directionalLight.shadow.camera.left = -30.0;
	sunLight.directionalLight.shadow.camera.top = 30.0;
	sunLight.directionalLight.shadow.camera.bottom = -30.0;
}

function createBox ( width_, height_, depth_, color_ = 0xffffff ) {
	var geometry = new THREE.BoxGeometry( width_, height_, depth_ );
	var material = new THREE.MeshPhongMaterial( { color: color_ } );
	var cube = new THREE.Mesh( geometry, material );
	cube.castShadow = true;
	cube.receiveShadow = true;
	return cube;
}

