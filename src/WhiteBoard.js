import React, { useState, useRef, useEffect } from 'react';
import { io } from "socket.io-client";
let sckt;
const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [eraser, setEraser] = useState(false);
  const [pencilSize, setPencilSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(10);
  const [pencilColor, setPencilColor] = useState('#000000');
  let canvas
  let ctx
  let eraserData = []

  function updateBoard(data){
    // const canvas = canvasRef.current;
    // const ctx = canvas.getContext('2d');
    // setContext(ctx);
    const savedData = data;
    if (savedData) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
      };
      image.src = savedData;
    }
  }

  useEffect(() => {
    if(context){
        sckt.on("eraseData", ({ eraserData }) => {
            eraseDataWithArray(eraserData);
        })
    }
    return () => {
        sckt.off("eraseData");
    }
  }, [context])

  useEffect(() => {

    canvas = canvasRef.current;
    ctx = canvas.getContext('2d');
    setContext(ctx);

    sckt = setUpSocket();

    sckt.on("received", ({ dataURL }) => {
        updateBoard(dataURL)
    })

    
    return () => {
        sckt.off("received");
    }
  }, []);

  function setUpSocket(){
    const socket = io('http://localhost:8080'); // 'https://app.tutorly.com'
    socket.emit("joinWhiteBoard", "board");
    return socket;
  }

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    if (eraser) {
      context.clearRect(offsetX - eraserSize / 2, offsetY - eraserSize / 2, eraserSize, eraserSize);
      eraserData.push([offsetX - eraserSize / 2, offsetY - eraserSize / 2, eraserSize, eraserSize]);
    } else {
      context.lineTo(offsetX, offsetY);
      context.lineWidth = pencilSize;
      context.strokeStyle = pencilColor;
      context.stroke();
    }
  };

  function eraseDataWithArray(eraserData){
    if(context){
        for(let i = 0; i < eraserData.length; i++){
            context.clearRect(eraserData[i][0], eraserData[i][1], eraserData[i][2], eraserData[i][3]);
        }
    }
  }

  const stopDrawing = () => {
    context.closePath();
    setDrawing(false);
    !eraser ? sendData() : syncErasedData()
    if(eraser){
        eraserData = []
    }
  };

  const clearBoard = () => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    eraserData.push([0, 0, context.canvas.width, context.canvas.height])
    syncErasedData()
    eraserData = []
  };

  const toggleEraser = () => {
    setEraser(!eraser);
  };

  const handlePencilSizeChange = (e) => {
    setPencilSize(parseInt(e.target.value));
  };

  const handleEraserSizeChange = (e) => {
    setEraserSize(parseInt(e.target.value));
  };

  const handlePencilColorChange = (e) => {
    setPencilColor(e.target.value);
  };

  const sendData = () => {
    const dataURL = canvasRef.current.toDataURL();
    sckt.emit("syncBoard", dataURL);
  };

  const syncErasedData = () => {
    sckt.emit("syncErasedData", eraserData)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid #000' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
      />
      <button onClick={clearBoard}>Clear</button>
      <button onClick={toggleEraser}>{eraser ? 'Draw' : 'Erase'}</button>
      <div>
        <label>
          Pencil Size:
          <input type="range" min="1" max="10" value={pencilSize} onChange={handlePencilSizeChange} />
        </label>
        <label>
          Eraser Size:
          <input type="range" min="5" max="50" value={eraserSize} onChange={handleEraserSizeChange} />
        </label>
        <label>Pencil Color:
        <input type="color" value={pencilColor} onChange={handlePencilColorChange} />
    </label>
  </div>
</div>
);
};

export default Whiteboard;
