(function () {
})();

var gpu = new GPU();
var opt = {
    dimensions: [100, 100],
    debug: true,
    mode: mode,
    graphical: true
};
var render = gpu.createKernel(function (X) {
    this.color(0,0,0,1);
}, opt);

render();
var canvas = render.canvas();
document.getElementByTagName('body').appendChild(canvas);
