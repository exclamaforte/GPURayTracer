var gpu = new GPU();

function sqr(x) {
    return x*x;
}

function squareRoot(x1) {
    return Math.sqrt(x1);
}
function dist(x1,y1,z1,x2,y2,z2) {
    return squareRoot(sqr(x1 - x2) + sqr(y1 - y2) + sqr(z1 - z2));
}
function dot(x1,y1,z1,x2,y2,z2) {
    return x1 * x2 + y1 * y2 + z1 * z2;
}

function size(x1,y1,z1) {
    return squareRoot(sqr(x1) + sqr(y1) + sqr(z1));
}
function projDist (x1,y1,z1,x2,y2,z2) {
    return dot(x1,y1,z1,x2,y2,z2) / sqr(size(x2,y2,z2));
}

gpu.addFunction(sqr);
gpu.addFunction(dist);
gpu.addFunction(size);
gpu.addFunction(dot);
gpu.addFunction(squareRoot);
gpu.addFunction(projDist);

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
function testVector() {
    var a = vector(1,2,3);
    var b = vector(3,2,1);
    console.log(vectorSub(a,b));
    console.log(unitVector(vector(1,1,1)));
}

function generatePrecompute(camera, objects, objects, width, height) {
    var eye = unitVector(vectorSub(vector(camera[3], camera[4], camera[5]),
                                   vector(camera[0], camera[1], camera[2]))),
        right = unitVector(crossProduct(eye, {x: 0, y: 1, z: 0})),
        up = unitVector(crossProduct(right, eye)),
        fovRadians = Math.PI * (camera[6]) / 360, //9
        heightWidthRatio = height / width, //10
        halfWidth = Math.tan(fovRadians), //11
        halfHeight = heightWidthRatio * halfWidth, //12
        cameraWidth = halfWidth * 2, //13
        cameraHeight = halfHeight * 2, //14
        pixelWidth = cameraWidth / (width - 1), //15
        pixelHeight = cameraHeight / (height - 1); //16
    return [eye.x,eye.y,eye.z,
            right.x,right.y,right.z,
            up.x,up.y,up.z,
            fovRadians, heightWidthRatio, halfWidth, halfHeight,
            cameraWidth, cameraHeight, pixelWidth, pixelHeight];
}

