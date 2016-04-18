function shape(id) {
    return [id, arguments.length + 1].concat(Array.prototype.slice.call(arguments, 1));
}

var ObjTyp = {'EMPTY': 0.0, 'SPHERE': 1.0,
              'CUBOID': 2.0, 'CYLINDER': 3.0,
              'CONE': 4.0, 'PYRAMID': 5.0};

var camera = [
    100, 0,0,
    1,0,0,
    45
];

// var objects = [
//     2, // number of objects
//     ObjTyp.SPHERE,      13, 1.0,0.0,0.0,0.2, 0.7 ,0.1,1.0, 100,500,500,40,
//     // typ0           recsz1 r2 g3  b4 spec5 lamb6 amb7,opac8, x9,  y10,  z11,rad12,
//     ObjTyp.SPHERE,      13, 0.0,0.0,1.0,0.2,0.7,0.1,1.0, 200,600,200,20            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
// ];
var bigRad = 10;
var littleRad = 2;
function sphereSphere(n) {
    var ret = [n];
    for (i = 1; i < n + 1 ; i++ ) {
        var angle = i * (Math.PI * 2) / n;
        ret = ret.concat(shape(ObjTyp.SPHERE, (i % 2) * .1, (i % 3) * .2, (i % 5) * .5, 0.2, 0.7, 0.5, 0.1,
                               0, Math.sin(angle) * bigRad, Math.cos(angle) * bigRad, littleRad));
    }
    return ret;
}

var objects = sphereSphere(3);
// .concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2, 0.7 ,0.7,1.0, 100,// 500,500,40))
// .concat(shape(ObjTyp.SPHERE, 0.0,0.0,1.0,0.2,0.7,0.7,1.0, 200,600,200,40))
// .concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2,0.7,0.5,1.0, 0,-3,0, 3)) //0 R
// .concat(shape(ObjTyp.SPHERE, 0.0,1.0,0.0,0.2,0.7,0.5,1.0, 0,3,0, 3)) // 2 B
// .concat(shape(ObjTyp.SPHERE, 1.0,0.0,0.0,0.2,0.7,0.5,1.0, 15,-3,15, 3)) //0 R
// .concat(shape(ObjTyp.SPHERE, 0.0,1.0,0.0,0.2,0.7,0.5,1.0, 15,3,15, 3)) // 2 B
// .concat(shape(ObjTyp.SPHERE, 0.0,1.0,0.0,0.2,0.7,0.5,1.0, 12,0,15, 3)) // 2 B
// .concat(shape(ObjTyp.SPHERE, 160/432,32/432,240/432,0.2,0.7,0.5,1.0, 7.5,0,7.5, 3)) // 2 B
// .concat(shape(ObjTyp.SPHERE, 160/432,32/432,240/432,0.2,0.7,0.5,1.0, 7.5,7.5,0, 3)); // 2 B

var WIDTH = 800;
var HEIGHT = 600;
var CHUNKS = 20;
var PWPC = WIDTH / CHUNKS;
var PHPC = HEIGHT / CHUNKS;

var lights = [
    1,                         // number of lights
    // 10,0,0,  1,1,1,
    // 20,0,20, 10,10,10
    0,0,0, 1,1,1
];

var cw = document.createElement("canvas");
cw.width = PWPC;
cw.height = PHPC;
var WHITE = cw.getContext("2d");
WHITE.fillRect(0,0,PWPC,PHPC);
