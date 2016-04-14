function Enum(constantsList) {
    for (var i in constantsList) {
        this[constantsList[i]] = i;
    }
}

function shape(id) {
    return [id, arguments.length + 1].concat(Array.prototype.slice.call(arguments, 1));
}

function touchingCircles(n,rad) {
    var ret = [n];
    for (i = 0; i < n; i++) {
        ret = ret.concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2, 0.7 ,0.1,1.0, 100 + 2 * i * rad,500,500,rad));
    }
    return ret;
}

var ObjTyp = new Enum(['EMPTY', 'SPHERE', 'CUBOID', 'CYLINDER', 'CONE', 'PYRAMID']);

var fps = { startTime : 0, frameNumber : 0,
            getFPS : function() {
                this.frameNumber++;
                var d = new Date().getTime(), currentTime = ( d - this.startTime ) / 1000, result = Math.floor( ( this.frameNumber / currentTime ) );
                if( currentTime > 1 ) {
                    this.startTime = new Date().getTime();
                    this.frameNumber = 0;
                }
                return result;
            }
          };

var camera = [
    0,1,2,                     // x,y,z coordinates
    0.5773502691896258, 0.5773502691896258, 0.5773502691896258,                     // Direction normal vector
    45                         // field of view : example 45
];
//x[0],y[1],z[2]
//xdir[3],ydir[4],zdir[5]
//fov[6]


var lights = [
    2,                         // number of lights
    200,200,200, 0,1,0,        // light 1, x,y,z location, and rgb colour (green)
    100,100,100, 1,1,1,        // light 2, x,y,z location, and rgb colour (white)
];

var objects = [2]
        .concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2, 0.7 ,0.1,1.0, 100,500,500,40))
        .concat(shape(ObjTyp.SPHERE, 0.0,0.0,1.0,0.2,0.7,0.1,1.0, 200,600,200,20));

var WIDTH = 800;
var HEIGHT = 600;


var selection = 0;

function change( el ) {

    if ( el.value === "Using CPU" ) {
        selection = 1;
        el.value = "Using GPU";
    } else {
        selection = 0;
        el.value = "Using CPU";
    }
}

var gpu = new GPU();

function sqr(x) {
    return x*x;
}

function dist(x1,y1,z1,x2,y2,z2) {
    return Math.sqrt(sqr(x1 - x2) + sqr(y1 - y2) + sqr(z1 - z2));
}
function dot(x1,y1,z1,x2,y2,z2) {
    return x1 * x2 + y1 * y2 + z1 * z2;
}

function size(x1,y1,z1) {
    return Math.sqrt(sqr(x1) + sqr(y1) + sqr(z1));
}
function squareRoot(x1) {
    return Math.sqrt(x1);
}

gpu.addFunction(sqr);
gpu.addFunction(dist);
gpu.addFunction(size);
gpu.addFunction(dot);
gpu.addFunction(squareRoot);
function vector(x1,y1,z1) { return {x: x1, y: y1, z: z1}; }
function vectorSub(v1, v2) {return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z}; }
function unitVector(v) {
    var len = size(v.x,v.y,v.z);
    return {x: v.x / len, y: v.y / len, z: v.z / len};
}
function crossProduct(v1, v2) {
    return {x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x};
}

function generatePrecompute(camera, lights, objects) {
    var eye = unitVector(vectorSub(vector(camera[3], camera[4], camera[5]),
                                   vector(camera[0], camera[1], camera[2]))),
        right = unitVector(crossProduct(eye, {x: 0, y: 1, z: 0})),
        up = unitVector(crossProduct(right, eye)),
        fovRadians = Math.PI * (camera[6] / 2) / 180, //9
        heightWidthRatio = HEIGHT / WIDTH, //10
        halfWidth = Math.tan(fovRadians), //11
        halfHeight = heightWidthRatio * halfWidth, //12
        cameraWidth = halfWidth * 2, //13
        cameraHeight = halfHeight * 2, //14
        pixelWidth = cameraWidth / (WIDTH - 1), //15
        pixelHeight = cameraHeight / (HEIGHT - 1); //16
    return [eye.x,eye.y,eye.z,
            right.x,right.y,right.z,
            up.x,up.y,up.z,
            fovRadians, heightWidthRatio, halfWidth, halfHeight,
            cameraWidth, cameraHeight, pixelWidth, pixelHeight];
}