function raytrace(mode){
    return function raytrace(numObjects) {
        var opt = {
            dimensions: [WIDTH,HEIGHT],
            debug: true,
            graphical: true,
            safeTextureReadHack: false,
            mode: mode
        };

        var y = gpu.createKernel(function(Camera,Lights,Objects,PreCompute) {
            var xScale = this.thread.x * PreCompute[15] - PreCompute[11],
                yScale = this.thread.y * PreCompute[16] - PreCompute[12];
            var xcompX = PreCompute[3] * xScale,
                xcompY = PreCompute[4] * xScale,
                xcompZ = PreCompute[5] * xScale,
                ycompX = PreCompute[6] * yScale,
                ycompY = PreCompute[7] * yScale,
                ycompZ = PreCompute[8] * yScale;
            //The ray coming off camera
            var rayX = xcompX + ycompX + PreCompute[0],
                rayY = xcompY + ycompY + PreCompute[1],
                rayZ = xcompZ + ycompZ + PreCompute[2],
                lener = squareRoot(sqr(rayX) + sqr(rayY) + sqr(rayZ));
            rayX /= lener;
            rayY /= lener;
            rayZ /= lener;
            var colorR = 0,
                colorG = 0,
                colorB = 0;
            //start of trace method
            var bounced = 0, //whether or not the ray bounced
                lambertAmountR = 0,
                lambertAmountG = 0,
                lambertAmountB = 0,
                objStart = 1, //pointing to the current object start
                dist = this.constants.MAXVAL, //distance to the closest object
                closest = -1; //index of the closest object, or objStart of closest object
            for (var objNum = 0; objNum < this.constants.OBJCOUNT; objNum += 1) {
                var objLen = Objects[objStart + 1],
                    objType = Objects[objStart];
                if (objType == this.constants.SPHERE) {
                    var eyeToCenterX = Objects[objStart + 9] - Camera[0],
                        eyeToCenterY = Objects[objStart + 10] - Camera[1],
                        eyeToCenterZ = Objects[objStart + 11] - Camera[2],
                        vDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ,
                                   rayX, rayY, rayZ),
                        eoDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ,
                                    eyeToCenterX, eyeToCenterY, eyeToCenterZ),
                        discriminant = (Objects[objStart + 12] * Objects[objStart + 12]) - eoDot + (vDot * vDot);
                    if (discriminant >= 0) {
                        var dd = vDot - Math.sqrt(discriminant);
                        if (dist > dd) {
                            dist = dd;
                            closest = objStart;
                        }
                        bounced = 1;
                    }
                }
                objStart += objLen;
            }
            if (bounced != 0) { //the ray has bounced
                var pointAtTimeX = Camera[0] + rayX * dist,
                    pointAtTimeY = Camera[1] + rayY * dist,
                    pointAtTimeZ = Camera[2] + rayZ * dist;
                var normalX = pointAtTimeX - Objects[closest + 9],
                    normalY = pointAtTimeY - Objects[closest + 10],
                    normalZ = pointAtTimeZ - Objects[closest + 11],
                    len = squareRoot(sqr(normalX) + sqr(normalY) + sqr(normalZ));
                normalX /= len;
                normalY /= len;
                normalZ /= len;
                if (Objects[closest + 6] > 0) {
                    var lightNum = 1;
                    for (var j = 0; j < this.constants.LIGHTCOUNT; j += 1) {
                        var objStart1 = 1;
                        var circleToLightX = Lights[lightNum] - pointAtTimeX,
                            circleToLightY = Lights[lightNum + 1] - pointAtTimeY,
                            circleToLightZ = Lights[lightNum + 2] - pointAtTimeZ,
                            dist1 = squareRoot(sqr(circleToLightX) + sqr(circleToLightY) + sqr(circleToLightZ));
                        circleToLightX /= dist1;
                        circleToLightY /= dist1;
                        circleToLightZ /= dist1;
                        var blocked = 0;
                        for (var objNum1 = 0; objNum1 < this.constants.OBJCOUNT; objNum1 += 1) {
                            var objLen1 = Objects[objStart1 + 1],
                                objType1 = Objects[objStart1];
                            if (objStart1 != closest) { //we dont want to check if it blocks itsel
                                if (objType1 == this.constants.SPHERE) {
                                    var pointToCenterX = Objects[objStart1 + 9] - pointAtTimeX,
                                        pointToCenterY = Objects[objStart1 + 10] - pointAtTimeY,
                                        pointToCenterZ = Objects[objStart1 + 11] - pointAtTimeZ,
                                        vDot1 = dot(pointToCenterX, pointToCenterY, pointToCenterZ,
                                                    circleToLightX, circleToLightY, circleToLightZ),
                                        eoDot1 = dot(pointToCenterX, pointToCenterY, pointToCenterZ,
                                                     pointToCenterX, pointToCenterY, pointToCenterZ),
                                        discriminant1 = sqr(Objects[objStart1 + 12]) - eoDot1 + sqr(vDot1);
                                    //need to make sure the descriminant is >=0 and the object is in between
                                    if (discriminant1 >= 0 && vDot1 >= 0 && vDot1 <= dist1) {
                                        blocked = 1;
                                    }
                                }
                            }
                            objStart1 += objLen1;
                        }
                        if (blocked == 0) {
                            //light is not blocked
                            var contribution = 100 * dot(circleToLightX,circleToLightY,circleToLightZ,
                                                         normalX,normalY,normalZ) / sqr(dist1);
                            //var contribution = 1;
                            if (contribution > 0) {
                                lambertAmountR += contribution * Lights[lightNum + 3];
                                lambertAmountG += contribution * Lights[lightNum + 4];
                                lambertAmountB += contribution * Lights[lightNum + 5];
                            }
                        }
                        lightNum += 6;
                    }
                }
            } else {
                colorR = 255;
                colorG = 255;
                colorB = 255;
            }
            colorR += Objects[closest + 2] * (lambertAmountR * Objects[closest + 6] + Objects[closest + 7]);
            colorG += Objects[closest + 3] * (lambertAmountG * Objects[closest + 6] + Objects[closest + 7]);
            colorB += Objects[closest + 4] * (lambertAmountB * Objects[closest + 6] + Objects[closest + 7]);

            this.color(colorR, colorG, colorB);
        }, opt);
        return y.constants({ OBJCOUNT: numObjects, LIGHTCOUNT: lights[0],
                             EMPTY: ObjTyp.EMPTY,    SPHERE: ObjTyp.SPHERE,   CUBOID: ObjTyp.CUBOID,
                             CYLINDER: ObjTyp.CYLINDER,   CONE: ObjTyp.CONE,   PYRAMID: ObjTyp.PYRAMID,
                             WIDTH: WIDTH, HEIGHT: HEIGHT, MAXBOUNCE: 3, MAXVAL: 214748});
    };
}
//This calculates whether there is a sphere inside of a segment
function calculateSegments(mode) {
    return function doit(numObjects) {
        var opt = {
            dimensions: [CHUNKS,CHUNKS],
            debug: true,
            mode: mode
        };

        var y = gpu.createKernel(function(Camera,Objects,PreCompute) {
            //creating each of the relevant vectors.
            var tlx = this.thread.x * this.constants.PWPC,
                tly = this.thread.y * this.constants.PHPC;
            var xScale = tlx * PreCompute[15] - PreCompute[11];
            var yScale = tly * PreCompute[16] - PreCompute[12];
            var xcompX = PreCompute[3] * xScale,
                xcompY = PreCompute[4] * xScale,
                xcompZ = PreCompute[5] * xScale,
                ycompX = PreCompute[6] * yScale,
                ycompY = PreCompute[7] * yScale,
                ycompZ = PreCompute[8] * yScale;
            var topLeftRayXU = xcompX + ycompX + PreCompute[0],
                topLeftRayYU = xcompY + ycompY + PreCompute[1],
                topLeftRayZU = xcompZ + ycompZ + PreCompute[2],
                topLeftLength = squareRoot(sqr(topLeftRayXU) + sqr(topLeftRayYU) + sqr(topLeftRayZU));

            var trx = (this.thread.x + 1) * this.constants.PWPC,
                trY = this.thread.y * this.constants.PHPC;
            xScale = trx * PreCompute[15] - PreCompute[11];
            yScale = trY * PreCompute[16] - PreCompute[12];
            xcompX = PreCompute[3] * xScale;
            xcompY = PreCompute[4] * xScale;
            xcompZ = PreCompute[5] * xScale;
            ycompX = PreCompute[6] * yScale;
            ycompY = PreCompute[7] * yScale;
            ycompZ = PreCompute[8] * yScale;
            var topRightRayXU = xcompX + ycompX + PreCompute[0],
                topRightRayYU = xcompY + ycompY + PreCompute[1],
                topRightRayZU = xcompZ + ycompZ + PreCompute[2],
                topRightLength = squareRoot(sqr(topRightRayXU) + sqr(topRightRayYU) + sqr(topRightRayZU));

            var blx = this.thread.x * this.constants.PWPC,
                bly = (this.thread.y + 1) * this.constants.PHPC;
            xScale = blx * PreCompute[15] - PreCompute[11];
            yScale = bly * PreCompute[16] - PreCompute[12];
            xcompX = PreCompute[3] * xScale;
            xcompY = PreCompute[4] * xScale;
            xcompZ = PreCompute[5] * xScale;
            ycompX = PreCompute[6] * yScale;
            ycompY = PreCompute[7] * yScale;
            ycompZ = PreCompute[8] * yScale;
            var bottomLeftRayXU = xcompX + ycompX + PreCompute[0],
                bottomLeftRayYU = xcompY + ycompY + PreCompute[1],
                bottomLeftRayZU = xcompZ + ycompZ + PreCompute[2],
                bottomLeftLength = squareRoot(sqr(bottomLeftRayXU) + sqr(bottomLeftRayYU) + sqr(bottomLeftRayZU));

            var brx = (this.thread.x + 1) * this.constants.PWPC,
                bry = (this.thread.y + 1) * this.constants.PHPC;
            xScale = brx * PreCompute[15] - PreCompute[11];
            yScale = bry * PreCompute[16] - PreCompute[12];
            xcompX = PreCompute[3] * xScale;
            xcompY = PreCompute[4] * xScale;
            xcompZ = PreCompute[5] * xScale;
            ycompX = PreCompute[6] * yScale;
            ycompY = PreCompute[7] * yScale;
            ycompZ = PreCompute[8] * yScale;
            var bottomRightRayXU = xcompX + ycompX + PreCompute[0],
                bottomRightRayYU = xcompY + ycompY + PreCompute[1],
                bottomRightRayZU = xcompZ + ycompZ + PreCompute[2],
                bottomRightLength = squareRoot(sqr(bottomRightRayXU) + sqr(bottomRightRayYU) + sqr(bottomRightRayZU));
            //{top|bottom}{Right|Left}Rays are rays that bound the viewing angle
            //Plane is defined by Ax + By + Cz + D = 0, so need to calculate.
            var oneA = (bottomLeftRayYU * topLeftRayZU) - (topLeftRayYU * bottomLeftRayZU),
                oneB = (bottomLeftRayZU * topLeftRayXU) - (topLeftRayZU * bottomLeftRayXU),
                oneC = (bottomLeftRayXU * topLeftRayYU) - (topLeftRayXU * bottomLeftRayYU),
                oneD = oneA * Camera[0] + oneB * Camera[1] + oneC * Camera[2],
                oneV = squareRoot(sqr(oneA) + sqr(oneB) + sqr(oneC));

            var twoA = (topLeftRayYU * topRightRayZU) - (topRightRayYU * topLeftRayZU),
                twoB = (topLeftRayZU * topRightRayXU) - (topRightRayZU * topLeftRayXU),
                twoC = (topLeftRayXU * topRightRayYU) - (topRightRayXU * topLeftRayYU),
                twoD = twoA * Camera[0] + twoB * Camera[1] + twoC * Camera[2],
                twoV = squareRoot(sqr(twoA) + sqr(twoB) + sqr(twoC));

            var threeA = (topRightRayYU * bottomRightRayZU) - (bottomRightRayYU * topRightRayZU),
                threeB = (topRightRayZU * bottomRightRayXU) - (bottomRightRayZU * topRightRayXU),
                threeC = (topRightRayXU * bottomRightRayYU) - (bottomRightRayXU * topRightRayYU),
                threeD = threeA * Camera[0] + threeB * Camera[1] + threeC * Camera[2],
                threeV = squareRoot(sqr(threeA) + sqr(threeB) + sqr(threeC));

            var fourA = (bottomRightRayYU * bottomLeftRayZU) - (bottomLeftRayYU * bottomRightRayZU),
                fourB = (bottomRightRayZU * bottomLeftRayXU) - (bottomLeftRayZU * bottomRightRayXU),
                fourC = (bottomRightRayXU * bottomLeftRayYU) - (bottomLeftRayXU * bottomRightRayYU),
                fourD = fourA * Camera[0] + fourB * Camera[1] + fourC * Camera[2],
                fourV = squareRoot(sqr(fourA) + sqr(fourB) + sqr(fourC));

            var objStart = 1;
            var ret = 0;
            for (var objNum = 0; objNum < this.constants.OBJCOUNT; objNum += 1) {
                var objType = Objects[objStart],
                    objLen = Objects[objStart + 1];
                var rad = Objects[objStart + 12];
                if (objType == this.constants.SPHERE) {
                    // calculating the distance from the sphere to each plane
                    var dOne = (dot(oneA, oneB, oneC,
                                    Objects[objStart + 9], Objects[objStart + 10] , Objects[objStart + 11])
                                + oneD) / oneV,
                        dTwo = (dot(twoA, twoB, twoC,
                                    Objects[objStart + 9], Objects[objStart + 10] , Objects[objStart + 11])
                                + twoD) / twoV,
                        dThree = (dot(threeA, threeB, threeC,
                                      Objects[objStart + 9], Objects[objStart + 10] , Objects[objStart + 11])
                                  + threeD) / threeV,
                        dFour = (dot(fourA, fourB, fourC,
                                     Objects[objStart + 9], Objects[objStart + 10] , Objects[objStart + 11])
                                 + fourD) / fourV;
                    var fudge = 1;
                    if (dOne >= -fudge * 2 * rad && dTwo >= -fudge * 2 * rad && dThree >= -fudge * 2 * rad && dFour >= -fudge * 2 * rad ) {
                        ret = 1;
                    }
                }
                objStart += objLen;
            }
            return ret;
        }, opt);
        return y.constants({ OBJCOUNT: numObjects, SPHERE: ObjTyp.SPHERE,   CUBOID: ObjTyp.CUBOID,
                             CYLINDER: ObjTyp.CYLINDER,   CONE: ObjTyp.CONE,   PYRAMID: ObjTyp.PYRAMID,
                             WIDTH: WIDTH, HEIGHT: HEIGHT, MAXVAL: 2147483646, PWPC:PWPC, PHPC:PHPC});
    };
}
//Basically the same thing as raytrace, but for the segment portion
function raytraceSegment(mode) {
    var y = gpu.createKernel(function(Camera,Lights,Objects,PreCompute) {
        var xScale = (this.thread.x + this.constants.XSTART) * PreCompute[15] - PreCompute[11],
            yScale = (this.thread.y + this.constants.YSTART) * PreCompute[16] - PreCompute[12];
        var xcompX = PreCompute[3] * xScale,
            xcompY = PreCompute[4] * xScale,
            xcompZ = PreCompute[5] * xScale,
            ycompX = PreCompute[6] * yScale,
            ycompY = PreCompute[7] * yScale,
            ycompZ = PreCompute[8] * yScale;
        //The ray coming off camera
        var rayX = xcompX + ycompX + PreCompute[0],
            rayY = xcompY + ycompY + PreCompute[1],
            rayZ = xcompZ + ycompZ + PreCompute[2],
            lener = squareRoot(sqr(rayX) + sqr(rayY) + sqr(rayZ));
        rayX /= lener;
        rayY /= lener;
        rayZ /= lener;
        var colorR = 0,
            colorG = 0,
            colorB = 0;
        //start of trace method
        //for (var i = 0; i < this.constants.MAXBOUNCE; i++) {
        var bounced = 0, //whether or not the ray bounced
            lambertAmountR = 0,
            lambertAmountG = 0,
            lambertAmountB = 0,
            objStart = 1, //pointing to the current object start
            dist = this.constants.MAXVAL, //distance to the closest object
            closest = -1; //index of the closest object, or objStart of closest object
        for (var objNum = 0; objNum < this.constants.OBJCOUNT; objNum += 1) {
            var objLen = Objects[objStart + 1],
                objType = Objects[objStart];
            if (objType == this.constants.SPHERE) {
                var eyeToCenterX = Objects[objStart + 9] - Camera[0],
                    eyeToCenterY = Objects[objStart + 10] - Camera[1],
                    eyeToCenterZ = Objects[objStart + 11] - Camera[2],
                    vDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ,
                               rayX, rayY, rayZ),
                    eoDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ,
                                eyeToCenterX, eyeToCenterY, eyeToCenterZ),
                    discriminant = sqr(Objects[objStart + 12]) - eoDot + (vDot * vDot);
                if (discriminant >= 0) {
                    var dd = vDot - squareRoot(discriminant);
                    if (dist > dd) {
                        dist = dd;
                        closest = objStart;
                    }
                    bounced = 1;
                }
            }
            objStart += objLen;
        }
        if (bounced != 0) {
            //pointATime is where the ray intersects the sphere
            var pointAtTimeX = Camera[0] + rayX * dist,
                pointAtTimeY = Camera[1] + rayY * dist,
                pointAtTimeZ = Camera[2] + rayZ * dist;
            var normalX = pointAtTimeX - Objects[closest + 9],
                normalY = pointAtTimeY - Objects[closest + 10],
                normalZ = pointAtTimeZ - Objects[closest + 11],
                len = squareRoot(sqr(normalX) + sqr(normalY) + sqr(normalZ));
            normalX /= len;
            normalY /= len;
            normalZ /= len;
            if (Objects[closest + 6] > 0) {
                var lightNum = 1;
                for (var j = 0; j < this.constants.LIGHTCOUNT; j += 1) {
                    var objStart1 = 1;
                    var circleToLightX = Lights[lightNum] - pointAtTimeX,
                        circleToLightY = Lights[lightNum + 1] - pointAtTimeY,
                        circleToLightZ = Lights[lightNum + 2] - pointAtTimeZ,
                        dist1 = squareRoot(sqr(circleToLightX) + sqr(circleToLightY) + sqr(circleToLightZ));
                    circleToLightX /= dist1;
                    circleToLightY /= dist1;
                    circleToLightZ /= dist1;
                    var blocked = 0;
                    for (var objNum1 = 0; objNum1 < this.constants.OBJCOUNT; objNum1 += 1) {
                        var objLen1 = Objects[objStart1 + 1],
                            objType1 = Objects[objStart1];
                        if (objStart1 != closest) {
                            if (objType1 == this.constants.SPHERE) {
                                var pointToCenterX = Objects[objStart1 + 9] - pointAtTimeX,
                                    pointToCenterY = Objects[objStart1 + 10] - pointAtTimeY,
                                    pointToCenterZ = Objects[objStart1 + 11] - pointAtTimeZ,
                                    vDot1 = dot(pointToCenterX, pointToCenterY, pointToCenterZ,
                                                circleToLightX, circleToLightY, circleToLightZ),
                                    eoDot1 = dot(pointToCenterX, pointToCenterY, pointToCenterZ,
                                                 pointToCenterX, pointToCenterY, pointToCenterZ),
                                    discriminant1 = sqr(Objects[objStart1 + 12]) - eoDot1 + sqr(vDot1);
                                if (discriminant1 >= 0 && vDot1 >= 0 && vDot1 <= dist1) {
                                    blocked = 1;
                                }
                            }
                        }
                        objStart1 += objLen1;
                    }
                    if (blocked == 0) {
                        var contribution = 100 * dot(circleToLightX,circleToLightY,circleToLightZ,
                                                     normalX,normalY,normalZ) / sqr(dist1);
                        if (contribution > 0) {
                            lambertAmountR += contribution * Lights[lightNum + 3];
                            lambertAmountG += contribution * Lights[lightNum + 4];
                            lambertAmountB += contribution * Lights[lightNum + 5];
                        }
                    }
                    lightNum += 6;
                }
            }
        } else {
            colorR = 255;
            colorG = 255;
            colorB = 255;
        }
        colorR += Objects[closest + 2] * (lambertAmountR * Objects[closest + 6] + Objects[closest + 7]);
        colorG += Objects[closest + 3] * (lambertAmountG * Objects[closest + 6] + Objects[closest + 7]);
        colorB += Objects[closest + 4] * (lambertAmountB * Objects[closest + 6] + Objects[closest + 7]);
        this.color(colorR, colorG, colorB);
    }).dimensions([PWPC,PHPC]).debug(true).graphical(true).mode(mode);
    return function (xstart, ystart) {
        return y.constants({ OBJCOUNT: objects[0], LIGHTCOUNT: lights[0], XSTART: xstart, YSTART: ystart,
                             EMPTY: ObjTyp.EMPTY,    SPHERE: ObjTyp.SPHERE,   CUBOID: ObjTyp.CUBOID,
                             CYLINDER: ObjTyp.CYLINDER,   CONE: ObjTyp.CONE,   PYRAMID: ObjTyp.PYRAMID,
                             MAXBOUNCE: 3, MAXVAL: 2147483646});
    };
}


