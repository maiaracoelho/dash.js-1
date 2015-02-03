/*
 */
MediaPlayer.vo.metrics.Delay = function () {
    "use strict";

    this.t = null;      // Real-Time | Time of delay ocurred.
    this.delay = null;  // delay.
    this.quality = null;  // representation.
};

MediaPlayer.vo.metrics.Delay.prototype = {
    constructor: MediaPlayer.vo.metrics.Delay
};