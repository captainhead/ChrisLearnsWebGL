var gl;

var mvMatrixStack = []; // Save and restore previous modelview matrices
var mvMatrix = mat4.create(); // Modelview matrix
var pMatrix = mat4.create(); // Projection matrix

var currentProgram;
var perVertexProgram;
var perFragmentProgram;

var moonTexture;
var moonVertexPositionBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexNormalBuffer;
var moonVertexIndexBuffer;

var boxTexture;
var boxVertexPositionBuffer;
var boxVertexTextureCoordBuffer;
var boxVertexNormalBuffer;
var boxVertexIndexBuffer;

var rotationMatrix = mat4.create();
mat4.identity(rotationMatrix);

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;




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


function initBuffers(){
	// Build the sphere
	var latitudeBands = 30;
	var longitudeBands = 30;
	var radius = 1.5;

	var vertexPositionData = [];
	var normalData = [];
	var textureCoordData = [];
	for(var latNumber=0; latNumber <= latitudeBands; latNumber++){
		var theta = latNumber * Math.PI / latitudeBands;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for(var longNumber=0; longNumber <= longitudeBands; longNumber++){
			var phi = longNumber * 2 * Math.PI / longitudeBands;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = cosPhi * sinTheta;
			var y = cosTheta;
			var z = sinPhi * sinTheta;
			var u = 1 - (longNumber / longitudeBands);
			var v = 1 - (latNumber / latitudeBands);

			normalData.push(x);
			normalData.push(y);
			normalData.push(z);
			textureCoordData.push(u);
			textureCoordData.push(v);
			vertexPositionData.push(radius * x);
			vertexPositionData.push(radius * y);
			vertexPositionData.push(radius * z);
		}
	}

	var indexData = [];
	for(var latNumber = 0; latNumber < latitudeBands; latNumber++){
		for(var longNumber = 0; longNumber < longitudeBands; longNumber++){
			var first = (latNumber * (longitudeBands + 1)) + longNumber;
			var second = first + longitudeBands + 1;
			indexData.push(first);
			indexData.push(second);
			indexData.push(first + 1);

			indexData.push(second);
			indexData.push(second + 1);
			indexData.push(first + 1);
		}
	}

	moonVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
	moonVertexPositionBuffer.itemSize = 3;
	moonVertexPositionBuffer.numItems = vertexPositionData.length / 3;

	moonVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
	moonVertexTextureCoordBuffer.itemSize = 2;
	moonVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

	moonVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
	moonVertexNormalBuffer.itemSize = 3;
	moonVertexNormalBuffer.numItems = normalData.length / 3;

	moonVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
	moonVertexIndexBuffer.itemSize = 1;
	moonVertexIndexBuffer.numItems = indexData.length;


	// Build the box
	boxVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer);
	var boxVertices = [
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
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxVertices), gl.STATIC_DRAW);
	boxVertexPositionBuffer.itemSize = 3;
	boxVertexPositionBuffer.numItems = 24;

	boxVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexNormalBuffer);
	var boxNormals = [
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
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxNormals), gl.STATIC_DRAW);
	boxVertexNormalBuffer.itemSize = 3;
	boxVertexNormalBuffer.numItems = 24;

	boxVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexTextureCoordBuffer);
	var boxTexCoords = [
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
		0.0, 1.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxTexCoords), gl.STATIC_DRAW);
	boxVertexTextureCoordBuffer.itemSize = 2;
	boxVertexTextureCoordBuffer.numItems = 24;

	boxVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxVertexIndexBuffer);
	var boxIndicies = [
		0, 1, 2,	0, 2, 3, // Front face
		4, 5, 6,	4, 6, 7, // Back face
		8, 9, 10,	8, 10, 11, // Top face
		12, 13, 14,	12, 14, 15, // Bottom face
		16, 17, 18, 16, 18, 19, // Right face
		20, 21, 22, 20, 22, 23 // Left face
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndicies), gl.STATIC_DRAW);
	boxVertexIndexBuffer.itemSize = 1;
	boxVertexIndexBuffer.numItems = 36;
}


