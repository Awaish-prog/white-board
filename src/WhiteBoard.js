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
import "./WhiteBoard.css"


let sckt;
const Whiteboard = ({ undoStack, redoStack, initialiseStack, insertInStack, deleteFromStack }) => {
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

  const blue = '#1718F1'
  const yellow = '#FFC701'
  let canvas
  let ctx
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
        
      
        console.log(x, y);
        
        setImages((prev) => {
          if(!prev.length){
            return prev
          }
          const newImages = [...prev]
          
          for(let i = 0; i < newImages.length; i++){
            if(newImages[i].x === x && newImages[i].y === y && newImages[i].page === currentPageSource){
              newImages.splice(i, 1)
              console.log("found");
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
        
        
        for(let i = 0; i < boardData.images.length; i++){
          if(boardData.images[i] && 0 === boardData.images[i].page){
          
            renderNewPageImage(boardData.images[i])
          }
        }
        
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
    }

    


    return () => {
        sckt.off("eraseData");
        sckt.off("addText");
        sckt.off("undo")
        sckt.off("redo")
        sckt.off("syncImage")
        sckt.off("Joined")
    }
  }, [context])

  

  useEffect(() => {
    canvas = canvasRef.current;
    ctx = canvas.getContext('2d');
    setContext(ctx);
  
    sckt = setUpSocket();
    sessionStorage.setItem("currentPage", 0)
    // sessionStorage.setItem("redoStack", JSON.stringify([]))
    // sessionStorage.setItem("undoStack", JSON.stringify([]))
    //
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
      setContexts(prev => [...prev, null])
    })

    sckt.on("wrongLink", () => {
      setWrongLink(true)
    })    
    

  

    return () => {
        sckt.off("received");
        sckt.off("addPage")
        sckt.off("wrongLink")
    }
  }, []);

  function setUpSocket(){
    const socket = io('http://localhost:8001'); // 'https://app.tutorly.com'
    socket.emit("joinWhiteBoard", window.location.href);
    return socket;
  }

  function addInStack(stackName, item){
    
    insertInStack(stackName, item)
    
  }

  function removeFromStack(stackName, index){
    

    deleteFromStack(stackName, index)
  }

  const startDrawing = (e) => {
   
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

  
  
  const drawShape = (clearUI = true) => {
    
    const { x: startX, y: startY } = shapeStartPos;
    const { x: endX, y: endY } = shapeEndPos;

  
    if(snapShot){
      context.putImageData(snapShot, 0, 0)
      console.log("Image Data");
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
    console.log("In render", imageData);
    img.onload = () => {
      context.drawImage(img, imageData.x, imageData.y, Number(imageData.imageWidth), Number(imageData.imageHeight));
    }

    img.src = imageData.imageData;
  }

  function changePage(page){
    
    if(page === currentPage) { return }

    const dataURL = canvasRef.current.toDataURL();
    setContexts((prev) => {
      const newContexts = [...prev]
      newContexts[currentPage] = dataURL
      return newContexts
    })
    clearBoardPageSwitch()
    
    console.log(images);
    for(let i = 0; i < images.length; i++){
      if(images[i] && page === images[i].page){
      
        renderNewPageImage(images[i])
      }
    }
    updateBoard(contexts[page])
    setCurrentPage(page)
    sessionStorage.setItem("currentPage", page)
  }

  function addPage(){
    
    setPages(prev => [...prev, prev[prev.length - 1] + 1])
    setContexts(prev => [...prev, null])
    sckt.emit("addPage", window.location.href);
  }

  

  function undo(){
    

    const actionsStack = undoStack // JSON.parse(sessionStorage.getItem("undoStack"))
    

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
        console.log(x, y);
        sckt.emit("undo", actionsStack[i].dataURL, currentPage, x, y, dataIndex, obj, window.location.href)
        return
      }
    }

    clearBoardPageSwitch()
    const dataURL = canvasRef.current.toDataURL()
    sckt.emit("undo", dataURL, currentPage, x, y, dataIndex, obj, window.location.href)
    
  }

  function redo(){
   
    const redoStack1 = redoStack //JSON.parse(sessionStorage.getItem("redoStack"))

    if(!redoStack1.length) { return }
    console.log(redoStack1);
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

    }
  }

  function placeImage(e){
   
    
    if(imageFile){

    clearBoardPageSwitch()
    updateBoard(sessionStorage.getItem("pageState"))
    const { offsetX, offsetY } = e.nativeEvent;
    console.log(offsetX, offsetY);
    setImageX(offsetX)
    setImageY(offsetY)
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      setImageData(imageUrl);
      const img = new Image();

      img.onload = () => {
        context.drawImage(img, offsetX, offsetY, imageWidth, imageHeight);
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

  function saveData(){
    
    sckt.emit("saveData", window.location.href)
  }

  function openMenu(){
    setOpen(true)
  }
  return (
    
    wrongLink ?
    <h1>This page link is invalid</h1>
    :
    <div className={textMode ? "text-cursor" : eraser ? "eraser-cursor" : "pen-cursor"}>
      
      {imageFile && <p className="flex-div message-div"><button className="z-index button" onClick={dropImage} >Drop image</button></p>}
      <div className='flex-div menu-bar'>
      <div className="z-index" onClick={openMenu}>
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
          <button className="button" onClick={saveData}>Save</button>
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
        <div onClick={addPage} className="add-page">
          <RiAddCircleFill color={blue} size={40} />
        </div>
      </div>
        {(textBox && textMode && textPosition.x !== 0 && textPosition.y !== 0) && (
        <div className="z-index" style={{ position: 'absolute', top: textPosition.y, left: textPosition.x}}>
          <input className="z-index" type="text" value={text} onChange={handleTextChange}/>
          <button className="z-index button" onClick={addText}>Add Text</button>
        </div>
      )}
      <div className="clear-div">
        <button onClick={clearBoard} className="z-index button">Clear Page</button>
      </div>

      <div className="edit-options-container">
      
      <div onClick={startTextMode} className={textMode ? "edit-option edit-option-background" : "edit-option"}>
        <PiTextTBold color={textMode ? yellow : blue} size={20} />
      </div>

      <div onClick={toggleEraserFalse} className={(!eraser && !textMode && !shapeMode) ? "edit-option edit-option-background" : "edit-option"}>
        <FaPencilAlt color={(!eraser && !textMode && !shapeMode) ? yellow : blue} size={20} />
      </div>
      
      <div onClick={toggleEraserTrue} className={(eraser && !textMode && !shapeMode) ? "edit-option edit-option-background" : "edit-option"}>
        <FaEraser color={(eraser && !textMode && !shapeMode) ? yellow : blue} size={20} />
      </div>
      
      <div onClick={() => setShape('rectangle')} className={(!textMode && shapeMode && shapeType === 'rectangle') ? "edit-option edit-option-background" : "edit-option"}>
        <MdOutlineRectangle color={(!textMode && shapeMode && shapeType === 'rectangle') ? yellow : blue} size={20} />
      </div>

        
      <div onClick={() => setShape('triangle')} className={(!textMode && shapeMode && shapeType === 'triangle') ? "edit-option edit-option-background" : "edit-option"}>
        <BsTriangle color={(!textMode && shapeMode && shapeType === 'triangle') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('polygon')} className={(!textMode && shapeMode && shapeType === 'polygon') ? "edit-option edit-option-background" : "edit-option"}>
        <BsHexagon color={(!textMode && shapeMode && shapeType === 'polygon') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('pentagon')} className={(!textMode && shapeMode && shapeType === 'pentagon') ? "edit-option edit-option-background" : "edit-option"}>
        <BsPentagon color={(!textMode && shapeMode && shapeType === 'pentagon') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('line')} className={(!textMode && shapeMode && shapeType === 'line') ? "edit-option edit-option-background" : "edit-option"}>
        <GiStraightPipe color={(!textMode && shapeMode && shapeType === 'line') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('arrow')} className={(!textMode && shapeMode && shapeType === 'arrow') ? "edit-option edit-option-background" : "edit-option"}>
        <BsArrowUpRight color={(!textMode && shapeMode && shapeType === 'arrow') ? yellow : blue} size={20} />
      </div>
      <div onClick={() => setShape('circle')} className={(!textMode && shapeMode && shapeType === 'circle') ? "edit-option edit-option-background" : "edit-option"}>
        <FiCircle color={(!textMode && shapeMode && shapeType === 'circle') ? yellow : blue} size={20} />
      </div>
      </div>
      <div className="undo-redo-options">
        <button onClick={undo} className="z-index button">Undo</button>
        <button onClick={redo} className="z-index button">Redo</button>
      </div>
      <div className="range-image-options image-up">
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
    </div>

);
};

export default Whiteboard;
