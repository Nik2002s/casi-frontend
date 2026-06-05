import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function FileUpload({ onFile, onError, loading }) {
  const [fileName, setFileName] = useState(null)

  const onDrop = useCallback((accepted) => {
    const file = accepted[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      if (onError) onError('File is too large. Maximum upload size is 25 MB.')
      return
    }
    setFileName(file.name)
    onFile(file)
  }, [onFile, onError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
        ${isDragActive
          ? 'border-blue-500 bg-blue-950/30'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="text-4xl mb-3">📊</div>
      {isDragActive ? (
        <p className="text-blue-400 font-medium">Drop the .xlsx file here</p>
      ) : fileName ? (
        <div>
          <p className="text-white font-medium">{fileName}</p>
          <p className="text-gray-500 text-sm mt-1">Click or drag to replace</p>
        </div>
      ) : (
        <div>
          <p className="text-gray-300 font-medium">Drag & drop your .xlsx file here</p>
          <p className="text-gray-500 text-sm mt-1">or click to browse</p>
          <p className="text-gray-600 text-xs mt-3">CASI_QA_TestSuite_v2 format</p>
        </div>
      )}
      {loading && (
        <p className="text-blue-400 text-sm mt-3 animate-pulse">Uploading…</p>
      )}
    </div>
  )
}
