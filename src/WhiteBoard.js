import React, { useState, useRef, useEffect } from 'react';
import { io } from "socket.io-client";
import Drawer from "@mui/material/Drawer";
import { FaPencilAlt } from "react-icons/fa"
import { FiCircle } from "react-icons/fi"
import { FaEraser } from "react-icons/fa"
import { MdOutlineRectangle } from "react-icons/md"
import { BsTriangle } from "react-icons/bs"
import { BsHexagon } from "react-icons/bs"
import { BsPentagon } from "react-icons/bs"
import { BsArrowUpRight } from "react-icons/bs"
import { GiStraightPipe } from "react-icons/gi"
import { PiTextTBold } from "react-icons/pi"
import { RiAddCircleFill } from "react-icons/ri"
import { CgMenu } from "react-icons/cg"
import { GrClose } from "react-icons/gr"
import CircularProgress from '@mui/material/CircularProgress';
import { jsPDF } from "jspdf";
import "./WhiteBoard.css"


let sckt;
const Whiteboard = ({ undoStack, redoStack, initialiseStack, insertInStack, deleteFromStack }) => {
  const canvasRef = useRef(null);
  const canvasRefSecond = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [contextSecond, setContextSecond] = useState(null);
  const [eraser, setEraser] = useState(false);
  const [pencilSize, setPencilSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(10);
  const [pencilColor, setPencilColor] = useState('#000000');
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [shapeMode, setShapeMode] = useState(false);
  const [shapeType, setShapeType] = useState('');
  const [shapeStartPos, setShapeStartPos] = useState({ x: 0, y: 0 });
  const [shapeEndPos, setShapeEndPos] = useState({ x: 0, y: 0 });
  const [contexts, setContexts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [ pages, setPages ] = useState([0])
  const [imageData, setImageData] = useState(null);
  const [ images, setImages ] = useState([])
  const [ imageInputRefresh, setImageInputRefresh ] = useState(false)
  const [ imageFile, setImageFile ] = useState(null)
  const [ imageWidth, setImageWidth ] = useState(100)
  const [ imageHeight, setImageHeight ] = useState(100)
  const [ imageX, setImageX ] = useState(0)
  const [ imageY, setImageY ] = useState(0)
  const [ snapShot, setSnapShot ] = useState(null)
  const [open, setOpen] = useState(false)
  const [ textBox, setTextBox ] = useState(false)
  const [ wrongLink, setWrongLink ] = useState(false)
  const [ loader, setLoader ] = useState(true)
  const [ dataLimit, setDataLimit ] = useState(false)
  // const [ select, setSelect ] = useState(false)
  // const [ selectList, setSelectList ] = useState([])
  // const [ selectedObject, setSelectedObject ] = useState(null)
  const [horizontalLines, setHorizontalLines] = useState([0]);
  const [ locked, setLocked ] = useState(false)
  const blue = '#1718F1'
  const yellow = '#FFC701'
  let canvas
  let ctx
  let canvasSecond
  let ctxSecond
  let eraserData = []

  
  

  function updateBoard(data){
    
    canvas = canvasRef.current;
    ctx = canvas.getContext('2d');
    setContext(ctx);
    const savedData = data;
    if (savedData) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
      };
      image.src = savedData;
    }
  }

  function pushActionsStack(dataURL, page, x = -1, y = -1){
    
    addInStack("undoStack", { dataURL, page, x, y })
  }

 

  const startTextMode = (e) => {
    
    setShapeMode(false)
    setDrawing(false);
    setTextMode(true);
   
  };

  const handleTextChange = (e) => {
    
    setText(e.target.value);
  };

  const addText = () => {
    
    context.font = '16px Arial';
    context.fillText(text, textPosition.x, textPosition.y + 22);
    setText('');
    setTextBox(false)
    const dataURL = canvasRef.current.toDataURL();
    pushActionsStack(dataURL, currentPage)
    sckt.emit("addText", currentPage, dataURL, window.location.href)
  };

  const drawGrid = (ctx, currentPage = 0) => {
    const width = ctx.canvas.width + 1000;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height); // Clear the canvas

    // Calculate the spacing between lines
    const horizontalSpacing = Math.floor(width / (horizontalLines[currentPage] + 1));
    const verticalSpacing = Math.floor(width / (horizontalLines[currentPage] + 1));

    // Draw horizontal lines
    ctx.strokeStyle = '#ccc';
    
    for (let i = 1; i <= horizontalLines[currentPage]; i++) {
      const y = i * verticalSpacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw vertical lines
    for (let i = 1; i <= horizontalLines[currentPage]; i++) {
      const x = i * horizontalSpacing;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const drawGridCurrentPage = (horizontalLine) => {
    const canvas = canvasRefSecond.current;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    const width = ctx.canvas.width + 1000;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height); // Clear the canvas

    // Calculate the spacing between lines
    const horizontalSpacing = Math.floor(width / (horizontalLine + 1));
    const verticalSpacing = Math.floor(width / (horizontalLine + 1));

    // Draw horizontal lines
    ctx.strokeStyle = '#ccc';
    
    for (let i = 1; i <= horizontalLine; i++) {
      const y = i * verticalSpacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw vertical lines
    for (let i = 1; i <= horizontalLine; i++) {
      const x = i * horizontalSpacing;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const handleHorizontalInputChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setHorizontalLines((prev) => {
      const newLines = [...prev]
      newLines[currentPage] = value
      return newLines
    });
  };

  
  function applyGrid(page = 0){
    const canvas = canvasRefSecond.current;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    drawGrid(ctx, page);
  }



  useEffect(() => {
    if(context){

      sckt.on("eraseData", ({ eraserData, currentPageSource, dataURL }) => {
        eraseDataWithArray(eraserData, currentPageSource, dataURL);
        
        const undoObj = {
          dataURL: dataURL,
          page: currentPageSource,
          x: -1,
          y: -1
        }
        

        addInStack('undoStack', undoObj)
        
      })
      
      sckt.on("addText", ({ currentPageSource, dataURL }) => {
        setContexts((prev) => {
          const newContexts = [...prev]
          newContexts[currentPageSource] = dataURL
          return newContexts
        })
       

        const undoObj = {
          dataURL: dataURL,
          page: currentPageSource,
          x: -1,
          y: -1
        }
        

        addInStack("undoStack", undoObj)
        
        if(currentPageSource === Number(sessionStorage.getItem("currentPage")) || (currentPageSource === 0 && !sessionStorage.getItem("currentPage"))){
          updateBoard(dataURL)
        }
      })

      sckt.on("undo", ({ dataURL, currentPageSource, x, y, index, obj }) => {
        setContexts((prev) => {
          const newContexts = [...prev]
          newContexts[currentPageSource] = dataURL
          return newContexts
        })

        

        removeFromStack("undoStack", index)


        addInStack("redoStack", obj)
        
      
        
        setImages((prev) => {
          if(!prev.length){
            return prev
          }
          const newImages = [...prev]
          
          for(let i = 0; i < newImages.length; i++){
            if(newImages[i].x === x && newImages[i].y === y && newImages[i].page === currentPageSource){
              newImages.splice(i, 1)
            
              return newImages
            }
          }
          return newImages
        })
        if(currentPageSource === Number(sessionStorage.getItem("currentPage")) || (currentPageSource === 0 && !sessionStorage.getItem("currentPage"))){
          clearBoardPageSwitch()
          updateBoard(dataURL)
        }
      })
      

      sckt.on("redo", ({ undoObj, index }) => {
        setContexts((prev) => {
          const newContexts = [...prev]
          newContexts[undoObj.page] = undoObj.dataURL
          return newContexts
        })
      
        removeFromStack("redoStack", index)

        addInStack("undoStack", undoObj)
        
        
        if(undoObj.page === Number(sessionStorage.getItem("currentPage")) || (undoObj.page === 0 && !sessionStorage.getItem("currentPage"))){
          clearBoardPageSwitch()
          updateBoard(undoObj.dataURL)
        }
      })

      sckt.on("Joined", (boardData) => {
        setContexts(boardData.contexts)
        setPages(boardData.pages)
        setImages(boardData.images)
        setHorizontalLines(boardData.grid)
        
        for(let i = 0; i < boardData.images.length; i++){
          if(boardData.images[i] && 0 === boardData.images[i].page){
          
            renderNewPageImage(boardData.images[i])
          }
        }
        setLoader(false)
        drawGridCurrentPage(boardData.grid[0])
        updateBoard(boardData.contexts[0])

      })

      sckt.on("syncImage", ({ imageData, currentPageSource, imageX, imageY, imageWidth, imageHeight, dataURL }) => {
        setContexts((prev) => {
          const newContexts = [...prev]
          newContexts[undoObj.page] = undoObj.dataURL
          return newContexts
        })
        setImages((prev) => {
          
          const newImages = [...prev]
          newImages.push({ imageData, x : imageX, y : imageY, page: currentPageSource, imageWidth, imageHeight })
          return newImages
        })

        const undoObj = {
          dataURL: dataURL,
          page: currentPageSource,
          x: imageX,
          y: imageY
        }
        
  
        addInStack("undoStack", undoObj)
        if(currentPageSource === Number(sessionStorage.getItem("currentPage")) || (currentPageSource === 0 && !sessionStorage.getItem("currentPage"))){
          const img = new Image();
          img.onload = () => {
            // Draw the image on the canvas
            context.drawImage(img, imageX, imageY, imageWidth, imageHeight);
          };
  
          img.src = imageData;
        }
      })

      sckt.on("Grid", ({ page, grid }) => {
        if(page === Number(sessionStorage.getItem("currentPage")) || (page === 0 && !sessionStorage.getItem("currentPage"))){
          
          drawGridCurrentPage(grid)
        }
        setHorizontalLines((prev) => {
          const newHorL = [...prev]
          newHorL[page] = grid
          return newHorL
        })
      })
    }

    


    return () => {
        sckt.off("eraseData");
        sckt.off("addText");
        sckt.off("undo")
        sckt.off("redo")
        sckt.off("syncImage")
        sckt.off("Joined")
        sckt.off("Grid")
    }
  }, [context])

  

  useEffect(() => {
    canvas = canvasRef.current;
    ctx = canvas.getContext('2d');
    setContext(ctx);

    canvasSecond = canvasRefSecond.current;
    ctxSecond = canvasSecond.getContext('2d');
    setContextSecond(ctxSecond);
  
    sckt = setUpSocket();
    sessionStorage.setItem("currentPage", 0)
    
    initialiseStack("redoStack", [])
    initialiseStack("undoStack", [])
    
    const resizeCanvas = () => {
      const vw = Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      );
      const vh = Math.max(
        document.documentElement.clientHeight || 0,
        window.innerHeight || 0
      );

      canvas.width = vw * 0.99500831; // Adjust the multiplier as needed
      canvas.height = vh * 0.99500831; // Adjust the multiplier as needed
    }

   
    
    resizeCanvas();

    sckt.on("dataLimit", () => {
      setDataLimit(true)
    })
    
    sckt.on("received", ({ dataURL, currentPageSource }) => {
      
      setContexts((prev) => {
        
        const newContexts = [...prev]
        newContexts[currentPageSource] = dataURL
        return newContexts
      })

      
      
      const undoObj = {
        dataURL: dataURL,
        page: currentPageSource,
        x: -1,
        y: -1
      }
      

      addInStack("undoStack", undoObj)
      
      if(currentPageSource === Number(sessionStorage.getItem("currentPage")) || (currentPageSource === 0 && !sessionStorage.getItem("currentPage"))){
        updateBoard(dataURL)
      }
      
    })

    sckt.on("addPage", () => {
      setPages(prev => [...prev, prev[prev.length - 1] + 1])
      setHorizontalLines(prev => [...prev, 0])
      setContexts(prev => [...prev, null])
    })

    sckt.on("wrongLink", () => {
      setWrongLink(true)
    })    
    
    sckt.on("lock", () => {
      setLocked(true)
    })

    
    return () => {
        sckt.off("received");
        sckt.off("addPage")
        sckt.off("wrongLink")
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  })

  function setUpSocket(){
    const socket = io('https://app.tutorly.com'); // 'https://app.tutorly.com'
    socket.emit("joinWhiteBoard", window.location.href);
    return socket;
  }

  function handleKeyDown(event){
    if (event.ctrlKey && event.key === 'z') {
      undo();
    }
    else if (event.ctrlKey && event.key === 'y') {
      redo();
    }
  }

  function addInStack(stackName, item){
    
    insertInStack(stackName, item)
    
  }

  

  function removeFromStack(stackName, index){
    deleteFromStack(stackName, index)
  }

  const startDrawing = (e) => {
    
    if(loader){
      return
    }

    if(locked) { return }
  
    if(imageFile) { return }
    if (textMode){
        const { offsetX, offsetY } = e.nativeEvent;
        setTextPosition({ x: offsetX, y: offsetY - 18 })
        setTextBox(true)
        return;
    }
    const { offsetX, offsetY } = e.nativeEvent;
    if(shapeMode){
        setShapeStartPos({ x: offsetX, y: offsetY });
        setDrawing(true);
        
        setSnapShot(context.getImageData(0, 0, context.canvas.width, context.canvas.height))
        return;
    }
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    
    
    setDrawing(true);
  };

  const draw = (e) => {

    if(loader){
      return
    }
    
    if(locked) { return }

    if(imageFile) { return }

    if(shapeMode && drawing){
        
        context.strokeStyle = pencilColor;
        const { offsetX, offsetY } = e.nativeEvent;
        setShapeEndPos({ x: offsetX, y: offsetY });
        drawShape()
        
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
      canvasRef.current.globalCompositeOperation = 'destination-over';
    }
  };

  

  function eraseDataWithArray(eraserData, currentPageSource, dataURL){
   
    if(context && (currentPageSource === Number(sessionStorage.getItem("currentPage")) || (currentPageSource === 0 && !sessionStorage.getItem("currentPage")))){
        for(let i = 0; i < eraserData.length; i++){
            context.clearRect(eraserData[i][0], eraserData[i][1], eraserData[i][2], eraserData[i][3]);
        }
    }
    setContexts((prev) => {
    
      const newContexts = [...prev]
      newContexts[currentPageSource] = dataURL
      return newContexts
    })
  }

  const stopDrawing = () => {

    if(loader){
      return
    }

    if(locked) { return }
   
    if(imageFile) { return }

    if(shapeMode){
      
      drawShape(false)
      setDrawing(false);
      setSnapShot(null)
     
    }
    if (textMode) return;
    context.closePath();
    setDrawing(false);
    !eraser ? sendData() : syncErasedData()
    if(eraser){
        eraserData = []
    }
    const dataURL = canvasRef.current.toDataURL();
    
    pushActionsStack(dataURL, currentPage)
  };

  const clearBoard = () => {
    if(locked) { return }
   
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    eraserData.push([0, 0, context.canvas.width, context.canvas.height])
    syncErasedData()
    eraserData = []
    const dataURL = canvasRef.current.toDataURL();
    pushActionsStack(dataURL, currentPage)
  };
  const clearBoardPageSwitch = () => {
    
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  };

  const toggleEraserFalse = () => {
    
    setShapeMode(false)
    setTextMode(false)
    setEraser(false);
  };

  const toggleEraserTrue = () => {
    
    setShapeMode(false)
    setTextMode(false)
    setEraser(true);
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
    sckt.emit("syncBoard", dataURL, currentPage, window.location.href);
  };

  const syncErasedData = () => {
    
    const dataURL = canvasRef.current.toDataURL();
    sckt.emit("syncErasedData", eraserData, currentPage, dataURL, window.location.href)
  }

  
  
  const drawShape = () => {
    
    const { x: startX, y: startY } = shapeStartPos;
    const { x: endX, y: endY } = shapeEndPos;

  
    if(snapShot){
      context.putImageData(snapShot, 0, 0)
  
    }

    switch (shapeType) {
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
        drawPolygon(startX, startY, endX, endY, 6);
        break;
      case 'pentagon':
        drawPolygon(startX, startY, endX, endY, 5);
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

  const drawPolygon = (startX, startY, endX, endY, side) => {
    const width = endX - startX;
    const height = endY - startY;
    const sides = side; // Modify this to change the number of sides
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
  }

  function renderNewPageImage(imageData){
    
    const img = new Image();

    img.onload = () => {
      context.drawImage(img, imageData.x, imageData.y, Number(imageData.imageWidth), Number(imageData.imageHeight));
    }

    img.src = imageData.imageData;
  }

  function changePage(page){
    if(loader){
      return
    }
    
    if(page === currentPage) { return }

    const dataURL = canvasRef.current.toDataURL();
    setContexts((prev) => {
      const newContexts = [...prev]
      newContexts[currentPage] = dataURL
      return newContexts
    })
    clearBoardPageSwitch()
    

    for(let i = 0; i < images.length; i++){
      if(images[i] && page === images[i].page){
      
        renderNewPageImage(images[i])
      }
    }
    updateBoard(contexts[page])
    applyGrid(page)
    setCurrentPage(page)
    sessionStorage.setItem("currentPage", page)
  }

  function addPage(){
    if(locked) { return }

    setPages(prev => [...prev, prev[prev.length - 1] + 1])
    setHorizontalLines(prev => [...prev, 0])
    setContexts(prev => [...prev, null])
    sckt.emit("addPage", window.location.href);
  }

  

  function undo(){
    
    if(locked) { return }
    const actionsStack = undoStack 
    
    
    if(!actionsStack.length) { return }

    let dataIndex = -1
    let x = -1
    let y = -1
    let obj = null
    for(let i = actionsStack.length - 1; i >= 0; i--){
      if(actionsStack[i].page === currentPage){
        x = actionsStack[i].x
        y = actionsStack[i].y
        
        obj = actionsStack[i]
        addInStack("redoStack", actionsStack[i])

        removeFromStack("undoStack", i)

        dataIndex = i
        break  
      }
    }

    if(dataIndex === -1) { return }

    setImages((prev) => {
      if(!prev.length){
        return prev
      }
      const newImages = [...prev]
      
      for(let i = 0; i < newImages.length; i++){
        if(newImages[i].x === x && newImages[i].y === y && newImages[i].page === currentPage){
          newImages.splice(i, 1)
          return newImages
        }
      }
      return newImages
    })

    for(let i = dataIndex - 1; i >= 0; i--){
      if(actionsStack[i].page === currentPage){
   
        clearBoardPageSwitch()
        updateBoard(actionsStack[i].dataURL)
      
        sckt.emit("undo", actionsStack[i].dataURL, currentPage, x, y, dataIndex, obj, window.location.href)
        return
      }
    }

    clearBoardPageSwitch()
    const dataURL = canvasRef.current.toDataURL()
    sckt.emit("undo", dataURL, currentPage, x, y, dataIndex, obj, window.location.href)
    
  }

  function redo(){

    if(locked) { return }
   
    const redoStack1 = redoStack 

    if(!redoStack1.length) { return }
  
    for(let i = redoStack1.length - 1; i >= 0; i--){
      if(redoStack1[i].page === currentPage){

        clearBoardPageSwitch()
        updateBoard(redoStack1[i].dataURL)
        sckt.emit("redo", redoStack1[i], i, window.location.href)

        addInStack("undoStack", redoStack1[i])

        removeFromStack("redoStack", i)
  
        return
      }
    }
  }

  const handleImageUpload = (event) => {
   
    const file = event.target.files[0];
    setImageFile(event.target.files[0])
    sessionStorage.setItem("pageState", canvasRef.current.toDataURL())
  
  };

  function fixImage(){
    
   
    if(imageFile){
    
        setImageInputRefresh(false)
        pushActionsStack(canvasRef.current.toDataURL(), currentPage, imageX, imageY)
        sckt.emit("syncImage", imageData, currentPage, imageX, imageY, imageWidth, imageHeight, canvasRef.current.toDataURL(), window.location.href);
        setImageData(null)
        setImageFile(null)
        setImageX(0)
        setImageY(0)
        setImageWidth(100)
        setImageHeight(100)
        // setSelectedObject(null)
    }
  }

  // function drawSelectedObject(){
    
  // }

  function placeImage(e){
   
    if(loader){
      return
    }

    if(locked) { return }


    // if(selectedObject){
    //   drawSelectedObject()
    // }
    // if(select && selectList[0]){
    //   const { offsetX, offsetY } = e.nativeEvent;
    //   const snapImage = context.getImageData(selectList[0].posX, selectList[0].posY, selectList[0].imageW, selectList[0].imageH)
    //   context.clearRect(selectList[0].posX, selectList[0].posY, selectList[0].imageW, selectList[0].imageH)
    //   context.putImageData(snapImage, offsetX, offsetY)
    // }
    

    
    if(imageFile){

    clearBoardPageSwitch()
    updateBoard(sessionStorage.getItem("pageState"))
    const { offsetX, offsetY } = e.nativeEvent;
    setImageX(offsetX)
    setImageY(offsetY)
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      setImageData(imageUrl);
      const img = new Image();

      img.onload = () => {
        context.drawImage(img, offsetX, offsetY, imageWidth, imageHeight);
        // console.log(offsetX, offsetY, imageWidth, imageHeight);
        // for(let i = 0; i < selectList.length; i++){
        //   if(!selectedObject){
        //     setSelectList(prev => [...prev, {posX: Number(offsetX), posY: Number(offsetY), imageW: imageWidth, imageH: imageHeight}])
        //     setSelectedObject({posX: Number(offsetX), posY: Number(offsetY), imageW: imageWidth, imageH: imageHeight})
        //     break
        //   }
        //   if(selectedObject.posX === selectList[i].posX && selectedObject.posY === selectList[i].posY && selectedObject.imageW === selectList[i].imageW && selectedObject.imageH === selectList[i].imageH){
        //     setSelectList((prev) => {
        //       const newList = [...prev]
        //       newList[i].posX = Number(offsetX)
        //       newList[i].posY = Number(offsetY)
        //       newList[i].imageW = Number(imageWidth)
        //       newList[i].imageH = Number(imageHeight)
        //       return newList
        //     })
        //     setSelectedObject({posX: Number(offsetX), posY: Number(offsetY), imageW: Number(imageWidth), imageH: Number(imageHeight)})
        //     return
        //   }
        // }
        // setSelectList(prev => [...prev, {posX: Number(offsetX), posY: Number(offsetY), imageW: imageWidth, imageH: imageHeight}])
        // setSelectedObject({posX: Number(offsetX), posY: Number(offsetY), imageW: imageWidth, imageH: imageHeight})
      };

      img.src = imageUrl;
    };

    reader.readAsDataURL(imageFile);
  }
  }
  function redrawImage(){
    
    if(imageFile){

      clearBoardPageSwitch()
      updateBoard(sessionStorage.getItem("pageState"))
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setImageData(imageUrl);
        const img = new Image();
  
        img.onload = () => {
          context.drawImage(img, imageX, imageY, imageWidth, imageHeight);
          // for(let i = 0; i < selectList.length; i++){
          //   if(!selectedObject){
          //     setSelectList(prev => [...prev, {posX: Number(imageX), posY: Number(imageY), imageW: imageWidth, imageH: imageHeight}])
          //     setSelectedObject({posX: Number(imageX), posY: Number(imageY), imageW: imageWidth, imageH: imageHeight})
          //     break
          //   }
          //   if(selectedObject.posX === selectList[i].posX && selectedObject.posY === selectList[i].posY && selectedObject.imageW === selectList[i].imageW && selectedObject.imageH === selectList[i].imageH){
          //     setSelectList((prev) => {
          //       const newList = [...prev]
          //       newList[i].posX = Number(imageX)
          //       newList[i].posY = Number(imageY)
          //       newList[i].imageW = Number(imageWidth)
          //       newList[i].imageH = Number(imageHeight)
          //       return newList
          //     })
          //     setSelectedObject({posX: Number(imageX), posY: Number(imageY), imageW: Number(imageWidth), imageH: Number(imageHeight)})
          //     return
          //   }
          // }
          // setSelectList(prev => [...prev, {posX: Number(imageX), posY: Number(imageY), imageW: imageWidth, imageH: imageHeight}])
          // setSelectedObject({posX: Number(imageX), posY: Number(imageY), imageW: imageWidth, imageH: imageHeight})
        };
  
        img.src = imageUrl;
      };
  
      reader.readAsDataURL(imageFile);
    }
  }
  function changeImageHeight(e){
    
    setImageHeight(e.target.value)
  }

  function changeImageWidth(e){
    
    setImageWidth(e.target.value)
  }

  function toggleImageUpload(){

    if(locked) { return }
    
    setImageInputRefresh(prev => !prev)
  }

  function dropImage(){
    
    setImageInputRefresh(false)
    setImageData(null)
    setImageFile(null)
    setImageX(0)
    setImageY(0)
    setImageWidth(100)
    setImageHeight(100)
    clearBoardPageSwitch()
    updateBoard(sessionStorage.getItem("pageState"))
  }


  function openMenu(){
    setOpen(true)
  }

  function downloadPdf(){

    const dataURLs = []

    for(let i = 0; i < contexts.length; i++){
      if(i === currentPage){
        dataURLs.push(canvasRef.current.toDataURL())
      }
      else{
        dataURLs.push(contexts[i])
      }
    }

    const browserWidth = window.innerWidth;
    const browserHeight = window.innerHeight;

    const pdf = new jsPDF({
      orientation: browserWidth > browserHeight ? "landscape" : "portrait",
      unit: "px",
      format: [browserWidth, browserHeight],
    });

    const addImageToPDF = (imageData) => {
      pdf.addImage(imageData, "PNG", 0, 0, browserWidth, browserHeight);
    };

    for(let i = 0; i < dataURLs.length; i++){
      addImageToPDF(dataURLs[i]);
      if(i !== dataURLs.length - 1){
        pdf.addPage();
      }
    }
    const date = new Date()
    const name = "Paper_" + date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }).replaceAll("/", "-") + ".pdf"

    pdf.save(name);
  }

  // function dup(){
  //   setSelect(prev => !prev)
  // }

  function applyGridWithPage(){

    if(locked) { return }
    sckt.emit("Grid", currentPage, horizontalLines[currentPage], window.location.href)
    applyGrid(currentPage)
  }

  function lockBoard(){
    sckt.emit("lock", window.location.href)
  }

  

  return (
    
    (wrongLink || dataLimit) ?
    <div className = "invalidDiv">
    {wrongLink ? <h1>This page link is invalid</h1> : <h1>This paper has exceeded its data limit please close this window and create a new board.</h1> }
    </div>
    :
    
    <div className={textMode ? "text-cursor" : eraser ? "eraser-cursor" : "pen-cursor"}>
      {loader && <div className="loaderDiv">
        <CircularProgress size={100} />
      </div>}
      {imageFile && <p className="flex-div message-div"><button className="z-index button" onClick={dropImage} >Drop image</button></p>}
      <div className='flex-div menu-bar'>
      <div className={loader ? "z-index displayNone" : "z-index"} onClick={openMenu}>
            <CgMenu size = {25} color = {blue} />
      </div>
      </div>

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)} onOpen={() => setOpen(true)} >
          <div className="close-button" onClick={() => setOpen(false)}>
          <GrClose size = {25} color = {blue} />
          </div>
          <div className="range-image-options menu-options">
          <label className="range-image-options">
          Pencil Size:
          <input className="z-index" type="range" min="1" max="20" value={pencilSize} onChange={handlePencilSizeChange} />
          </label>
          <label className="range-image-options">
          Eraser Size:
          <input className="z-index" type="range" min="5" max="50" value={eraserSize} onChange={handleEraserSizeChange} />
          </label>
          <label className="range-image-options">Pencil Color:
          <input className="z-index" type="color" value={pencilColor} onChange={handlePencilColorChange} />
          </label>
          <button className="button" onClick={downloadPdf}>Download PDF</button>
          <div>
            <label>
              Grid Input:
              <input type="number" value={horizontalLines[currentPage]} onChange={handleHorizontalInputChange} />
            </label>
          </div>
          <button className="button" onClick={applyGridWithPage}>Apply Grid</button>
          </div>
      </Drawer>

      <div className="page-numbers-container">
        <div className="page-numbers">
        {
          pages.map((page, index) => {
            return <div className={currentPage === page ? "page-number current-page" : "page-number"} key = {index} onClick = {() => changePage(page)}>{page + 1}</div>
          })
        }
        </div>
        {pages.length < 10 && <div onClick={addPage} className={loader ? "add-page displayNone" : "add-page"}>
          <RiAddCircleFill color={blue} size={40} />
        </div>}
      </div>
        {(textBox && textMode && textPosition.x !== 0 && textPosition.y !== 0) && (
        <div className="z-index" style={{ position: 'absolute', top: textPosition.y, left: textPosition.x}}>
          <input className="z-index" type="text" value={text} onChange={handleTextChange}/>
          <button className="z-index button" onClick={addText}>Add Text</button>
        </div>
        )}
      <div className={loader ? "clear-div displayNone" : "clear-div"}>
        <button onClick={clearBoard} className="z-index button">Clear Page</button>
      </div>

      <div className="edit-options-container">
      
      <div onClick={startTextMode} className={loader ? "displayNone " + (textMode ? "edit-option edit-option-background" : "edit-option") : (textMode ? "edit-option edit-option-background" : "edit-option")}>
        <PiTextTBold color={textMode ? yellow : blue} size={20} />
      </div>

      <div onClick={toggleEraserFalse} className={loader ? "displayNone " + ((!eraser && !textMode && !shapeMode) ? "edit-option edit-option-background" : "edit-option") : ((!eraser && !textMode && !shapeMode) ? "edit-option edit-option-background" : "edit-option")}>
        <FaPencilAlt color={(!eraser && !textMode && !shapeMode) ? yellow : blue} size={20} />
      </div>
      
      <div onClick={toggleEraserTrue} className={loader ? "displayNone " + ((eraser && !textMode && !shapeMode) ? "edit-option edit-option-background" : "edit-option") : ((eraser && !textMode && !shapeMode) ? "edit-option edit-option-background" : "edit-option")}>
        <FaEraser color={(eraser && !textMode && !shapeMode) ? yellow : blue} size={20} />
      </div>
      
      <div onClick={() => setShape('rectangle')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'rectangle') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'rectangle') ? "edit-option edit-option-background" : "edit-option")}>
        <MdOutlineRectangle color={(!textMode && shapeMode && shapeType === 'rectangle') ? yellow : blue} size={20} />
      </div>

        
      <div onClick={() => setShape('triangle')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'triangle') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'triangle') ? "edit-option edit-option-background" : "edit-option")}>
        <BsTriangle color={(!textMode && shapeMode && shapeType === 'triangle') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('polygon')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'polygon') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'polygon') ? "edit-option edit-option-background" : "edit-option")}>
        <BsHexagon color={(!textMode && shapeMode && shapeType === 'polygon') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('pentagon')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'pentagon') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'pentagon') ? "edit-option edit-option-background" : "edit-option")}>
        <BsPentagon color={(!textMode && shapeMode && shapeType === 'pentagon') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('line')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'line') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'line') ? "edit-option edit-option-background" : "edit-option")}>
        <GiStraightPipe color={(!textMode && shapeMode && shapeType === 'line') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('arrow')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'arrow') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'arrow') ? "edit-option edit-option-background" : "edit-option")}>
        <BsArrowUpRight color={(!textMode && shapeMode && shapeType === 'arrow') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('circle')} className={loader ? "displayNone " + ((!textMode && shapeMode && shapeType === 'circle') ? "edit-option edit-option-background" : "edit-option") : ((!textMode && shapeMode && shapeType === 'circle') ? "edit-option edit-option-background" : "edit-option")}>
        <FiCircle color={(!textMode && shapeMode && shapeType === 'circle') ? yellow : blue} size={20} />
      </div>
      </div>
      <div className="undo-redo-options">
        <button onClick={undo} className={loader ? "z-index button displayNone" : "z-index button"}>Undo</button>
        <button onClick={redo} className={loader ? "z-index button displayNone" : "z-index button"}>Redo</button>
      </div>
      
      <div className={loader ? "range-image-options image-up displayNone" : "range-image-options image-up"}>
        {
          imageInputRefresh && <input className="z-index button file-input" type="file" accept="image/*" onChange={handleImageUpload} disabled={imageFile} />
        }
        <button onClick={toggleImageUpload} className="z-index button" >Upload Image</button>
      </div>
      {imageFile && <div className="range-image-options image-size image-in-flex">
        
        <label className="range-image-options">
          <div className="flex-div">
          <span className="image-in">Image Heigth:</span>
          <input className="z-index image-wh" type="number" value={imageHeight} onChange={changeImageHeight} />
          </div>
        </label>
        <label className="range-image-options">
          <div className="flex-div">
          <span className="image-in">Image Width:</span> 
          <input className="z-index image-wh" type="number" value={imageWidth} onChange={changeImageWidth} />
          </div>
        </label>
        <div className="flex-div">
          <button className="z-index button image-buttons" onClick={redrawImage}>Apply Size</button>
          <button className="z-index button image-buttons" onClick={fixImage}>Fix Image</button>
        </div>
      </div>}
      
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        style={{ zIndex: '-10'}}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onClick={placeImage}
      />
    </div>
    <div className="canvas-container-second">
      <canvas
        ref={canvasRefSecond}
        style={{ zIndex: '-20'}}
      />
    </div>
    </div>

);
};

export default Whiteboard;
