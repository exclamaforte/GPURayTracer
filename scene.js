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

var ObjTyp = {'EMPTY': 0.0, 'SPHERE': 1.0,
              'CUBOID': 2.0, 'CYLINDER': 3.0,
              'CONE': 4.0, 'PYRAMID': 5.0};
var camera = [
    //-150,-225,-150,    // x,y,z coordinates
    20, 0,0,
    1,0,0,
    //0.5773502691896258, 0.5773502691896258, 0.5773502691896258,// Direction normal vector
    45  // field of view : example 45
];
//x[0],y[1],z[2]
//xdir[3],ydir[4],zdir[5]
//fov[6]

// var objects = [
//     2, // number of objects
//     ObjTyp.SPHERE,      13, 1.0,0.0,0.0,0.2, 0.7 ,0.1,1.0, 100,500,500,40,
//     // typ0           recsz1 r2 g3  b4 spec5 lamb6 amb7,opac8, x9,  y10,  z11,rad12,
//     ObjTyp.SPHERE,      13, 0.0,0.0,1.0,0.2,0.7,0.1,1.0, 200,600,200,20            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
// ];
var objects = [3]
// .concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2, 0.7 ,0.7,1.0, 100,// 500,500,40))
// .concat(shape(ObjTyp.SPHERE, 0.0,0.0,1.0,0.2,0.7,0.7,1.0, 200,600,200,40))
        .concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2,0.7,0.5,1.0, 0,-3,0, 3)) //0 R
        .concat(shape(ObjTyp.SPHERE, 0.333,0.167,0.5,0.2,0.7,0.5,1.0, 0,1,0, 1)) //1 G
        .concat(shape(ObjTyp.SPHERE, 0.0,1.0,0.0,0.2,0.7,0.5,1.0, 0,3,0, 0.5)); // 2 B

var WIDTH = 800;
var HEIGHT = 600;
var CHUNKS = 20;
var PWPC = WIDTH / CHUNKS;
var PHPC = HEIGHT / CHUNKS;

var lights = [
    2,                         // number of lights
    // 200,200,200, 0,1,0,        // light 1, x,y,z location, and rgb colour (green)
    // 100,100,100, 1,1,1,        // light 2, x,y,z location, and rgb colour (white)
    0,10,0,  1,1,1,
    10,0,0,  1,1,1
];

var cw = document.createElement("canvas");
cw.width = PWPC;
cw.height = PHPC;
var WHITE = cw.getContext("2d");
WHITE.fillRect(0,0,PWPC,PHPC);
