var gl;

var mvMatrixStack = []; // Save and restore previous modelview matrices
var mvMatrix = mat4.create(); // Modelview matrix
var pMatrix = mat4.create(); // Projection matrix

var shaderProgram;

var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;

var lastTime = 0;

var currentlyPressedKeys = {};

var pitch = 0;
var pitchRate = 0;

var yaw = 0;
var yawRate = 0;

var xPos = 0;
var yPos = 0.4;
var zPos = 0;

var speed = 0;

var joggingAngle = 0;




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


function initTexture(){
	stoneTexture = gl.createTexture();
	stoneTexture.image = new Image();
	stoneTexture.image.onload = function(){
		handleLoadedTexture(stoneTexture);
	}

	stoneTexture.image.src = "stone_texture.jpg";
}

function handleLoadedTexture(texture){
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}




function loadWorld(){
	var request = new XMLHttpRequest();
	request.open("GET", "world.txt");
	request.onreadystatechange = function(){
		if(request.readyState == 4){
			handleLoadedWorld(request.responseText);
		}
	}
	request.send();
}

function handleLoadedWorld(data){
	var lines = data.split("\n");
	var vertexCount = 0;
	var vertexPositions = [];
	var vertexTextureCoords = [];
	for (var i in lines){
		var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
		if(vals.length == 5 && vals[0] != "//"){
			vertexPositions.push(parseFloat(vals[0]));
			vertexPositions.push(parseFloat(vals[1]));
			vertexPositions.push(parseFloat(vals[2]));

			vertexTextureCoords.push(parseFloat(vals[3]));
			vertexTextureCoords.push(parseFloat(vals[4]));

			vertexCount += 1;
		}
	}

	worldVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
	worldVertexPositionBuffer.itemSize = 3;
	worldVertexPositionBuffer.numItems = vertexCount;


	worldVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
	worldVertexTextureCoordBuffer.itemSize = 2;
	worldVertexTextureCoordBuffer.numItems = vertexCount;

	document.getElementById("loadingtext").textContent = "";
}





function setMatrixUniforms(){
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
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
		pitchRate = 0.1;
	}
	else if(currentlyPressedKeys[34]){
		// Page Down
		pitchRate = -0.1;
	}
	else{
		pitchRate = 0;
	}

	if(currentlyPressedKeys[37] || currentlyPressedKeys[65]){
		// Left or A
		yawRate = 0.1;
	}
	else if(currentlyPressedKeys[39] || currentlyPressedKeys[68]){
		// Right of D
		yawRate = -0.1;
	}
	else{
		yawRate = 0;
	}

	if(currentlyPressedKeys[38] || currentlyPressedKeys[87]){
		// Up or W
		speed = 0.003;
	}
	else if(currentlyPressedKeys[40] || currentlyPressedKeys[83]){
		// Down or S
		speed = -0.003;
	}
	else{
		speed = 0;
	}
}

function handleKeyDown(event){
	currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event){
	currentlyPressedKeys[event.keyCode] = false;
}



function animate(){
	var timeNow = new Date().getTime();
	if(lastTime != 0){
		var elapsed = timeNow - lastTime;

		if(speed != 0){
			xPos -= Math.sin(degToRad(yaw)) * speed * elapsed;
			zPos -= Math.cos(degToRad(yaw)) * speed * elapsed;

			joggingAngle += elapsed * 0.6;
			yPos = Math.sin(degToRad(joggingAngle)) / 20 + 0.4;
		}

		yaw += yawRate * elapsed;
		pitch += pitchRate * elapsed;
	}
	lastTime = timeNow;
}

function drawScene(){
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if(worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null){
		return;
	}

	mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

	mat4.identity(mvMatrix);
	mat4.rotate(mvMatrix, degToRad(-pitch), [1,0,0]);
	mat4.rotate(mvMatrix, degToRad(-yaw), [0,1,0]);
	mat4.translate(mvMatrix, [-xPos, -yPos, -zPos]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	setMatrixUniforms();
	gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);
}




function webgl_start() {
	var canvas = document.getElementById("webgl_canvas");
	initGL(canvas);
	initShaders();
	initTexture();
	loadWorld();

	gl.clearColor(0.33, 0.33, 0.33, 1.0); // Approx hex colour of #555555
	gl.enable(gl.DEPTH_TEST);

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