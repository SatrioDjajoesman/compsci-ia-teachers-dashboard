'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#000000',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0',
          fontFamily: 'Helvetica, Sans-serif',
          fontSize: '12px',
          padding: '8px 12px',
        },
        success: {
          style: {
            color: '#00ff00',
            borderColor: '#313131ff',
          },
        },
        error: {
          style: {
            color: '#ff0000',
            borderColor: '#313131ff',
          },
        },
        duration: 3000,
      }}
    />
  )
}
