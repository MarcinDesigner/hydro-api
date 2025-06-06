'use client';

import { useState, useEffect } from 'react';

export default function SimpleTestPage() {
  const [message, setMessage] = useState('Loading...');
  const [counter, setCounter] = useState(0);

  console.log('🎯 SimpleTestPage rendered, message:', message, 'counter:', counter);

  useEffect(() => {
    console.log('🚀 useEffect triggered!');
    setMessage('JavaScript działa!');
    
    const interval = setInterval(() => {
      setCounter(prev => {
        console.log('⏰ Counter update:', prev + 1);
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    console.log('🖱️ Button clicked!');
    setMessage(`Kliknięto! ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Prosty Test JavaScript</h1>
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {message}
      </div>
      <div style={{ marginBottom: '20px' }}>
        <strong>Licznik:</strong> {counter}
      </div>
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
        Kliknij mnie
      </button>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Jeśli widzisz "JavaScript działa!" i licznik się zwiększa, to JavaScript działa poprawnie.
      </div>
    </div>
  );
} 