var mykernel = raytrace("gpu");
var mycode   = raytrace("cpu");
var kernalSeg = raytraceSegment("gpu");
var codeSeg = raytraceSegment("cpu");
var myKernalSegments = calculateSegments("gpu");
var myCodeSegments = calculateSegments("cpu");
var precompute = generatePrecompute(camera,lights,objects, WIDTH, HEIGHT);
var d = mykernel(objects[0]);
d(camera,lights,objects,precompute);
var canvas = d.getCanvas();
document.getElementsByTagName('body')[0].appendChild(canvas);
var ctx = canvas.getContext('2d');

var f = document.querySelector("#fps");
var i = 0;
var camerax = 0;
var cameray = 0;
var camrad = camera[0];
function renderLoop() {
    objects = sphereSphere(count);
    f.innerHTML = fps.getFPS();
    var cv = document.getElementsByTagName("canvas")[0];
    var bdy = cv.parentNode;
    var ctx = cv.getContext("2d");
    var precompute = generatePrecompute(camera,lights,objects,WIDTH, HEIGHT);
    if (selection === 0) {
        if (segment) {
            var newCanvas = document.createElement('canvas');
            newCanvas.width = WIDTH;
            newCanvas.height = HEIGHT;
            ctx = newCanvas.getContext("2d");
            var seg = myCodeSegments(objects[0])(camera,objects,precompute);
            for (j = 0; j < CHUNKS; j++) {
                for (i = 0; i < CHUNKS; i++) {
                    if (seg[CHUNKS - j - 1][CHUNKS - i - 1] == 1) {
                        var tt = codeSeg(i * PWPC, j * PHPC);
                        tt(camera, lights,objects,precompute);
                        var ww = tt.getCanvas();
                        ctx.putImageData(tt.getCanvas().getContext("2d").getImageData(0,0,PWPC,PHPC),
                                         i * PWPC, (CHUNKS - j - 1) * PHPC);
                    } else {
                        ctx.putImageData(WHITE.getImageData(0,0,PWPC,PHPC),
                                         i * PWPC, (CHUNKS - j - 1) * PHPC);
                    }
                }
            }
            bdy.replaceChild(newCanvas, cv);
        } else {
            var d = mycode(objects[0]);
            d(camera,lights,objects,precompute);
            newCanvas = d.getCanvas();
            bdy.replaceChild(newCanvas, cv);
        }
    } else {
        if (segment) {
            newCanvas = document.createElement('canvas');
            newCanvas.width = WIDTH;
            newCanvas.height = HEIGHT;
            ctx = newCanvas.getContext("2d");
            seg = myKernalSegments(objects[0])(camera,objects,precompute);
            for (j = 0; j < CHUNKS; j++) {
                for (i = 0; i < CHUNKS; i++) {
                    if (seg[CHUNKS - j - 1][CHUNKS - i - 1] == 1) {
                        tt = kernalSeg(i * PWPC, j * PHPC);
                        tt(camera, lights,objects,precompute);
                        ww = tt.getCanvas();
                        ctx.putImageData(tt.getCanvas().getContext("2d").getImageData(0,0,PWPC,PHPC),
                                         i * PWPC, (CHUNKS - j - 1) * PHPC);
                    } else {
                        ctx.putImageData(WHITE.getImageData(0,0,PWPC,PHPC),
                                         i * PWPC, (CHUNKS - j - 1) * PHPC);
                    }
                }
            }
            bdy.replaceChild(newCanvas, cv);
        } else {
            d = mykernel(objects[0]);
            d(camera,lights,objects,precompute);
            newCanvas = d.getCanvas();
            bdy.replaceChild(newCanvas, cv);
        }
    }
    //i += .01;
    //lights[1] = 10 * Math.cos(i);
    //lights[2] = 10 * Math.sin(i);
    //objects[10] = (objects[10]+2) % 900;
    //objects[24] = (objects[24]+2) % 700;
    camerax += .05;
    cameray += .1;
    camera[0] = camrad * Math.cos(camerax);
    camera[2] = camrad * Math.sin(camerax);

    //setTimeout(renderLoop,1);            // Uncomment this line, and comment the next line
    if (!paused) {
        requestAnimationFrame(renderLoop);     // to see how fast this could run...
    }
}
window.onload = renderLoop;
