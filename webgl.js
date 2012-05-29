var gl;

var cubeVertexPositionBuffer;
var cubeVertexIndexBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexNormalBuffer;

var mvMatrixStack = []; // Save and restore previous modelview matrices
var mvMatrix = mat4.create(); // Modelview matrix
var pMatrix = mat4.create(); // Projection matrix

var shaderProgram;

var xRot = 0;
var xSpeed = 0;
var yRot = 0;
var ySpeed = 0;
var z = -5.0;

var lastTime = 0;

var stoneTexture;

var currentlyPressedKeys = {};


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

	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
	shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
	shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
	shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
}

function initBuffers(){
	// Create the cube vertices and colour buffer
	cubeVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	vertices = [
		// Front face
		-1.0, -1.0,  1.0,
		1.0, -1.0,  1.0,
		1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,
		// Back face
		-1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		1.0,  1.0, -1.0,
		1.0, -1.0, -1.0,
		// Top face
		-1.0,  1.0, -1.0,
		-1.0,  1.0,  1.0,
		1.0,  1.0,  1.0,
		1.0,  1.0, -1.0,
		// Bottom face
		-1.0, -1.0, -1.0,
		1.0, -1.0, -1.0,
		1.0, -1.0,  1.0,
		-1.0, -1.0,  1.0,
		// Right face
		1.0, -1.0, -1.0,
		1.0,  1.0, -1.0,
		1.0,  1.0,  1.0,
		1.0, -1.0,  1.0,
		// Left face
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	cubeVertexPositionBuffer.itemSize = 3;
	cubeVertexPositionBuffer.numItems = 24;

	cubeVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	var textureCoords = [
		// Front face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,

		// back face
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,

		// Top face
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,

		// Bottom face
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0,

		// Right face
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,

		// Left face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	cubeVertexTextureCoordBuffer.itemSize = 2;
	cubeVertexTextureCoordBuffer.numItems = 24;

	cubeVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
	var vertexNormals = [
        // Front face
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,

        // Back face
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,

        // Top face
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,

        // Bottom face
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,

        // Right face
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,

        // Left face
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
	cubeVertexNormalBuffer.itemSize = 3;
	cubeVertexNormalBuffer.numItems = 24;

	cubeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	var cubeVertexIndices = [
		0, 1, 2,	0, 2, 3, // Front face
		4, 5, 6,	4, 6, 7, // Back face
		8, 9, 10,	8, 10, 11, // Top face
		12, 13, 14,	12, 14, 15, // Bottom face
		16, 17, 18, 16, 18, 19, // Right face
		20, 21, 22, 20, 22, 23 // Left face
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
	cubeVertexIndexBuffer.itemSize = 1;
	cubeVertexIndexBuffer.numItems = 36;
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
		z -= 0.05;
	}
	if(currentlyPressedKeys[34]){
		// Page Down
		z += 0.05;
	}
	if(currentlyPressedKeys[37]){
		// Left cursor key
		ySpeed -= 1;
	}
	if(currentlyPressedKeys[39]){
		// Right cursor key
		ySpeed += 1;
	}
	if(currentlyPressedKeys[38]){
		// Up cursor key
		xSpeed -= 1;
	}
	if(currentlyPressedKeys[40]){
		xSpeed += 1;
	}
}

function animate(){
	var timeNow = new Date().getTime();
	if(lastTime != 0){
		var elapsed = timeNow - lastTime;

		xRot += (xSpeed * elapsed) / 1000.0;
		yRot += (ySpeed * elapsed) / 1000.0;
	}
	lastTime = timeNow;
}

function drawScene(){
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [0.0, 0.0, z]);

	mat4.rotate(mvMatrix, degToRad(xRot), [1,0,0]);
	mat4.rotate(mvMatrix, degToRad(yRot), [0,1,0]);

	// Pass the vertex positions to WebGL
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	// Pass the texture coords to WebGL
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
	gl.uniform1i(shaderProgram.samplerUniform, 0);

	// Pass the vertex normals to WebGL
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	var lighting = document.getElementById("lighting").checked;
	gl.uniform1i(shaderProgram.useLightingUniform, lighting);
	if(lighting){
		// Ambient light colour
		gl.uniform3f(
			shaderProgram.ambientColorUniform,
			parseFloat(document.getElementById("ambientR").value),
			parseFloat(document.getElementById("ambientG").value),
			parseFloat(document.getElementById("ambientB").value)
		);
		// Light direction
		var lightingDirection = [
			parseFloat(document.getElementById("lightDirectionX").value),
			parseFloat(document.getElementById("lightDirectionY").value),
			parseFloat(document.getElementById("lightDirectionZ").value)
		];
		var adjustedLD = vec3.create();
		vec3.normalize(lightingDirection, adjustedLD);
		vec3.scale(adjustedLD, -1);
		gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);
		// Directional light colour
		gl.uniform3f(
			shaderProgram.directionalColorUniform,
			parseFloat(document.getElementById("directionalR").value),
			parseFloat(document.getElementById("directionalG").value),
			parseFloat(document.getElementById("directionalB").value)
		);
	}

	// Pass the triangle vertex indices (referencing the vertex positions buffer) to WebGL
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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




























// var gl;

// function initGL(canvas) {
//     try {
//         gl = canvas.getContext("experimental-webgl");
//         gl.viewportWidth = canvas.width;
//         gl.viewportHeight = canvas.height;
//     } catch (e) {
//     }
//     if (!gl) {
//         alert("Could not initialise WebGL, sorry :-(");
//     }
// }


// function getShader(gl, id) {
//     var shaderScript = document.getElementById(id);
//     if (!shaderScript) {
//         return null;
//     }

//     var str = "";
//     var k = shaderScript.firstChild;
//     while (k) {
//         if (k.nodeType == 3) {
//             str += k.textContent;
//         }
//         k = k.nextSibling;
//     }

//     var shader;
//     if (shaderScript.type == "x-shader/x-fragment") {
//         shader = gl.createShader(gl.FRAGMENT_SHADER);
//     } else if (shaderScript.type == "x-shader/x-vertex") {
//         shader = gl.createShader(gl.VERTEX_SHADER);
//     } else {
//         return null;
//     }

//     gl.shaderSource(shader, str);
//     gl.compileShader(shader);

//     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
//         alert(gl.getShaderInfoLog(shader));
//         return null;
//     }

//     return shader;
// }


// var shaderProgram;

// function initShaders() {
//     var fragmentShader = getShader(gl, "shader-fs");
//     var vertexShader = getShader(gl, "shader-vs");

//     shaderProgram = gl.createProgram();
//     gl.attachShader(shaderProgram, vertexShader);
//     gl.attachShader(shaderProgram, fragmentShader);
//     gl.linkProgram(shaderProgram);

//     if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
//         alert("Could not initialise shaders");
//     }

//     gl.useProgram(shaderProgram);

//     shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
//     gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

//     shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
//     gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

//     shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
//     gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

//     shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
//     shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
//     shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
//     shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
//     shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
//     shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
//     shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
//     shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
// }



// function handleLoadedTexture(texture) {
//     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

//     gl.bindTexture(gl.TEXTURE_2D, texture);
//     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
//     gl.generateMipmap(gl.TEXTURE_2D);

//     gl.bindTexture(gl.TEXTURE_2D, null);
// }


// var crateTexture;

// function initTexture() {
//     crateTexture = gl.createTexture();
//     crateTexture.image = new Image();
//     crateTexture.image.onload = function () {
//         handleLoadedTexture(crateTexture)
//     }

//     crateTexture.image.src = "stone_texture.jpg";
// }


// var mvMatrix = mat4.create();
// var mvMatrixStack = [];
// var pMatrix = mat4.create();

// function mvPushMatrix() {
//     var copy = mat4.create();
//     mat4.set(mvMatrix, copy);
//     mvMatrixStack.push(copy);
// }

// function mvPopMatrix() {
//     if (mvMatrixStack.length == 0) {
//         throw "Invalid popMatrix!";
//     }
//     mvMatrix = mvMatrixStack.pop();
// }


// function setMatrixUniforms() {
//     gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
//     gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

//     var normalMatrix = mat3.create();
//     mat4.toInverseMat3(mvMatrix, normalMatrix);
//     mat3.transpose(normalMatrix);
//     gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
// }


// function degToRad(degrees) {
//     return degrees * Math.PI / 180;
// }



// var xRot = 0;
// var xSpeed = 3;

// var yRot = 0;
// var ySpeed = -3;

// var z = -5.0;


// var currentlyPressedKeys = {};

// function handleKeyDown(event) {
//     currentlyPressedKeys[event.keyCode] = true;
// }


// function handleKeyUp(event) {
//     currentlyPressedKeys[event.keyCode] = false;
// }


// function handleKeys() {
//     if (currentlyPressedKeys[33]) {
//         // Page Up
//         z -= 0.05;
//     }
//     if (currentlyPressedKeys[34]) {
//         // Page Down
//         z += 0.05;
//     }
//     if (currentlyPressedKeys[37]) {
//         // Left cursor key
//         ySpeed -= 1;
//     }
//     if (currentlyPressedKeys[39]) {
//         // Right cursor key
//         ySpeed += 1;
//     }
//     if (currentlyPressedKeys[38]) {
//         // Up cursor key
//         xSpeed -= 1;
//     }
//     if (currentlyPressedKeys[40]) {
//         // Down cursor key
//         xSpeed += 1;
//     }
// }

// var cubeVertexPositionBuffer;
// var cubeVertexNormalBuffer;
// var cubeVertexTextureCoordBuffer;
// var cubeVertexIndexBuffer;

// function initBuffers() {
//     cubeVertexPositionBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
//     vertices = [
//         // Front face
//         -1.0, -1.0,  1.0,
//          1.0, -1.0,  1.0,
//          1.0,  1.0,  1.0,
//         -1.0,  1.0,  1.0,

//         // Back face
//         -1.0, -1.0, -1.0,
//         -1.0,  1.0, -1.0,
//          1.0,  1.0, -1.0,
//          1.0, -1.0, -1.0,

//         // Top face
//         -1.0,  1.0, -1.0,
//         -1.0,  1.0,  1.0,
//          1.0,  1.0,  1.0,
//          1.0,  1.0, -1.0,

//         // Bottom face
//         -1.0, -1.0, -1.0,
//          1.0, -1.0, -1.0,
//          1.0, -1.0,  1.0,
//         -1.0, -1.0,  1.0,

//         // Right face
//          1.0, -1.0, -1.0,
//          1.0,  1.0, -1.0,
//          1.0,  1.0,  1.0,
//          1.0, -1.0,  1.0,

//         // Left face
//         -1.0, -1.0, -1.0,
//         -1.0, -1.0,  1.0,
//         -1.0,  1.0,  1.0,
//         -1.0,  1.0, -1.0,
//     ];
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
//     cubeVertexPositionBuffer.itemSize = 3;
//     cubeVertexPositionBuffer.numItems = 24;

//     cubeVertexNormalBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
//     var vertexNormals = [
//         // Front face
//          0.0,  0.0,  1.0,
//          0.0,  0.0,  1.0,
//          0.0,  0.0,  1.0,
//          0.0,  0.0,  1.0,

//         // Back face
//          0.0,  0.0, -1.0,
//          0.0,  0.0, -1.0,
//          0.0,  0.0, -1.0,
//          0.0,  0.0, -1.0,

//         // Top face
//          0.0,  1.0,  0.0,
//          0.0,  1.0,  0.0,
//          0.0,  1.0,  0.0,
//          0.0,  1.0,  0.0,

//         // Bottom face
//          0.0, -1.0,  0.0,
//          0.0, -1.0,  0.0,
//          0.0, -1.0,  0.0,
//          0.0, -1.0,  0.0,

//         // Right face
//          1.0,  0.0,  0.0,
//          1.0,  0.0,  0.0,
//          1.0,  0.0,  0.0,
//          1.0,  0.0,  0.0,

//         // Left face
//         -1.0,  0.0,  0.0,
//         -1.0,  0.0,  0.0,
//         -1.0,  0.0,  0.0,
//         -1.0,  0.0,  0.0
//     ];
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
//     cubeVertexNormalBuffer.itemSize = 3;
//     cubeVertexNormalBuffer.numItems = 24;

//     cubeVertexTextureCoordBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
//     var textureCoords = [
//         // Front face
//         0.0, 0.0,
//         1.0, 0.0,
//         1.0, 1.0,
//         0.0, 1.0,

//         // Back face
//         1.0, 0.0,
//         1.0, 1.0,
//         0.0, 1.0,
//         0.0, 0.0,

//         // Top face
//         0.0, 1.0,
//         0.0, 0.0,
//         1.0, 0.0,
//         1.0, 1.0,

//         // Bottom face
//         1.0, 1.0,
//         0.0, 1.0,
//         0.0, 0.0,
//         1.0, 0.0,

//         // Right face
//         1.0, 0.0,
//         1.0, 1.0,
//         0.0, 1.0,
//         0.0, 0.0,

//         // Left face
//         0.0, 0.0,
//         1.0, 0.0,
//         1.0, 1.0,
//         0.0, 1.0
//     ];
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
//     cubeVertexTextureCoordBuffer.itemSize = 2;
//     cubeVertexTextureCoordBuffer.numItems = 24;

//     cubeVertexIndexBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
//     var cubeVertexIndices = [
//         0, 1, 2,      0, 2, 3,    // Front face
//         4, 5, 6,      4, 6, 7,    // Back face
//         8, 9, 10,     8, 10, 11,  // Top face
//         12, 13, 14,   12, 14, 15, // Bottom face
//         16, 17, 18,   16, 18, 19, // Right face
//         20, 21, 22,   20, 22, 23  // Left face
//     ];
//     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
//     cubeVertexIndexBuffer.itemSize = 1;
//     cubeVertexIndexBuffer.numItems = 36;
// }


// function drawScene() {
//     gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

//     mat4.identity(mvMatrix);

//     mat4.translate(mvMatrix, [0.0, 0.0, z]);

//     mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0]);
//     mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0]);

//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
//     gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
//     gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
//     gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, crateTexture);
//     gl.uniform1i(shaderProgram.samplerUniform, 0);
//     var lighting = document.getElementById("lighting").checked;
//     gl.uniform1i(shaderProgram.useLightingUniform, lighting);
//     if (lighting) {
//         gl.uniform3f(
//             shaderProgram.ambientColorUniform,
//             parseFloat(document.getElementById("ambientR").value),
//             parseFloat(document.getElementById("ambientG").value),
//             parseFloat(document.getElementById("ambientB").value)
//         );

//         var lightingDirection = [
//             parseFloat(document.getElementById("lightDirectionX").value),
//             parseFloat(document.getElementById("lightDirectionY").value),
//             parseFloat(document.getElementById("lightDirectionZ").value)
//         ];
//         var adjustedLD = vec3.create();
//         vec3.normalize(lightingDirection, adjustedLD);
//         vec3.scale(adjustedLD, -1);
//         gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

//         gl.uniform3f(
//             shaderProgram.directionalColorUniform,
//             parseFloat(document.getElementById("directionalR").value),
//             parseFloat(document.getElementById("directionalG").value),
//             parseFloat(document.getElementById("directionalB").value)
//         );
//     }

//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
//     setMatrixUniforms();
//     gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
// }


// var lastTime = 0;

// function animate() {
//     var timeNow = new Date().getTime();
//     if (lastTime != 0) {
//         var elapsed = timeNow - lastTime;

//         xRot += (xSpeed * elapsed) / 1000.0;
//         yRot += (ySpeed * elapsed) / 1000.0;
//     }
//     lastTime = timeNow;
// }


// function tick() {
//     window.requestAnimationFrame(tick);
//     handleKeys();
//     drawScene();
//     animate();
// }


// function webgl_start() {
//     var canvas = document.getElementById("webgl_canvas");
//     initGL(canvas);
//     initShaders();
//     initBuffers();
//     initTexture();

//     gl.clearColor(0.33, 0.33, 0.33, 1.0);
//     gl.enable(gl.DEPTH_TEST);

//     (function() {
// 	    var lastTime = 0;
// 	    var vendors = ['ms', 'moz', 'webkit', 'o'];
// 	    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
// 	        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
// 	        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
// 	                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
// 	    }

// 	    if (!window.requestAnimationFrame)
// 	        window.requestAnimationFrame = function(callback, element) {
// 	            var currTime = new Date().getTime();
// 	            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
// 	            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
// 	              timeToCall);
// 	            lastTime = currTime + timeToCall;
// 	            return id;
// 	        };

// 	    if (!window.cancelAnimationFrame)
// 	        window.cancelAnimationFrame = function(id) {
// 	            clearTimeout(id);
// 	        };
// 	}());

//     document.onkeydown = handleKeyDown;
//     document.onkeyup = handleKeyUp;

//     tick();
// }