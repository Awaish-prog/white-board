import React, { useState } from 'react';
import Whiteboard from './WhiteBoard';


const App = () => {

  const [ undoStack, setUndoStack ] = useState([])
  const [ redoStack, setRedoStack ] = useState([])


  function initialiseStack(stack, value){
    stack === "undoStack" ? setUndoStack(value) : setRedoStack(value)
  }

  function insertInStack(stack, value){
    stack === "undoStack" ? setUndoStack(prev => [...prev, value]) : setRedoStack(prev => [...prev, value])
  }
  
  function deleteFromStack(stack, index){
    if(stack === "undoStack"){
      setUndoStack((prev) => {
        const newStack = [...prev]
        newStack.splice(index, 1)
        return newStack
      })
    }
    else{
      setRedoStack((prev) => {
        const newStack = [...prev]
        newStack.splice(index, 1)
        return newStack
      })
    }
  }

  return (
    <div>
      <Whiteboard undoStack = {undoStack} redoStack = {redoStack} initialiseStack = {initialiseStack} insertInStack = {insertInStack} deleteFromStack = {deleteFromStack} />
    </div>
  );
};

export default App;
