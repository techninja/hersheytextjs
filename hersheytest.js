 // In a normal app, this would simply by "require('hersheytext');"
var hersheyText = require('./lib/hersheytext');

var svgText = hersheyText.renderTextSVG('Hello', {
  id: 'mytext',
  pos: {x: 50, y: 50}
});

if (svgText !== false) {
  console.log("SVG XML:\n", svgText, "\n\n");
}

var arrayText = hersheyText.renderTextArray('Hello World!');

if (arrayText !== false) {
  console.log("Array of character data:\n", arrayText);
}

console.log("\n\nFonts available:");
for (var key in hersheyText.fonts) {
  var f = hersheyText.fonts[key];
  console.log('"' + key + '":', f.name);
}
