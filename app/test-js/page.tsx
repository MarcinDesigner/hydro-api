'use client';

import { useState, useEffect } from 'react';

export default function TestJS() {
  const [message, setMessage] = useState('Initial state');
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    console.log('🚀 useEffect executed!');
    setMessage('useEffect worked!');
    
    const timer = setTimeout(() => {
      setMessage('Timer worked!');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setCounter(prev => prev + 1);
    console.log('Button clicked!', counter + 1);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>JavaScript Test Page</h1>
      <p>Message: {message}</p>
      <p>Counter: {counter}</p>
      <button 
        onClick={handleClick}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click me!
      </button>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        If you see "useEffect worked!" and the button increments the counter, JavaScript is working.
      </div>
    </div>
  );
} 