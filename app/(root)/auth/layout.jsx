import React from 'react'

const layout = ({children}) => {
  return (
    <div className="min-h-screen w-full flex justify-center items-center px-4 py-6 sm:px-0 overflow-auto">{children}</div>
  )
}

export default layout