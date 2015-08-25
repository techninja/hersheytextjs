Hershey Text JS
=============

A port of the
[EMSL Hershey engraving font](http://www.evilmadscientist.com/2011/hershey-text-an-inkscape-extension-for-engraving-fonts/)
data from the [Hershey Text Inkscape Plugin](https://code.google.com/p/eggbotcode/downloads/list?can=3&q=hershey)
to JSON, capable of being rendered quickly via JavaScript & SVG.

This includes an quickly written example renderer, see the demo on the
[live github page](http://techninja.github.io/hersheytextjs/) to give it a try!

### Node.js Usage
Install via `npm install hersheytext`, then include in your node script with
`var hersheyText = require('hersheytext');`. This will give you access to the
fonts at `hersheyText.fonts`, EG `hersheyText.fonts['futural'].chars[2]`. The
`chars[n].d` string value can be put directly into the `d` attribute within a
`<path>` SVG element, or imported to a Paper.js path.

See hersheytest.js for more usage examples, check `lib/hersheytext.js` for full
function documentation.

--------
JSON data Public Domain, All other code MIT Licensed.
