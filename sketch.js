let port;
let ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
let toggle=false;

function setup() {
  createCanvas(400, 400);
  port = createSerial();

  // reconnect automatically to a port used before
  let used = usedSerialPorts();
  if (used.length > 0) port.open(used[0], 115200);
}

function draw() {
  background(20);

  //we are goinmg to read the entire message until we reach the "new line \n"
  let msg = port.readUntil("\n");
  console.log(msg);// raw line form ESP
  console.log(msg.trim());// cleaned with no spaces or new line
  console.log(msg.trim().split(","));// array of "strings"
  console.log(msg.trim().split(",").map(Number)); // array of numbers 
  
  let v = msg.trim().split(",").map(Number);

  //simple but might lag if sketch is slow
  // if (v.length === 6){
  //   ax=v[0]
  //   ay=v[1]
  //   az=v[2]
  //   gx=v[3]
  //   gy=v[4]
  //   gz=v[5]
  // }


  // //way to keep the buffer clean.
  while (msg.length > 0) {
    // console.log(msg);// raw line from the C6
    let v = msg.trim().split(",").map(Number);
    if (v.length === 6){
      ax=v[0]
      ay=v[1]
      az=v[2]
      gx=v[3]
      gy=v[4]
      gz=v[5]
    }
  //   //read the port agian, if there are still numbers, then it means that you didn't have the last message, if there is nothing left it means that you have emptied the buffer.
    msg = port.readUntil("\n");
  }

  // tilt moves the circle
  let x = map(ax, -9.8, 9.8, 0, width);
  let y = map(ay, -9.8, 9.8, 0, height);
  fill(255);
  circle(x, y, 40);

  fill(200);
  //message on the canvas
  // text(port.opened() ? "connected" : "click to connect", 10, 20);
}

function mousePressed() {
  if (!port.opened()) port.open(115200);   // shows the port picker
}

function keyPressed() {
  if (key === "1" || key === "0") port.write(key);   // LED on/off
  if (key ===  " "){
    if(toggle){
      port.write("0");
    }else{
      port.write("1") ;
    }
    // port.write(String(Number(toggle)));// LED on/off
    toggle=!toggle;
  }   
}
