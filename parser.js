function fileToJSON(input) {
  var output = {};

  input.split('\n').forEach(function (line) {
    if (line[0] === '#') {
      return;
    }

    let parts = line.split('=');

    if (parts[0] === '') {
      return;
    }

    let key = parts[0].trim();
    let value = parts[1].trim();

    output[key] = value;
  });

  return output;
}

var fs = require('fs');
var text = fs.readFileSync('./server.properties').toString('utf-8');
const result = fileToJSON(text);