function initShaders(){
	perVertexProgram = createProgram("per-vertex-lighting-fs", "per-vertex-lighting-vs");
	perFragmentProgram = createProgram("per-fragment-lighting-fs", "per-fragment-lighting-vs");
}

function createProgram(fragmentShaderId, vertexShaderId){
	var fragmentShader = getShader(gl, fragmentShaderId);
	var vertexShader = getShader(gl, vertexShaderId);

	var shaderProgram = gl.createProgram();
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
	shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
	shaderProgram.pointLightingColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingColor");
	shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");

	return shaderProgram;
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
	moonTexture = gl.createTexture();
	moonTexture.image = new Image();
	moonTexture.image.onload = function(){
		handleLoadedTexture(moonTexture);
	}

	moonTexture.image.src = "moon.jpg";

	boxTexture = gl.createTexture();
	boxTexture.image = new Image();
	boxTexture.image.onload = function(){
		handleLoadedTexture(boxTexture);
	}

	boxTexture.image.src = "toon_box.jpg";
}

function handleLoadedTexture(texture){
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	// ALlow use of texture that is rectangular
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}





function setMatrixUniforms(){
	gl.uniformMatrix4fv(currentProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(currentProgram.mvMatrixUniform, false, mvMatrix);

	// Reverse the effects of the projection and modelview matrix have on the normal vector
	var normalMatrix = mat3.create();
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniformMatrix3fv(currentProgram.nMatrixUniform, false, normalMatrix);
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

	drawScene();
	animate();
}

function animate(){
	mat4.rotate(rotationMatrix, degToRad(0.8), [0,1,0]);
}

function drawScene(){
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);


	var perFragmentLighting = document.getElementById("per_fragment_lighting").checked;
	if(perFragmentLighting){
		currentProgram = perFragmentProgram;
	}
	else{
		currentProgram = perVertexProgram;
	}
	gl.useProgram(currentProgram);

	var lighting = document.getElementById("lighting").checked;
	gl.uniform1i(currentProgram.useLightingUniform, lighting);
	if(lighting){
		// Light position
		gl.uniform3f(
			currentProgram.pointLightingLocationUniform,
			parseFloat(document.getElementById("lightPositionX").value),
			parseFloat(document.getElementById("lightPositionY").value),
			parseFloat(document.getElementById("lightPositionZ").value)
		);
		// Point light colour
		gl.uniform3f(
			currentProgram.pointLightingColorUniform,
			parseFloat(document.getElementById("pointR").value),
			parseFloat(document.getElementById("pointG").value),
			parseFloat(document.getElementById("pointB").value)
		);
		// Ambient light colour
		gl.uniform3f(
			currentProgram.ambientColorUniform,
			parseFloat(document.getElementById("ambientR").value),
			parseFloat(document.getElementById("ambientG").value),
			parseFloat(document.getElementById("ambientB").value)
		);
	}

	var useTexturing = document.getElementById("texturing").checked;
	gl.uniform1i(currentProgram.useTexturesUniform, useTexturing);


	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [0,0,-6]);
	mat4.rotate(mvMatrix, degToRad(45), [1,0,0]);
	mat4.multiply(mvMatrix, rotationMatrix);

	// Draw the moon
	mvPushMatrix();

	mat4.translate(mvMatrix, [2.5,0,0]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, moonTexture);
	gl.uniform1i(currentProgram.samplerUniform, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
	gl.vertexAttribPointer(currentProgram.vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
	gl.vertexAttribPointer(currentProgram.textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
	gl.vertexAttribPointer(currentProgram.vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);


	// Draw the box
	mvPopMatrix();

	mat4.translate(mvMatrix, [-1.5,0,0]);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, boxTexture);
	gl.uniform1i(currentProgram.samplerUniform, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer);
	gl.vertexAttribPointer(currentProgram.vertexPositionAttribute, boxVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexTextureCoordBuffer);
	gl.vertexAttribPointer(currentProgram.textureCoordAttribute, boxVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexNormalBuffer);
	gl.vertexAttribPointer(currentProgram.vertexNormalAttribute, boxVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, boxVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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

	tick();
}