function doit(mode) {
    var opt = {
        dimensions: [WIDTH,HEIGHT],
        debug: true,
        graphical: true,
        safeTextureReadHack: false,
        mode: mode,
        constants: { OBJCOUNT: objects[0],
                     EMPTY: ObjTyp.EMPTY,    SPHERE: ObjTyp.SPHERE,   CUBOID: ObjTyp.CUBOID,
                     CYLINDER: ObjTyp.CYLINDER,   CONE: ObjTyp.CONE,   PYRAMID: ObjTyp.PYRAMID,
                     WIDTH: WIDTH, HEIGHT: HEIGHT, MAXBOUNCE: 3, MAXVAL: 2147483646}
    };

    var y = gpu.createKernel(function(Camera,Lights,Objects,PreCompute) {
         //this.color(1.0,1.0,1.0);                      // By default canvas is light grey
        var xScale = this.thread.x * PreCompute[15] - PreCompute[11],
            yScale = this.thread.y * PreCompute[16] - PreCompute[12];
        var xcompX = PreCompute[3] * xScale,
            xcompY = PreCompute[4] * xScale,
            xcompZ = PreCompute[5] * xScale,
            ycompX = PreCompute[6] * yScale,
            ycompY = PreCompute[7] * yScale,
            ycompZ = PreCompute[8] * yScale;
        var rayX = xcompX + ycompX + PreCompute[0],
            rayY = xcompY + ycompY + PreCompute[1],
            rayZ = xcompZ + ycompZ + PreCompute[2];
        var colorR = 255,
            colorG = 255,
            colorB = 255;
        for (var i = 0; i < this.constants.MAXBOUNCE; i++) {
            var bounced = 0, //whether or not the ray bounced
                objStart = 1, //pointing to the current object start
                dist = this.constants.MAXVAL, //distance to the closest object
                closest = -1; //index of the closest object, or objStart of closest object
            for (var objNum = 0; objNum < Objects[0]; objNum++) {
                var objLen = Objects[objStart + 1],
                    objType = Objects[objStart];
                if (objType === this.constants.EMPTY) {

                }
                if (objType === this.constants.SPHERE) {
                    // var objects = [
                    //     2, // number of objects
                    //     ObjTyp.SPHERE,      13, 1.0,0.0,0.0,0.2, 0.7 ,0.1,1.0, 100,500,500,40,
                    //     // typ0           recsz1 r2 g3  b4 spec5 lamb6 amb7,opac8, x9,  y10,  z11,rad12,
                    //     ObjTyp.SPHERE,      13, 0.0,0.0,1.0,0.2,0.7,0.1,1.0, 200,600,200,20            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
                    // ];
                    var eyeToCenterX = Objects[objStart + 9] - Camera[0],
                        eyeToCenterY = Objects[objStart + 10] - Camera[1],
                        eyeToCenterZ = Objects[objStart + 11] - Camera[2],
                        vDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ,
                                   rayX, rayY, rayZ),
                        eoDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ,
                                    eyeToCenterX, eyeToCenterY, eyeToCenterZ),
                        discriminant = (sphere.radius * sphere.radius) - eoDot + (vDot * VDot);

                    if (discriminant >= 0) {
                        if (dist > vDot - Math.sqrt(discriminant)) {
                            dist = vDot - Math.sqrt(discriminant);
                            closest = objStart;
                        }
                        bounced = 1;
                    }
                } else if (objType === this.constants.CUBOID) {
                } else if (objType === this.constants.CYLINDER) {
                } else if (objType === this.constants.CONE) {
                } else if (objType === this.constants.PYRAMID) {
                }
                objStart += objLen;
            }
            if (bounced != 0) {
                var pointAtTimeX = Camera[0] + rayX * dist,
                    pointAtTimeY = Camera[1] + rayY * dist,
                    pointAtTimeZ = Camera[2] + rayZ * dist;
                var normalX = pointAtTimeX - Objects[closest + 9],
                    normalY = pointAtTimeY - Objects[closest + 10],
                    normalZ = pointAtTimeZ - Objects[closest + 11],
                    len = size(normalX, normalY, normalZ);
                normalX /= len;
                normalY /= len;
                normalZ /= len;
                //ray = rayX,Y,Z and Camera[0,1,2]
                //scene = Objects
                //object = closest
                //pointAtTime = pointAtTimeX,Y,Z
                //normal = sphereNormal(object, pointAtTime) = normalX,Y,Z
                //depth = i
                //objectR = Objects[closest + 2],
                //objectG = Objects[closest + 3],
                //objectB = Objects[closest + 4];
                var cX = 0, cY = 0, cZ = 0, lambertAmount = 0;
                if (Objects[closest + 6] > 0) {
                    for (var j = 1; j < Lights[0]; j += 6) {
                        //if (!isLightVisible(pointAtTime, scene, lightPoint)) continue;

                    }
                    this.color(colorR, colorG, colorB);

                    //this.constants.OBJCOUNT
                    //this.thread.x = x value
                    //this.thread.y = y value
                }
            } else {
                //TOOD might have to add something
            }
        }
    }, opt);
    return y;
}
lights = [
    2,                         // number of lights
    200,200,200, 0,1,0,        // light 1, x,y,z location, and rgb colour (green)
    100,100,100, 1,1,1,        // light 2, x,y,z location, and rgb colour (white)
];
var precompute = generatePrecompute(camera,lights,objects);

var mykernel = doit("gpu");
var mycode   = doit("cpu");
mykernel(camera,lights,objects,precompute);
var canvas = mykernel.getCanvas();
document.getElementsByTagName('body')[0].appendChild(canvas);
console.log("run1");

var f = document.querySelector("#fps");
function renderLoop() {
    f.innerHTML = fps.getFPS();
    if (selection === 0) {
        mycode(camera,lights,objects,precompute);
        var cv = document.getElementsByTagName("canvas")[0];
        var bdy = cv.parentNode;
        var newCanvas = mycode.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    } else {
        mykernel(camera,lights,objects,precompute);
        cv = document.getElementsByTagName("canvas")[0];
        bdy = cv.parentNode;
        newCanvas = mykernel.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    }
    objects[10] = (objects[10]+2) % 900;
    objects[24] = (objects[24]+2) % 700;

    precompute = generatePrecompute(camera,lights,objects);
    //setTimeout(renderLoop,1);            // Uncomment this line, and comment the next line
    requestAnimationFrame(renderLoop);     // to see how fast this could run...
}
window.onload = renderLoop;
