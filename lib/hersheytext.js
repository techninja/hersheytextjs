/**
 * @file The node module for easily including the letter data or rendering text.
 */
"use strict";

var cheerio = require('cheerio');

exports.fonts = require('../hersheytext.min.json');


/**
 * Render a string of text in a Hershey engraving font to SVG XML.
 *
 * @param {string} text
 *   Text string to be rendered
 * @param {object} options
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
exports.renderTextSVG = function(text, options) {
  try {
    var font = exports.fonts[options.font] ? exports.fonts[options.font].chars : exports.fonts['futural'].chars;
    options.charWidth = options.charWidth ? options.charWidth : 10;
    options.charHeight = options.charHeight ? options.charHeight : 28;

    var offset = {left: 0, top: 0};
    options.scale = options.scale ? options.scale : 1;

    var $ = cheerio.load('<g>'); // Initial DOM

    // Create central group
    var $textGroup = $('g');
    $textGroup.attr({
      id: options.id,
      stroke: 'black',
      fill: 'none',
      transform:
        'scale(' + options.scale + ') ' +
        'translate(' + options.pos.x + ',' + options.pos.y + ')'
    });

    // Initial Line container
    var lineCount = 0;
    var $groupLine = $('<g>').attr('id', options.id + '-line-' + lineCount);
    $textGroup.prepend($groupLine);

    // Move through each word
    var words = text.split(' ');
    for(var w in words) {
      var word = words[w];

      // Move through each letter
      for(var i in word) {
        var index = word.charCodeAt(i) - 33;


        // Only print in range chars
        var charOffset = options.charWidth;
        if (font[index]){
          charOffset = font[index].o;

          // Add the char to the DOM
          $groupLine.append(
            $('<path>').attr({
              d: font[index].d,
              stroke: 'black',
              'stroke-width': 2,
              fill: 'none',
              transform: 'translate(' + offset.left + ', ' + offset.top + ')',
              letter: word[i]
            })
          );
        }

        // Add space between
        offset.left+= charOffset + options.charWidth;
      }

      // Wrap words to width
      if (options.wrapWidth) {
         if (offset.left > options.wrapWidth) {
           if (options.centerWidth) {
             var c = (options.centerWidth / 2) - (offset.left / 2);
             $groupLine.attr('transform', 'translate(' + c + ',0)');
           }

           offset.left = 0;
           offset.top+= options.charHeight;

           // New Line container
           lineCount++;
           $groupLine = $('<g>').attr('id', options.id + '-line-' + lineCount);
           $textGroup.append($groupLine);
         } else {
           offset.left+= options.charWidth*2; // Add regular space
         }
       } else {
         offset.left+= options.charWidth*2; // Add regular space
       }
    }

    if (options.centerWidth) {
      var c = (options.centerWidth / 2) - (offset.left / 2);
      $groupLine.attr('transform', 'translate(' + c + ',0)');
    }

    if (options.centerHeight) {
      var c = (options.centerHeight / 2) - ((options.charHeight*(lineCount+1)) / 2) + options.pos.y;
      $textGroup.attr({
        transform:
        'scale(' + options.scale + ') ' +
        'translate(' + options.pos.x + ',' + c + ')'
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
exports.renderTextArray = function(text, options) {
  var out = [];
  if (typeof options === 'undefined') options = {};

  // Change CRLF with just LF
  text = text.replace(/\r\n/g, "\n");
  try {
    var font = exports.fonts[options.font] ? exports.fonts[options.font].chars : exports.fonts['futural'].chars;

    // Move through each letter
    for(var i in text) {
      var index = text.charCodeAt(i) - 33;

      // Only print in range chars
      if (font[index]){
        out.push({type: text[i], d: font[index].d, o: font[index].o});
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
