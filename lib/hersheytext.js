/**
 * @file The node module for easily including the letter data or rendering text.
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

exports.fonts = require('../hersheytext.min.json');
exports.svgFonts = require('../svg_fonts/index.json');


/**
 * Try to clean up an SVG d value so it's easier to parse it.
 *
 * @param {string} d
 *   SVG path d string value to be adjusted.
 *
 * @returns {string}
 *   An adjusted d string with spaced around control chars.
 */
function cleanD(d) {
  const out = [];
  let lastGood = true;

  [...d].forEach((char, index) =>{
    // If this isn't a space, period or negative...
    if (![' ', '.', '-'].includes(char)) {
      // If this is a parsable number...
      if (!Number.isNaN(Number.parseInt(char, 10))) {
        // If this number is immediately preceeded by a letter, add a space.
        if (!lastGood) {
          out.push(' ');
        }
        lastGood = true;
      } else {
        // Guaranteed a control char like L or M
        // Add a space before it.
        out.push(' ');
        lastGood = false;
      }
    } else {
      // If this negative is immediately preceeded by a letter, add a space.
      if (char === '-' && !lastGood) {
        out.push(' ');
      }

      // These chars can preceed a number.
      lastGood = true;
    }

    out.push(char);
  });

  return out.join('').trim().replace(/  /g, ' ');
}

/**
 * Scale an SVG font glyph down (and flip the Y axis)
 *
 * @param {string} d
 *   SVG path d string value to be adjusted.
 * @param {number} height
 *   Maximum height for a char, used to flip along the Y axis.
 * @param {number} scale
 *   Value that will be multiplied against each x/y value to scale it.
 *
 * @returns {string}
 *   An adjusted d string with correct Y flip and given scale applied.
 */
function glyphScale(d, height, scale) {
  if (!d) {
    return d;
  };

  const pathInput = cleanD(d);
  const vals = pathInput.split(' ');
  const out = [];

  let lastVal = null;
  let lastOp = null; // Holds last move/line operation.
  let lastCoord = 'x'; // Flops between x and y.
  vals.forEach((val, index) => {
    let pf = Number.parseFloat(val);

    // Either a Move/Line
    if (Number.isNaN(pf)) {
      lastCoord = 'x';

      // Might have no space, try to parse
      if (val.length > 1) {
        lastOp = val.subStr(0, 1);
        out.push(lastOp);
        pf = Number.parseFloat(val.substr(1));
      } else {
        lastOp = val;
        out.push(lastOp);
      }
    }

    // When we actually have a number!
    if (!Number.isNaN(pf)) {
      if (lastCoord === 'x') {
        pf = Math.round(pf * scale * 100) / 100;
        out.push(pf);
        lastCoord = 'y'; // We know y is right after
      } else if (lastCoord === 'y') {
        pf = Math.round((height - pf) * scale * 100) / 100;
        out.push(pf);
      }
    }
  });

  return out.join(' ');
}

/**
 * Helper to load font data from SVG fonts or original Hershey JSON data.
 *
 * @param {string} fontName
 *   The machine name/id of the font, either from the Hershey JSON key, or the
 *   SVG font index JSON key.
 *
 * @returns {object}
 *   Object containing all chars supported by the font
 */
function getFontData(fontName) {
  const font = {
    info: 'Invalid Font',
    getChar: () => null,
  };

  if (exports.fonts[fontName]) {
    font.info = exports.fonts[fontName].name;
    font.chars = exports.fonts[fontName].chars;

    // Get font characters via ascii index offset.
    font.getChar = (char) => {
      return font.chars[char.charCodeAt(0) - 33];
    };

  } else if (exports.svgFonts[fontName]) {
    const glyphScaling = 0.1;
    const data = fs.readFileSync(
      path.join(__dirname, '..', 'svg_fonts', exports.svgFonts[fontName].file)
    );
    const $ = cheerio.load(data, { xmlMode: true });

    font.info = $('font-face').attr();
    font.chars = {};

    $('glyph').each((index) => {
      const item = $('glyph')[index];
      // Add all glyphs except space.
      if (item.attribs.unicode !== ' ') {
        font.chars[item.attribs.unicode] = {
          name: item.attribs['glyph-name'],
          width: item.attribs['horiz-adv-x'] * glyphScaling,
          o: item.attribs['horiz-adv-x'] * glyphScaling,
          d: glyphScale(item.attribs.d, font.info['units-per-em'], glyphScaling),
        }
      }
    });

    // Get font characters directly via unicode object keys.
    font.getChar = char => font.chars[char];
  }

  return font;
}

/**
 * Get a flat array list of machine name valid fonts.
 *
 * @returns {array}
 *   Flat array of font name/id strings.
 */
exports.getFonts = () => [...Object.keys(exports.fonts), ...Object.keys(exports.svgFonts)];

