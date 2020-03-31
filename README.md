# GIF Countdown Generate

Generates animated GIF files, that count down from a specified timestamp.

## Enpoints

The app has two endpoints, `/generate` and `/serve`:
* `/serve` can be used to retrieve the image directly, allowing the URL to be used as a source for an HTML `<img>` element, for example.
* `/generate` can be used to download the GIF file.

## URL Parameters (*required)

| parameter | default  | info                                                                                                                                          |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `time`    | -        | date and time when the countdown will end (see [moment.js](https://momentjs.com/docs/#/parsing/string/) for information on available formats) |
| `frames`  | 30       | number of frames (also number of seconds) the countdown will run before looping                                                               |
| `width`   | 200      | width in pixels                                                                                                                               |
| `height`  | 200      | height in pixels                                                                                                                              |
| `bg`      | 000000   | hex color code for the background                                                                                                             |
| `color`   | ffffff   | hex color code for the text                                                                                                                   |
| `message` | Expired! | message shown after countdown is expired                                                                                                      |
| `format`  | %H:%M:%S | format of the counter string                                                                                                                  |
### `message`

When generating a counter, the `message` parameter may be used in 3 distinct ways:

1. The counter does not expire for the duration of the GIF, therefore `message` is not shown.
2. The counter expires during the GIF animation, `message` is shown for the remaning frames. For example, in a 30 frame GIF that expires at frame 20, there are an additional 10 frames displaying `message`.
3. The counter is already expired at the start, so a single frame GIF displaying `message` is returned.

### `format`

`format` allows customization of how the countdown is displayed in the GIF. Remember that `format` must be URL encoded.

A valid `format` is any string, that can make use of the following special escape codes:
| code | info                                             |
| ---- | ------------------------------------------------ |
| %d   | display the number of remaining days             |
| %h   | display the number of remaining hours            |
| %m   | display the number of remaining minutes          |
| %s   | display the number of remaining seconds          |
| %H   | display the 0 padded number of remaining hours   |
| %M   | display the 0 padded number of remaining minutes |
| %S   | display the 0 padded number of remaining seconds |

Escape codes may be used as many times as needed per `format` string.

Additionally, you may use optional groups. These allow text to be ommited when a specified escape code evaluates to 0. Optional groups are specified as `... [%d:this text won't show if there's less than 1 day on the counter] ...`. Escape codes can also be used as part of the optional string.

Also note that, when using optional codes, if for a specific time fhe formatted string is empty, the `message` is show instead.

#### Examples

| format                                | result                         |
| ------------------------------------- | ------------------------------ |
| `%H:%M:%S`                            | 12:24:01                       |
| `Only %d day left!`                   | Only 1 day left!               |
| `%d days and %h hours to go!`         | 5 days and 12 hours to go!     |
| `[%d:This offer expires in %d days!]` | This offer expires in 12 days! |

## Versions

Tested with and designed for:

* node 6.0.0
* cairo 1.8.6

## License

[MIT](LICENSE)
