var gl;

var mvMatrixStack = []; // Save and restore previous modelview matrices
var mvMatrix = mat4.create(); // Modelview matrix
var pMatrix = mat4.create(); // Projection matrix

var shaderProgram;

var lastTime = 0;

var currentlyPressedKeys = {};

var stars = [];
var starTexture;

var starVertexPositionBuffer;
var starVertexTextureCoordBuffer;

var zoom = -15;
var tilt = 90;
var spin = 0;

var effectiveFPMS = 60/1000;



function Star(startingDistance, rotationSpeed){
	this.angle = 0;
	this.dist = startingDistance;
	this.rotationSpeed = rotationSpeed;

	// Set the colors to a starting value
	this.randomizeColors();
}
Star.prototype.draw = function(tilt, spin, twinkle){
	mvPushMatrix();
	// Move to star's position
	mat4.rotate(mvMatrix, degToRad(this.angle), [0.0, 1.0, 0.0]);
	mat4.translate(mvMatrix, [this.dist, 0.0, 0.0]);
	// Rotate star to face viewer
	mat4.rotate(mvMatrix, degToRad(-this.angle), [0.0,1.0,0.0]);
	mat4.rotate(mvMatrix, degToRad(-tilt), [1.0,0.0,0.0]);

	if(twinkle){
		// draw a non rotating "tinkling colour" star
		gl.uniform3f(shaderProgram.colorUniform, this.twinkleR, this.twinkleG, this.twinkleB);
		drawStar();
	}

	// Spin around the z-axis
	mat4.rotate(mvMatrix, degToRad(spin), [0.0,0.0,1.0]);

	// Draw the main star colour
	gl.uniform3f(shaderProgram.colorUniform, this.r, this.g, this.b);
	drawStar();

	mvPopMatrix();
};
Star.prototype.animate = function(elapsedTime){
	this.angle += this.rotationSpeed * effectiveFPMS * elapsedTime;

	// Move star inward toward center, then reset to outside
	this.dist -= 0.01 * effectiveFPMS * elapsedTime;
	if(this.dist < 0.0){
		this.dist += 5.0;
		this.randomizeColors();
	}
};
Star.prototype.randomizeColors = function(){
	this.r = Math.random()*0.8;
	this.g = Math.random()*0.8;
	this.b = Math.random()*0.8;

	this.twinkleR = Math.random()*0.8;
	this.twinkleG = Math.random()*0.8;
	this.twinkleB = Math.random()*0.8;
}

function drawStar(){
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, starTexture);
	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, starVertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, starVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, starVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, starVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	setMatrixUniforms();
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, starVertexPositionBuffer.numItems);
}




function initWorldObjects(){
	var numStars = 50;

	for(var i=0; i<numStars; i++){
		stars.push(new Star((i/numStars) * 5.0, i/numStars));
	}
}


function initGL(canvas){
	try{
		gl = canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch(e) {}
	if(!gl){
		alert("GL init failed!");
	}
}

function initShaders(){
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
}

function initBuffers(){
	starVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, starVertexPositionBuffer);
	var vertices = [
		-1.0, -1.0, 0.0,
		1.0, -1.0, 0.0,
		-1.0, 1.0, 0.0,
		1.0, 1.0, 0.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	starVertexPositionBuffer.itemSize = 3;
	starVertexPositionBuffer.numItems = 4;

	starVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, starVertexTextureCoordBuffer);
	var textureCoords = [
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	starVertexTextureCoordBuffer.itemSize = 2;
	starVertexTextureCoordBuffer.numItems = 4;
}

function initTexture(){
	starTexture = gl.createTexture();
	starTexture.image = new Image();
	starTexture.image.onload = function(){
		handleLoadedTexture(starTexture);
	}

	starTexture.image.src = "star.gif";
}



function handleLoadedTexture(texture){
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	gl.bindTexture(gl.TEXTURE_2D, null);
}



function getShader(gl, id){
	var shaderScript = document.getElementById(id);
	if(!shaderScript){
		return null;
	}

	var str="";
	var k = shaderScript.firstChild;
	while(k){
		if(k.nodeType == 3)
			str += k.textContent;
		k = k.nextSibling;
	}

	var shader;
	if(shaderScript.type == "x-shader/x-fragment"){
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if(shaderScript.type == "x-shader/x-vertex"){
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}





function setMatrixUniforms(){
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	// Reverse the effects of the projection and modelview matrix have on the normal vector
	var normalMatrix = mat3.create();
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}


function degToRad(degrees){
	return degrees * (Math.PI / 180);
}



function mvPushMatrix(){
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}

function mvPopMatrix(){
	if(mvMatrixStack.length == 0){
		throw "mvMatrix stack is empty!";
	}
	mvMatrix = mvMatrixStack.pop();
}





function tick(){
	// Schedule a redraw to occur once the current frame has finished drawing
	window.requestAnimationFrame(tick);

	handleKeys();
	drawScene();
	animate();
}

function handleKeys(){
	if(currentlyPressedKeys[33]){
		// Page up
		zoom -= 0.1;
	}
	if(currentlyPressedKeys[34]){
		// Page Down
		zoom += 0.1;
	}
	if(currentlyPressedKeys[38]){
		// Up cursor key
		tilt += 2;
	}
	if(currentlyPressedKeys[40]){
		tilt -= 2;
	}
}

function animate(){
	var timeNow = new Date().getTime();
	if(lastTime != 0){
		var elapsed = timeNow - lastTime;

		for(var i in stars){
			stars[i].animate(elapsed);
		}
	}
	lastTime = timeNow;
}

function drawScene(){
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.BLEND);

	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, [0.0, 0.0, zoom]);
	mat4.rotate(mvMatrix, degToRad(tilt), [1.0,0.0,0.0]);

	var twinkle = document.getElementById("twinkle").checked;

	for(var i in stars){
		stars[i].draw(tilt, spin, twinkle);
		spin += 0.1;
	}
}



function handleKeyDown(event){
	currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event){
	currentlyPressedKeys[event.keyCode] = false;
}



function webgl_start() {
	var canvas = document.getElementById("webgl_canvas");
	initGL(canvas);
	initShaders();
	initBuffers();
	initTexture();
	initWorldObjects();

	gl.clearColor(0.33, 0.33, 0.33, 1.0); // Approx hex colour of #555555

	// Paul Irish's gist to polyfill window.requestAnimationFrame
	(function() {
	    var lastTime = 0;
	    var vendors = ['ms', 'moz', 'webkit', 'o'];
	    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
	        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
	        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
	                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
	    }

	    if (!window.requestAnimationFrame)
	        window.requestAnimationFrame = function(callback, element) {
	            var currTime = new Date().getTime();
	            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
	            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
	              timeToCall);
	            lastTime = currTime + timeToCall;
	            return id;
	        };

	    if (!window.cancelAnimationFrame)
	        window.cancelAnimationFrame = function(id) {
	            clearTimeout(id);
	        };
	}());

	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;

	tick();
}