/**
 * Render a string of text in a Hershey engraving font to SVG XML.
 *
 * @param {string} text
 *   Text string to be rendered
 * @param {object} rawOptions
 *   Object of named options:
 *    font {string}: [Optional] Name of font face from main font object, defaults to "futural", Sans 1 Stroke
 *    id {string}: [Required] ID to give the final g(roup) SVG DOM object
 *    pos {object}: [Required] {X, Y} object of where to place the final object within the SVG
 *    charWidth {int}: [Optional] Base width given to each character
 *    charHeight {int}: [Optional] Base height given to each character (when wrapping)
 *    scale {int}: [Optional] Scale to multiply size of everything by
 *    wrapWidth {int}: [Optional] Max line size at which to wrap to the next line
 *    centerWidth {int}: [Optional] Width to center multiline text inside of
 *    centerHeight {int}: [Optional] Height to center text inside of vertically
 *
 * @returns {string|boolean}
 *   Internal SVG content to be rendered as you see fit.
 *   Returns === false if error.
 */
exports.renderTextSVG = function(text, rawOptions = {}) {
  const defaults = {
    font: 'futural',
    charWidth: 10,
    charHeight: 28,
    scale: 1,
  };

  // Merge defaults with argument options.
  const options = {...defaults, ...rawOptions};

  // Prep SVG export.
  const $ = cheerio.load('<g>'); // Initial DOM

  try {
    const font = getFontData(options.font);
    const offset = { left: 0, top: 0 };

    // Create central group
    const $textGroup = $('g');
    $textGroup.attr({
      id: options.id,
      stroke: 'black',
      fill: 'none',
      transform:
        `scale(${options.scale}) translate(${options.pos.x}, ${options.pos.y})`
    });

    // Initial Line container
    const lineCount = 0;
    const $groupLine = $('<g>').attr('id', options.id + '-line-' + lineCount);
    $textGroup.prepend($groupLine);

    // Move through each word
    const words = text.split(' ');
    for(let w in words) {
      const word = words[w];

      // Move through each letter
      for(let i in word) {
        const char = font.getChar(word[i]);

        // Only print in range chars
        let charOffset = options.charWidth;
        if (char){
          charOffset = parseInt(char.o, 10);

          // Add the char to the DOM
          $groupLine.append(
            $('<path>').attr({
              d: char.d,
              stroke: 'black',
              'stroke-width': 2,
              fill: 'none',
              transform: `translate(${offset.left}, ${offset.top})`,
              letter: word[i]
            })
          );
        }

        // Add space between
        offset.left += charOffset + options.charWidth;
      }

      // Wrap words to width
      if (options.wrapWidth) {
         if (offset.left > options.wrapWidth) {
           if (options.centerWidth) {
             const c = (options.centerWidth / 2) - (offset.left / 2);
             $groupLine.attr('transform', `translate(${c},0)`);
           }

           offset.left = 0;
           offset.top += options.charHeight;

           // New Line container
           lineCount++;
           $groupLine = $('<g>').attr('id', `${options.id}-line-${lineCount}`);
           $textGroup.append($groupLine);
         } else {
           offset.left += options.charWidth * 2; // Add regular space
         }
       } else {
         offset.left += options.charWidth * 2; // Add regular space
       }
    }

    if (options.centerWidth) {
      const c = (options.centerWidth / 2) - (offset.left / 2);
      $groupLine.attr('transform', `translate(${c},0)`);
    }

    if (options.centerHeight) {
      const c = (options.centerHeight / 2) - ((options.charHeight * (lineCount + 1)) / 2) + options.pos.y;
      $textGroup.attr({
        transform: `scale(${options.scale}) translate(${options.pos.x}, ${c})`
      });
    }
  } catch(e) {
    console.error(e);
    return false; // Error!
  }

  return $.html(); // We should be all good!
}

/**
 * Render a string of text in a Hershey engraving font to an array of paths.
 *
 * @param {string} text
 *   Text string to be rendered
 * @param {object} options
 *   Object of named options:
 *    font {string}: [Optional] Name of font face from main font object, defaults to "futural", Sans 1 Stroke
 *
 * @returns {string|boolean}
 *   Array of font matches for letters in order, returns === false if error.
 */
exports.renderTextArray = function(text, rawOptions = {}) {
  const out = [];
  const defaults = {
    font: 'futural',
  };

  // Merge defaults with argument options.
  const options = {...defaults, ...rawOptions};

  // Change CRLF with just LF
  text = text.replace(/\r\n/g, "\n");
  try {
    const font = getFontData(options.font);

    // Move through each letter
    for(let i in text) {
      const char = font.getChar(text[i]);

      // Only print in range chars
      if (char){
        out.push({type: text[i], d: char.d, o: char.o});
      } else if (text[i] === "\n") {
        out.push({type: 'newline'});
      }else if (text[i] === ' ') {
        out.push({type: 'space'});
      }
    }
  } catch(e) {
    console.error(e);
    return false; // Error!
  }

  return out;
}
