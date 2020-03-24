'use strict';

// server
const express = require('express');
const app = express();

// canvas generator
const CountdownGenerator = require('./countdown-generator');

// generate and download the gif
app.get('/generate', function (req, res) {
    let { time, width, height, color, bg, frames, format, message } = req.query;
    if (!time) {
        throw Error('Time parameter is required.');
    }
    res.set({ 'Content-type': 'application/octet-stream', 'Content-disposition': 'attachment; filename=countdown.gif' });
    CountdownGenerator.init(time, width, height, color, bg, frames, format, message, res);
});

// serve the gif to a browser
app.get('/serve', function (req, res) {
    let { time, width, height, color, bg, frames, format, message } = req.query;
    if (!time) {
        throw Error('Time parameter is required.');
    }
    res.type('gif');
    CountdownGenerator.init(time, width, height, color, bg, frames, format, message, res);
});

app.listen(process.env.PORT || 3000, function () {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

module.exports = app;
