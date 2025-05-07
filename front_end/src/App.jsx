import { useState } from 'react'
import Home from './components/Home/Home'
import Attendance from './components/Attendance/Attendance'
import { Routes, Route } from 'react-router-dom'
import './App.css'

function App() {

  return (
    <>
      <div className='container'>
        {window.location.pathname !== '/' && (
          <a href='/' className='btn btn-secondary mt-5'>Back Home</a>
        )}
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='lessons/:scheduleId' element={<Attendance />} />
        </Routes>
      </div>
    </>
  )
}

export default App  
