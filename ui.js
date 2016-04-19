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

var paused = false;
function pause(el) {
    if ( el.value === "Pause") {
        paused = true;
        el.value = "Resume";
    } else {
        paused = false;
        el.value = "Pause";
        renderLoop();
    }
}

var segment = false;
function toggleSegment(el) {
    if ( el.value === "Clipping") {
        segment = true;
        el.value = "No Clipping";
    } else {
        segment = false;
        el.value = "Clipping";
    }
}

var count = 3;
function modifyCount(mod) {
    count += mod;
}

window.onkeydown = function (e) {
    var code = e.keyCode ? e.keyCode : e.which;
    console.log(code);
    if (code === 38) { //up key, towards
        lights[1] += 1;
    } else if (code === 40) { //down key, away
        lights[1] -= 1;
    } else if (code === 37) { //left key, up
        lights[2] += 1;
    } else if (code === 39) { //right key, down
        lights[2] -= 1;
    } else if (code === 81) { //Q key, left
        lights[3] += 1;
    } else if (code === 87) { //W key, right
        lights[3] -= 1;
    } else if (code === 49) { //1 key
        lights[1] = 0;
        lights[2] = 10;
        lights[3] = 0;
    }
    console.log(objects);
};
