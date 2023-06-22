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
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [shapeMode, setShapeMode] = useState(false);
  const [shapeType, setShapeType] = useState('freehand');
  const [shapeStartPos, setShapeStartPos] = useState({ x: 0, y: 0 });
  const [shapeEndPos, setShapeEndPos] = useState({ x: 0, y: 0 });
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

  const startTextMode = (e) => {
    setDrawing(false);
    setTextMode(true);
    const { offsetX, offsetY } = e.nativeEvent;
    setTextPosition({ x: offsetX, y: offsetY });
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const addText = () => {
    context.font = '16px Arial';
    context.fillText(text, textPosition.x, textPosition.y);
    setText('');
    setTextMode(false);
  };

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
    const socket = io('https://app.tutorly.com'); // 'https://app.tutorly.com'
    socket.emit("joinWhiteBoard", "board");
    return socket;
  }

  const startDrawing = (e) => {
    if (textMode){
        const { offsetX, offsetY } = e.nativeEvent;
        setTextPosition({ x: offsetX, y: offsetY })
        return;
    }
    const { offsetX, offsetY } = e.nativeEvent;
    if(shapeMode){
        setShapeStartPos({ x: offsetX, y: offsetY });
        setDrawing(true);
        return;
    }
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setDrawing(true);
  };

  const draw = (e) => {
    if(shapeMode && drawing){
        const { offsetX, offsetY } = e.nativeEvent;
        setShapeEndPos({ x: offsetX, y: offsetY });
        return;
    }
    if (!drawing || textMode) return;
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
    if(shapeMode){
        setShapeMode(false)
        drawShape()
        setDrawing(false);
    }
    if (textMode) return;
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

  
  
  const drawShape = () => {
    const { x: startX, y: startY } = shapeStartPos;
    const { x: endX, y: endY } = shapeEndPos;

    //context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    switch (shapeType) {
      case 'square':
        drawSquare(startX, startY, endX, endY);
        break;
      case 'rectangle':
        drawRectangle(startX, startY, endX, endY);
        break;
      case 'circle':
        drawCircle(startX, startY, endX, endY);
        break;
      case 'triangle':
        drawTriangle(startX, startY, endX, endY);
        break;
      case 'polygon':
        drawPolygon(startX, startY, endX, endY);
        break;
      case 'line':
        drawLine(startX, startY, endX, endY);
        break;
      case 'arrow':
        drawArrow(startX, startY, endX, endY);
        break;
      default:
        break;
    }
  };

  const drawSquare = (startX, startY, endX, endY) => {
    const width = endX - startX;
    const height = endY - startY;

    context.beginPath();
    context.rect(startX, startY, width, height);
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
  };

  const drawRectangle = (startX, startY, endX, endY) => {
    const width = endX - startX;
    const height = endY - startY;

    context.beginPath();
    context.rect(startX, startY, width, height);
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
  };

  const drawCircle = (startX, startY, endX, endY) => {
    const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

    context.beginPath();
    context.arc(startX, startY, radius, 0, 2 * Math.PI);
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
  };

  const drawTriangle = (startX, startY, endX, endY) => {
    const width = endX - startX;
    const height = endY - startY;

    context.beginPath();
    context.moveTo(startX + width / 2, startY);
    context.lineTo(startX, startY + height);
    context.lineTo(startX + width, startY + height);
    context.lineTo(startX + width / 2, startY);
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
  };

  const drawPolygon = (startX, startY, endX, endY) => {
    const width = endX - startX;
    const height = endY - startY;
    const sides = 6; // Modify this to change the number of sides
    const angle = (2 * Math.PI) / sides;
    const radius = Math.min(width, height) / 2;
    const centerX = startX + width / 2;
    const centerY = startY + height / 2;

    context.beginPath();
    context.moveTo(centerX + radius * Math.cos(0), centerY + radius * Math.sin(0));
    for (let i = 1; i <= sides; i++) {
      context.lineTo(
        centerX + radius * Math.cos(angle * i),
        centerY + radius * Math.sin(angle * i)
      );
    }
    context.closePath();
    context.lineWidth = 2;
    context.stroke();
  };

  const drawLine = (startX, startY, endX, endY) => {
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
  };

  const drawArrow = (startX, startY, endX, endY) => {
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.lineWidth = 2;
    context.stroke();
    context.closePath();

    const arrowHeadSize = 8;
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowX = endX - arrowHeadSize * Math.cos(angle - Math.PI / 6);
    const arrowY = endY - arrowHeadSize * Math.sin(angle - Math.PI / 6);

    context.beginPath();
    context.moveTo(arrowX, arrowY);
    context.lineTo(endX, endY);
    context.lineTo(
      endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
      endY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
    );
    context.lineWidth = 2;
    context.stroke();
    context.closePath();
  };
  const setShape = (shape) => {
    
    setTextMode(false)
    setDrawing(false)
    setEraser(false)
    setShapeMode(true)
    setShapeType(shape);
  };

  return (
    <div>
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
    </div>
      {(textMode && textPosition.x !== 0 && textPosition.y !== 0) && (
        <div style={{ position: 'absolute', top: textPosition.y, left: textPosition.x}}>
          <input type="text" value={text} onChange={handleTextChange} />
          <button onClick={addText}>Add Text</button>
        </div>
      )}
      <button onClick={startTextMode}>Text Mode</button>
      <button onClick={clearBoard}>Clear</button>
      <button onClick={toggleEraser}>{eraser ? 'Draw' : 'Erase'}</button>
      
       
        <button onClick={() => setShape('square')}>Square</button>
        <button onClick={() => setShape('rectangle')}>Rectangle</button>
        <button onClick={() => setShape('triangle')}>Triangle</button>
        <button onClick={() => setShape('polygon')}>Polygon</button>
        <button onClick={() => setShape('line')}>Line</button>
        <button onClick={() => setShape('arrow')}>Arrow</button>
        <button onClick={() => setShape('circle')}>Circle</button>
      
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
