let gl = null;
let glCanvas = null;

// Aspect ratio and coordinate system
// details

let aspectRatio;
let currentRotation = [0, 1];
let currentScale = [1.0, 1.0];

// Vertex information

let vertexArray;
let vertexBuffer;
let textureCoordBuffer
let vertexNumComponents;
let vertexCount;

// Rendering data shared with the
// scalers.

let uScalingFactor;
let uGlobalColor;
let uTime;
let aVertexPosition;
let aTextureCoord;

// Animation timing

let shaderProgram;
let currentAngle;
let previousTime = 0.0;
let degreesPerSecond = 90.0;

var textureArray = [];

window.addEventListener("load", startup, false);

function startup() {
    glCanvas = document.getElementById("glcanvas");
    gl = glCanvas.getContext("webgl");

    const shaderSet = [{
      type: gl.VERTEX_SHADER,
      id: "vertex-shader",},
    {type: gl.FRAGMENT_SHADER,
      id: "fragment-shader",},];

    shaderProgram = buildShaderProgram(shaderSet);

    aspectRatio = glCanvas.width / glCanvas.height;
    currentRotation = [0, 1];
    currentScale = [1.0, aspectRatio];

    vertexArray = new Float32Array([-1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0,]);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    vertexNumComponents = 2;
    vertexCount = vertexArray.length / vertexNumComponents;

    const textureCoordinates = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0];

    textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    initTextures(gl);
    animateScene();
}

function buildShaderProgram(shaderInfo) {
    const program = gl.createProgram();
  
    shaderInfo.forEach((desc) => {
      const shader = compileShader(desc.id, desc.type);
  
      if (shader) {
        gl.attachShader(program, shader);
      }
    });
  
    gl.linkProgram(program);
  
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.log("Error linking shader program:");
      console.log(gl.getProgramInfoLog(program));
    }
  
    return program;
}

function compileShader(id, type) {
    const code = document.getElementById(id).firstChild.nodeValue;
    const shader = gl.createShader(type);
  
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
  
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(
        `Error compiling ${
          type === gl.VERTEX_SHADER ? "vertex" : "fragment"
        } shader:`,
      );
      console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function initTextures(gl) {
    textureArray.push({}) ;
    loadFileTexture(gl, textureArray[0], "water.png");
    
    textureArray.push({}) ;
    loadFileTexture(gl, textureArray[1], "perlin_noise.png");

    waitForTextures(textureArray);
}

function waitForTextures(texs) {
    setTimeout(
		function() {
			   var n = 0 ;
               for ( var i = 0 ; i < texs.length ; i++ )
               {
                    console.log(texs[i].image.src) ;
                    n = n+texs[i].isTextureReady ;
               }
               if( n != texs.length )
               {
               		console.log("not ready yet") ;
               		waitForTextures(texs) ;
               }
               else
               {
               		console.log("ready to render") ;
                    animateScene();
               }
		},
	5) ;
}

function loadFileTexture(gl, tex, filename) {
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename ;
    tex.isTextureReady = false ;
    tex.image.onload = function() { handleTextureLoaded(gl, tex); }
}

function handleTextureLoaded(gl, textureObj) {
    gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);

    gl.generateMipmap(gl.TEXTURE_2D);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);
    console.log(textureObj.image.src) ;
    
    textureObj.isTextureReady = true ;
}

function animateScene() {
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0.8, 0.9, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  
    gl.useProgram(shaderProgram);

    // Gets a noise texture (image source: https://commons.wikimedia.org/wiki/File:Perlin_noise_example.png)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "texture0"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureArray[1].textureWebGL);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "texture1"), 1);
  
    uGlobalColor = gl.getUniformLocation(shaderProgram, "uGlobalColor");
    gl.uniform4fv(uGlobalColor, [0.1, 0.7, 0.2, 1.0]);

    uTime = gl.getUniformLocation(shaderProgram, "time");
  
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  
    aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(
      aVertexPosition,
      vertexNumComponents,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    aTextureCoord = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(aTextureCoord);
    gl.vertexAttribPointer(
        aTextureCoord,
        2,
        gl.FLOAT,
        false,
        0,
        0,
    );
  
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  
    requestAnimationFrame((currentTime) => {
        gl.uniform1f(uTime, 0.00008*currentTime);
        previousTime = currentTime;
        animateScene();
    });
}