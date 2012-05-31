var gl;

var mvMatrixStack = []; // Save and restore previous modelview matrices
var mvMatrix = mat4.create(); // Modelview matrix
var pMatrix = mat4.create(); // Projection matrix

var shaderProgram;

var moonTexture;
var moonVertexPositionBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexNormalBuffer;
var moonVertexIndexBuffer;

var moonRotationMatrix = mat4.create();
mat4.identity(moonRotationMatrix);

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
	var latitudeBands = 30;
	var longitudeBands = 30;
	var radius = 2;

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
}

function handleLoadedTexture(texture){
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	// ALlow use of texture that is rectangular
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.bindTexture(gl.TEXTURE_2D, null);
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





function handleMouseDown(event){
	mouseDown = true;
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
}

function handleMouseUp(event){
	mouseDown = false;
}

function handleMouseMove(event){
	if(!mouseDown){
		return;
	}
	var newX = event.clientX;
	var newY = event.clientY;

	var newRotationMatrix = mat4.create();
	mat4.identity(newRotationMatrix);

	var deltaX = newX - lastMouseX;
	mat4.rotate(newRotationMatrix, degToRad(deltaX / 10), [0,1,0]);

	var deltaY = newY - lastMouseY;
	mat4.rotate(newRotationMatrix, degToRad(deltaY / 10), [1,0,0]);

	mat4.multiply(newRotationMatrix, moonRotationMatrix, moonRotationMatrix);

	lastMouseX = newX;
	lastMouseY = newY;
}





function tick(){
	// Schedule a redraw to occur once the current frame has finished drawing
	window.requestAnimationFrame(tick);

	drawScene();
}

function drawScene(){
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.1, 100.0, pMatrix);

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

	mat4.identity(mvMatrix);

	mat4.translate(mvMatrix, [0,0,-6]);
	mat4.multiply(mvMatrix, moonRotationMatrix);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, moonTexture);
	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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

	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;

	tick();
}