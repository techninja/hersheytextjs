 // In a normal app, this would simply by "require('hersheytext');"
const hersheyText = require('./lib/hersheytext');

const svgText = hersheyText.renderTextSVG('Hello', {
  id: 'mytext',
  font: 'ems_allure',
  charWidth: 1,
  pos: {x: 50, y: 50}
});

if (svgText !== false) {
  console.log("SVG XML:\n", svgText, "\n\n");
}

const arrayText = hersheyText.renderTextArray('Hello World!');

if (arrayText !== false) {
  console.log("Array of character data:\n", arrayText);
}

console.log("\n\nFonts available:");
for (var key in hersheyText.getFonts) {
  var f = hersheyText.fonts[key];
  console.log(`Hershey font "${key}":, ${f.name}`);
}
for (var key in hersheyText.svgFonts) {
  var f = hersheyText.svgFonts[key];
  console.log(`SVG font "${key}":, ${f.name}`);
}
