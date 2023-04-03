/**
 * @file HersheyText node module for easily including the letter data or rendering text.
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

exports.fonts = require('../hersheytext.min.json');
exports.svgFonts = require('../svg_fonts/index.json');

// Rewrite internal reference filename for SVG fonts to the absolute path.
Object.entries(exports.svgFonts).forEach(([key, item]) => {
  item.file = path.join(__dirname, '..', 'svg_fonts', item.file);
});

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
    font.type = 'hershey';
    font.info = {
      'font-family': exports.fonts[fontName].name, // Font title.
      'units-per-em': 10, // Height.
      'horiz-adv-x': 10, // Space/Default width.
    };
    font.chars = exports.fonts[fontName].chars;

    // Get font characters via ascii index offset.
    font.getChar = (char) => {
      const data = font.chars[char.charCodeAt(0) - 33];
      if (data) {
        return { type: char, name: char, width: parseInt(data.o, 10), d: data.d };
      }
      return null;
    };

  } else if (exports.svgFonts[fontName]) {
    const data = fs.readFileSync(exports.svgFonts[fontName].file);
    const $ = cheerio.load(data, { xmlMode: true });

    font.type = 'svg';
    font.info = { ...$('font-face').attr(), ...$('font').attr() };
    font.chars = {};

    $('glyph').each((index) => {
      const item = $('glyph')[index];
      // Add all glyphs including space (which only contains the space width!).
      font.chars[item.attribs.unicode] = {
        type: item.attribs.unicode,
        name: item.attribs['glyph-name'],
        width: parseFloat(item.attribs['horiz-adv-x']) || parseFloat(font.info['horiz-adv-x']),
        d: item.attribs.d || null,
      }
    });

    // Get font characters directly via unicode object keys.
    font.getChar = char => font.chars[char];
  }

  return font;
}

// Export the get data function.
exports.getFontData = getFontData;

/**
 * Add a new SVG Font via file location.
 *
 * @returns {boolean}
 *   True if it worked, false if not.
 */
exports.addSVGFont = (file) => {
  try {
    const data = fs.readFileSync(file);
    const $ = cheerio.load(data, { xmlMode: true });
    const name = $('font-face').attr('font-family');
    const cleanName = name.toLowerCase().replace(/\s/g, '_');
    exports.svgFonts[cleanName] = { name, file };
  } catch (error) {
    console.error(error);
    return false;
  }
};

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
 *    font {string}: Name of font face from main font object
 *    id {string}: ID to give the final g(roup) SVG DOM object
 *    pos {object}: {x, y} object of where to position the object
 *    charSpacingAdjust {int}: Amount to add or remove from between char spacing.
 *    charHeightAdjust {int}: Amount to add or remove from line height.
 *    scale {int}: Scale to multiply size of everything by
 *    size {object}: {w, h} width and height of the canvas. Important only for rl writing
 *    fromRight {bool}: write from the right side instead of the left if set
 *
 * @returns {string|boolean}
 *   Internal SVG content to be rendered as you see fit.
 *   Returns === false if error.
 */
exports.renderTextSVG = function(text, rawOptions = {}) {
  const options = {
    id: 'text',
    font: 'futural',
    charSpacingAdjust: 0,
    charHeightAdjust: 0,
    scale: 2,
    pos: { x: 0, y: 0 },
    size: {w: 0, h: 0 },
    fromRight: false,
    ...rawOptions,
  };

  // Prep SVG export.
  const $ = cheerio.load('<g>'); // Initial DOM

  try {
    const font = getFontData(options.font);
    const multiplyer = font.type === 'svg' ? 1 : 1.68;
    const offset = { left: 0, top: 0 };
    if( options.fromRight ) { 
      // since scale affects everything, we need to make sure that the offset stays at the value we have set even when the scale is different
      offset.left = (options.size.w * multiplyer) / options.scale;
    } 
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
        const rawChar = word[i];
        const char = font.getChar(rawChar);

        // if we write from right, we need to position the character before we write, since the coordinate system is still counting from left
        if (options.fromRight) {
          offset.left -= (char.width * multiplyer) + options.charSpacingAdjust;
        }

        // Only print in range chars
        if (char) {
          const $path = $('<path>').attr({
            d: char.d,
            stroke: 'black',
            'stroke-width': 1,
            fill: 'none',
            transform: `translate(${offset.left}, ${offset.top})`,
            letter: word[i]
          });

          if (font.type === 'svg') {
            $path.attr('transform', `translate(${offset.left}, ${font.info['units-per-em']}) scale(1, -1)`);
          }

          // Add the char to the DOM group.
          $groupLine.append($path);

          if(!options.fromRight) { 
            // Position next character.
            offset.left += (char.width * multiplyer) + options.charSpacingAdjust;
          }
        }
      }

      // Word boundary: Add a space.
      if (options.fromRight) {
        offset.left -= parseInt(font.info['horiz-adv-x'], 10) + options.charSpacingAdjust;
      } else {
        offset.left+= parseInt(font.info['horiz-adv-x'], 10) + options.charSpacingAdjust;
      }
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
 *    font {string}: [Optional] Name of font face from main font object
 *
 * @returns {string|boolean}
 *   Array of font matches for letters in order, returns === false if error.
 */
exports.renderTextArray = function(text, rawOptions = {}) {
  const out = [];
  const options = { font: 'futural', ...rawOptions };

  // Change CRLF with just LF.
  text = text.replace(/\r\n/g, "\n");
  try {
    const font = getFontData(options.font);

    // Move through each letter.
    for(let i in text) {
      const char = font.getChar(text[i]);

      // Only print in range chars.
      if (char){
        out.push(char);
      } else if (text[i] === "\n") {
        out.push({ name: 'newline', width: 0 });
      } else {
        // Add a space if char not found.
        // TODO: Add support for "missing-glyph".
        // TODO: This might break for hershey font. Please use SVG font, thank you!
        out.push(font.getChar(' '));
      }
    }
  } catch(e) {
    console.error(e);
    return false; // Error!
  }

  return out;
}
