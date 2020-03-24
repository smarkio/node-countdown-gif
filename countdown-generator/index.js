'use strict';

const GIFEncoder = require('gifencoder');
const Canvas = require('canvas');
const moment = require('moment');

module.exports = {
    init: function (time, width = 200, height = 200, color = '000000', bg = 'ffffff', frames = 30, format = '%H:%M:%S', message = 'Expired!', response) {
        this.width = this.clamp(width, 150, 500);
        this.height = this.clamp(height, 150, 500);
        this.frames = this.clamp(frames, 1, 90);
        this.format = this.clampString(format, 80);
        this.message = this.clampString(message, 100);
        this.response = response;
        this.bg = '#' + bg;
        this.textColor = '#' + color;

        this.halfWidth = Number(this.width / 2);
        this.halfHeight = Number(this.height / 2);
        this.encoder = new GIFEncoder(this.width, this.height);
        this.canvas = new Canvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');

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
    addFrame(text) {
        let enc = this.encoder;
        let ctx = this.ctx;

        // calculate optimized font size
        let minMargin = 20, minFontSize = 10, font = 'Arial', fontSize = Math.floor(this.width / (text.length * 0.60));
        fontSize = Math.max(minFontSize, fontSize);
        while (fontSize > minFontSize) {
            ctx.font = fontSize + 'px ' + font;
            let textWidth = ctx.measureText(text).width
            if (textWidth + minMargin <= this.width) {
                break;
            }
            fontSize = fontSize - 1;
        }
        ctx.font = fontSize + 'px ' + font;

        // paint the frame
        ctx.fillStyle = this.bg;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = this.textColor;
        ctx.fillText(text, this.halfWidth, this.halfHeight);
        enc.addFrame(ctx);
    },
    encodeDuration(duration) {
        if (!moment.isDuration(duration) || duration.asMilliseconds() < 0) {
            return this.message;
        }

        // get time parts
        let days = Math.floor(duration.asDays());
        let hours = Math.floor(duration.asHours() - (days * 24));
        let minutes = Math.floor(duration.asMinutes()) - (days * 24 * 60) - (hours * 60);
        let seconds = Math.floor(duration.asSeconds()) - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);
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
        let ctx = this.ctx;

        // stream response
        enc.createReadStream().pipe(this.response);

        // set text alignment
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // start encoding gif with following settings
        enc.start();
        enc.setRepeat(0);
        enc.setDelay(1000);
        enc.setQuality(10);

        // optimize expired countdowns with a single frame
        if (duration.asMilliseconds() < 0) {
            this.addFrame(this.message);
            enc.finish();
            return;
        }

        // generate a frame per second, up to the total frame number
        for (let i = 0; i < this.frames; i++) {
            this.addFrame(this.encodeDuration(duration));
            duration.subtract(1, 'seconds');
        }

        enc.finish();
    }
};
