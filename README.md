# Hershey Text JS

A port of the
[EMSL Hershey engraving font](http://www.evilmadscientist.com/2011/hershey-text-an-inkscape-extension-for-engraving-fonts/)
data from the [Hershey Text Inkscape Plugin](https://code.google.com/p/eggbotcode/downloads/list?can=3&q=hershey)
to JSON, capable of being rendered quickly via JavaScript & SVG.

This includes an quickly written example renderer, see the demo on the
[live github page](http://techninja.github.io/hersheytextjs/) to give it a try!

JSON data only contains original Hershey font data, but Node.js module allows access to
this and all included SVG fonts and an API to add your own!

## Clientside Use

Load the structured JSON data and use it to create your own renderer, or use the example
as a starting point.

## Node.js: Install & Include

Install via `npm install hersheytext`, then include in your node script with
`const hershey = require('hersheytext');`.

### JSON data source

The JSON font data will be accessible at `hershey.fonts`, EG:
`hershey.fonts['futural'].chars[2]`. The `chars[n].d` string value can be put directly
into the `d` attribute within a `<path>` SVG element, or imported to a
[Paper.js compound path](http://paperjs.org/reference/compoundpath).

See hersheytest.js for more data usage examples, check `lib/hersheytext.js` for full
function level documentation.

### Get raw font data

You can access either SVG or Hershey font raw data using `getFontData()`:

```javascript
const hershey = require('hersheytext');

console.log('All fonts available', hershey.getFonts());

const svgFont = hershey.getFontData('ems_tech');
console.log('Font Type:', svgFont.type);
console.log('SVG <font-face> cap height:', svgFont.info['cap-height']);
console.log('SVG <font> default char kern width:', svgFont.info['horiz-adv-x']);
console.log('SVG <glyph> exclamation char data:', svgFont.getChar('!'));

const hersheyFont = hershey.getFontData('cursive');
console.log('Font Type:', hersheyFont.type);
console.log('Hershey Font Display Name:', hersheyFont.info['font-family']);
console.log(`Hershey Font 'A' kern width:`, hersheyFont.getChar('A').width);
console.log('Hershey Font exclamation char data:', hersheyFont.getChar('!').d);
```

### Render to SVG directly

Hershey Text JS comes with a very simple single line renderer, `renderTextSVG()`, which
returns a formatted group of characters with correct offsets.

```javascript
const hershey = require('hersheytext');
const fs = require('fs');

const options = {
  font: 'hershey_script_1',
  scale: 0.25,
};

const header = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">';
const data = hershey.renderTextSVG('Take a Look, if you Will.', options);
const footer = '</svg>';

fs.writeFileSync('test.svg', `${header}\n${data}\n${footer}`);
```

### Make your own renderer with text array

If you have your own rendering intent that isn't SVG directly, the render array function
is the easiest way to do that. To render plain text into an array of easily renderable
character data from SVG or Hershey font data, start with something like this:

```javascript
const hershey = require('hersheytext');
const textArray = hershey.renderTextArray('Hello World!', { font: 'ems_allure' });

textArray.forEach(char => {
  console.log('--------------------------------------------');
  console.log('Character:', char.type);
  console.log('Name:', char.name);
  console.log('Kerning Width (in font units):', char.width);
  console.log('Path Data:', char.d);
});
```

### Add a custom SVG font

If you have an SVG font you'd like to use that isn't one of the ones HersheyText JS ships
with, just use `addSVGFont()`:

```javascript
const hershey = require('hersheytext');

// Will return false if there was a problem. See console for errors.
hershey.addSVGFont('path/to/my-test-font.svg');

// Machine name will be SVG font-family, lowercase with spaces replaced with underscores.
const options = { font: 'my_test_font' };
const data = hershey.renderTextSVG('In my own custom font!', options);
```

**Notes:**

* Raw SVG font data is in glyph format, and therefore needs to be Y-inverted after
it's been positioned, EG: `<path transform="scale(1, -1)" …`
* Hershey font data is in its own far smaller scale and does not need to be inverted.

--------
JSON data Public Domain, All other code MIT Licensed.
