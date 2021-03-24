const express = require('express');
const { join } = require('path');
const morgan = require('morgan');
const fs = require('fs');
const spawn = require('child_process').spawn;

let minecraftServerProcess;

const MINECRAFT_STATUS = {
  RUNNING: 'RUNNING',
  NOT_RUNNING: 'NOT_RUNNING'
};
let serverStatus = MINECRAFT_STATUS.NOT_RUNNING;

const app = express();
// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(
  join(__dirname, 'express-minecraft.log'),
  { flags: 'a' }
);
// setup the logger
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());
const port = 3000;

app.get('/', (req, res) => res.send('MinecraftExpressApp is up and running!'));

app.get('/status', (req, res) => {
  // talk to Minecraft to get status
  const status = getMinecraftStatus();
  res.send({ status: status });
});

app.post('/start', (req, res) => {
  if (serverStatus == MINECRAFT_STATUS.NOT_RUNNING) {
    startMinecraft();
  }
  res.send({ status: MINECRAFT_STATUS.RUNNING });
});

app.post('/restart', (req, res) => {
  restartMinecraft();
  res.send({ status: MINECRAFT_STATUS.RUNNING });
});

app.delete('/shutdown', (req, res) => {
  if (serverStatus == MINECRAFT_STATUS.RUNNING) {
    shutdownMinecraft();
  }
  res.send({ status: MINECRAFT_STATUS.NOT_RUNNING });
});

app.post('/command', (req, res) => {
  const command = req.body;
  minecraftServerProcess.stdin.write(command.command + '\n');

  let buffer = [];
  let collector = data => {
    data = data.toString();
    buffer.push(data.split(']: ')[1]);
  };
  minecraftServerProcess.stdout.on('data', collector);
  setTimeout(function () {
    minecraftServerProcess.stdout.removeListener('data', collector);
    res.send(buffer.join(''));
  }, 250);
});

app.get('/properties', (req, res) => {
  const text = fs.readFileSync('./server.properties').toString('utf-8');
  const result = fileToJSON(text);
  res.send(result);
});

app.put('/properties', (req, res) => {
  const properties = req.body;
  let string = '#Minecraft server properties\n#(last boot timestamp)\n';
  for (const property in properties) {
    const sub_string = `${property}=${properties[property]}\n`;
    string = string.concat(sub_string);
  }
  fs.writeFile('./server.properties', string, function (err) {
    if (err) return console.log(err);
  });
  res.send({ status: 'server.properties successfully modified!' });
});

app.listen(port, () => console.log('Server started'));

function startMinecraft() {
  const path = join(__dirname, 'minecraft', 'minecraft_server-run.jar');
  minecraftServerProcess = spawn(
    'java',
    ['-Xmx1024M', '-Xms1024M', '-jar', path, 'nogui'],
    {
      cwd: join(__dirname, 'minecraft')
    }
  );

  // Listen for events coming from the minecraft server process - in this case,
  // just log out messages coming from the server
  function log(data) {
    process.stdout.write(data.toString());
  }
  minecraftServerProcess.stdout.on('data', log);
  minecraftServerProcess.stderr.on('data', log);
  serverStatus = MINECRAFT_STATUS.RUNNING;
}

function shutdownMinecraft() {
  minecraftServerProcess.kill();
  serverStatus = MINECRAFT_STATUS.NOT_RUNNING;
}

function restartMinecraft() {
  if (serverStatus == MINECRAFT_STATUS.RUNNING) {
    shutdownMinecraft();
  }
  startMinecraft();
}

function getMinecraftStatus() {
  return serverStatus;
}

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
