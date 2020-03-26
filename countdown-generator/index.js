'use strict';

const GIFEncoder = require('gif-encoder-2');
const Canvas = require('canvas');
const moment = require('moment');

class OptimizedTextGIFEncoder extends GIFEncoder {
    constructor(width, height, bgColor, textColor, aliasingSamples = 4) {
        super(width, height);

        // create canvas (canvas management is done internally to optimize rendering)
        this.canvas = new Canvas(this.width, this.height);
        this.canvasBGColor = '#000000';
        this.canvasTextColor = '#ffffff';
        this.aliasingSamples = Math.max(4, Math.min(aliasingSamples, 32));
        this.ctx = this.canvas.getContext('2d');
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // pre compute color palette
        this.computePalette(bgColor, textColor);
    }
    computePalette(bgColor, textColor, ) {
        bgColor = this.rgbToByte(bgColor);
        textColor = this.rgbToByte(textColor);

        const aliasingSamples = this.aliasingSamples;
        let c = 0;
        let d = 0;
        let step = 1 / aliasingSamples;
        let colorTab = new Uint8Array(3 * (aliasingSamples + 1));
        colorTab[0] = bgColor[0];
        colorTab[1] = bgColor[1];
        colorTab[2] = bgColor[2];
        for (let i = 1, total = aliasingSamples + 1; i < total; i++) {
            c = (i + 1) === total ? 1 : c + step;
            d = 1 - c;
            colorTab[i * 3] = ~~((bgColor[0] * d + textColor[0] * c));
            colorTab[i * 3 + 1] = ~~((bgColor[1] * d + textColor[1] * c));
            colorTab[i * 3 + 2] = ~~((bgColor[2] * d + textColor[2] * c));
        }
        this.colorTab = colorTab;
        this.colorDepth = 8
        this.palSizeNeu = 7
    }
    rgbToByte(rgb) {
        rgb = rgb.replace('#', '');
        rgb = parseInt(rgb, 16);
        let buf = new Uint8Array(3);
        buf[0] = (rgb & 0xff0000) >> 16;
        buf[1] = (rgb & 0x00ff00) >> 8;
        buf[2] = (rgb & 0x0000ff);
        return buf;
    }
    addTextFrame(text) {
        const width = this.width;
        const height = this.height;
        const canvasBGColor = this.canvasBGColor;
        const canvasTextColor = this.canvasTextColor;
        const minMargin = 20;
        const minFontSize = 10;
        const font = 'Arial';
        let ctx = this.ctx;
        let fontSize = Math.max(~~(width / (text.length * 0.60)), minFontSize);

        // calculate optimized font size
        while (fontSize > minFontSize) {
            ctx.font = fontSize + 'px ' + font;
            let textWidth = ctx.measureText(text).width
            if (textWidth + minMargin <= width) {
                break;
            }
            fontSize = fontSize - 1;
        }
        ctx.font = fontSize + 'px ' + font;

        // paint canvas
        ctx.fillStyle = canvasBGColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = canvasTextColor;
        ctx.fillText(text, ~~(width / 2), ~~(height / 2));

        // render frame
        this.optimizedAddFrame(ctx);
    }
    optimizedAddFrame(input) {
        const width = this.width;
        const height = this.height;
        const limit = 0xff * 3;
        const aliasingSamples = this.aliasingSamples;
        let data = input;
        if (input && input.getImageData) {
            data = input.getImageData(0, 0, width, height).data
        }

        let indexedPixels = new Uint8Array(width * height * 3);
        let count = 0;
        for (let i = 0, total = width * height * 4; i < total; i = i + 4) {
            // skip setting 0 index, as array is already initialized to 0
            // skipping the arithmetic inside this if improves loop performance about 10 percent
            let pixelSum = data[i] + data[i + 1] + data[i + 2];
            if (pixelSum !== 0) {
                indexedPixels[count] = Math.round((pixelSum * aliasingSamples) / limit);
            }
            count++;
        }
        this.indexedPixels = indexedPixels;

        // write first frame escape sequence
        if (this.firstFrame) {
            this.writeLSD();
            this.writePalette();
            if (this.repeat >= 0) {
                this.writeNetscapeExt();
            }
        }

        // write frame
        this.writeGraphicCtrlExt();
        this.writeImageDesc();
        if (!this.firstFrame) {
            this.writePalette();
        }
        this.writePixels();
        this.firstFrame = false;

        // write to additional read streams as needed
        this.emitData();
    }
}

module.exports = {
    init: function (time, width = 200, height = 200, color = '000000', bg = 'ffffff', frames = 30, format = '%H:%M:%S', message = 'Expired!', response) {
        this.frames = this.clamp(frames, 1, 90);
        this.format = this.clampString(format, 80);
        this.message = this.clampString(message, 100);
        this.response = response;
        this.encoder = new OptimizedTextGIFEncoder(
            this.clamp(width, 150, 600),  // width
            this.clamp(height, 150, 600), // height
            '#' + bg,                     // bg color
            '#' + color,                  // text color
            8                             // aliasing samples
        );
        this.encode(this.time(time));
    },
    clamp: function (number, min, max) {
        return Math.max(min, Math.min(number, max));
    },
    clampString: function (string, max) {
        return string.substring(0, Math.min(max, string.length));
    },
    time: function (timeString) {
        let target = moment(timeString);
        let current = moment();
        return moment.duration(target.diff(current));
    },
    encodeDuration(duration) {
        if (!moment.isDuration(duration) || duration.asMilliseconds() < 0) {
            return this.message;
        }

        // get time parts
        let days = ~~(duration.asDays());
        let hours = ~~(duration.asHours() - (days * 24));
        let minutes = ~~(duration.asMinutes()) - (days * 24 * 60) - (hours * 60);
        let seconds = ~~(duration.asSeconds()) - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);
        let hoursPadded = (hours.toString().length == 1) ? '0' + hours : hours;
        let minutesPadded = (minutes.toString().length == 1) ? '0' + minutes : minutes;
        let secondsPadded = (seconds.toString().length == 1) ? '0' + seconds : seconds;
        let timeParts = [
            [/%d/g, days],
            [/%h/g, hours],
            [/%m/g, minutes],
            [/%s/g, seconds],
            [/%H/g, hoursPadded],
            [/%M/g, minutesPadded],
            [/%S/g, secondsPadded]
        ];

        // replace time parts
        let result = this.format;
        for (let i = 0, len = timeParts.length; i < len; i++) {
            result = result.replace(timeParts[i][0], timeParts[i][1]);
        }
        // clear out any 0 groups and limiters
        result = result.replace(/\[0+:[^\]]*\]/g, '');
        result = result.replace(/\[\d+:([^\]]*)\]/g, '$1');

        return result;
    },
    encode: function (duration) {
        let enc = this.encoder;
        enc.createReadStream().pipe(this.response);
        enc.start();
        enc.setRepeat(0);
        enc.setDelay(1000);

        // optimize expired countdowns with a single frame
        if (duration.asMilliseconds() < 0) {
            enc.addTextFrame(this.message);
            enc.finish();
            return;
        }

        // generate a frame per second, up to the total frame number
        for (let i = 0; i < this.frames; i++) {
            enc.addTextFrame(this.encodeDuration(duration));
            duration.subtract(1, 'seconds');
        }
        enc.finish();
    }
};
