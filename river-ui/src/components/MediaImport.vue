<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-700">
        <h2 class="text-xl font-bold">Import Media</h2>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-700 rounded">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Import Methods -->
      <div class="p-6 border-b border-gray-700">
        <div class="grid grid-cols-3 gap-4">
          <!-- File Upload -->
          <div 
            class="p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
            @click="triggerFileInput"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <div class="text-center">
              <CloudArrowUpIcon class="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 class="text-lg font-semibold mb-2">Upload Files</h3>
              <p class="text-gray-400 text-sm">Drag & drop or click to browse</p>
              <p class="text-xs text-gray-500 mt-2">Supports: MP4, MOV, AVI, MP3, WAV, PNG, JPG</p>
            </div>
          </div>

          <!-- URL Import -->
          <div class="p-6 border border-gray-600 rounded-lg">
            <div class="text-center">
              <LinkIcon class="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 class="text-lg font-semibold mb-2">Import from URL</h3>
              <input 
                v-model="importUrl"
                type="url"
                placeholder="https://example.com/video.mp4"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded mt-2"
              />
              <button 
                @click="importFromUrl"
                :disabled="!importUrl || isImporting"
                class="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
              >
                Import
              </button>
            </div>
          </div>

          <!-- IPFS Import -->
          <div class="p-6 border border-gray-600 rounded-lg">
            <div class="text-center">
              <GlobeAltIcon class="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 class="text-lg font-semibold mb-2">IPFS Import</h3>
              <input 
                v-model="ipfsCid"
                type="text"
                placeholder="QmHash... or /ipfs/QmHash..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded mt-2"
              />
              <button 
                @click="importFromIpfs"
                :disabled="!ipfsCid || isImporting"
                class="w-full mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Progress and Queue -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="uploadQueue.length > 0" class="mb-6">
          <h3 class="text-lg font-semibold mb-4">Upload Queue</h3>
          
          <div class="space-y-3">
            <div 
              v-for="upload in uploadQueue" 
              :key="upload.id"
              class="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
            >
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
                  <component :is="getFileIcon(upload.type)" class="w-8 h-8 text-gray-400" />
                </div>
                
                <div class="flex-1">
                  <div class="font-medium">{{ upload.name }}</div>
                  <div class="text-sm text-gray-400">{{ formatFileSize(upload.size) }}</div>
                  
                  <!-- Progress Bar -->
                  <div class="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div 
                      class="h-2 rounded-full transition-all"
                      :class="getProgressBarClass(upload.status)"
                      :style="{ width: `${upload.progress}%` }"
                    ></div>
                  </div>
                  
                  <div class="text-xs text-gray-400 mt-1">
                    {{ getStatusText(upload) }}
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <button 
                  v-if="upload.status === 'uploading'"
                  @click="cancelUpload(upload.id)"
                  class="p-2 hover:bg-red-600 rounded"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
                
                <button 
                  v-if="upload.status === 'error'"
                  @click="retryUpload(upload.id)"
                  class="p-2 hover:bg-blue-600 rounded"
                >
                  <ArrowPathIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Imports -->
        <div v-if="recentImports.length > 0">
          <h3 class="text-lg font-semibold mb-4">Recent Imports</h3>
          
          <div class="grid grid-cols-4 gap-4">
            <div 
              v-for="media in recentImports" 
              :key="media.id"
              class="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
              @click="addToTimeline(media)"
            >
              <div class="aspect-video bg-gray-600 rounded mb-2 flex items-center justify-center">
                <component :is="getFileIcon(media.type)" class="w-8 h-8 text-gray-400" />
              </div>
              <div class="text-sm font-medium truncate">{{ media.name }}</div>
              <div class="text-xs text-gray-400">{{ formatDuration(media.duration) }}</div>
              <div class="text-xs text-blue-400 mt-1">
                {{ media.source === 'ipfs' ? 'IPFS' : 'Local' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-700 flex justify-between items-center">
        <div class="text-sm text-gray-400">
          {{ uploadQueue.filter(u => u.status === 'completed').length }} / {{ uploadQueue.length }} uploads completed
        </div>
        
        <div class="flex space-x-3">
          <button 
            @click="clearCompleted"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
          >
            Clear Completed
          </button>
          <button 
            @click="$emit('close')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden file input -->
    <input 
      ref="fileInput"
      type="file"
      multiple
      accept="video/*,audio/*,image/*"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  XMarkIcon,
  CloudArrowUpIcon,
  LinkIcon,
  GlobeAltIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  PhotoIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/solid'

// Emits
const emit = defineEmits<{
  close: []
  mediaImported: [media: any]
}>()

// State
const fileInput = ref<HTMLInputElement>()
const importUrl = ref('')
const ipfsCid = ref('')
const isImporting = ref(false)
const uploadQueue = ref<any[]>([])
const recentImports = ref<any[]>([])

// Types
interface UploadItem {
  id: string
  name: string
  size: number
  type: string
  file?: File
  url?: string
  ipfsCid?: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  errorMessage?: string
  mediaId?: string
  duration?: number
}

// Methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  processFiles(files)
}

const handleFileDrop = (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  processFiles(files)
}

const processFiles = (files: File[]) => {
  for (const file of files) {
    const uploadItem: UploadItem = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: getFileType(file.type),
      file,
      progress: 0,
      status: 'pending'
    }
    
    uploadQueue.value.push(uploadItem)
    startUpload(uploadItem)
  }
}

const startUpload = async (uploadItem: UploadItem) => {
  try {
    uploadItem.status = 'uploading'
    
    // Simulate file upload to IPFS
    const result = await uploadToIpfs(uploadItem.file!, (progress) => {
      uploadItem.progress = progress
    })
    
    uploadItem.status = 'processing'
    uploadItem.progress = 100
    
    // Extract media metadata
    const metadata = await extractMediaMetadata(uploadItem.file!)
    
    const mediaItem = {
      id: crypto.randomUUID(),
      name: uploadItem.name,
      type: uploadItem.type,
      source: 'ipfs',
      ipfsCid: result.cid,
      size: uploadItem.size,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      createdAt: new Date()
    }
    
    uploadItem.status = 'completed'
    uploadItem.mediaId = mediaItem.id
    uploadItem.duration = metadata.duration
    
    recentImports.value.unshift(mediaItem)
    emit('mediaImported', mediaItem)
    
  } catch (error) {
    uploadItem.status = 'error'
    uploadItem.errorMessage = error instanceof Error ? error.message : 'Upload failed'
  }
}

const uploadToIpfs = async (file: File, onProgress: (progress: number) => void): Promise<{ cid: string }> => {
  // Simulate IPFS upload with progress
  return new Promise((resolve, reject) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        // Simulate successful upload
        resolve({ cid: `Qm${Math.random().toString(36).substring(2, 15)}` })
      }
      onProgress(progress)
    }, 200)
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      setTimeout(() => {
        clearInterval(interval)
        reject(new Error('Network error'))
      }, 1000)
    }
  })
}

const extractMediaMetadata = async (file: File): Promise<any> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        })
      }
      video.src = URL.createObjectURL(file)
    } else if (file.type.startsWith('audio/')) {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        resolve({
          duration: audio.duration,
          width: 0,
          height: 0
        })
      }
      audio.src = URL.createObjectURL(file)
    } else {
      resolve({
        duration: 0,
        width: 0,
        height: 0
      })
    }
  })
}

const importFromUrl = async () => {
  if (!importUrl.value) return
  
  isImporting.value = true
  
  try {
    const uploadItem: UploadItem = {
      id: crypto.randomUUID(),
      name: getFilenameFromUrl(importUrl.value),
      size: 0,
      type: getFileTypeFromUrl(importUrl.value),
      url: importUrl.value,
      progress: 0,
      status: 'uploading'
    }
    
    uploadQueue.value.push(uploadItem)
    
    // Simulate URL import
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    uploadItem.status = 'completed'
    uploadItem.progress = 100
    
    const mediaItem = {
      id: crypto.randomUUID(),
      name: uploadItem.name,
      type: uploadItem.type,
      source: 'url',
      url: importUrl.value,
      createdAt: new Date()
    }
    
    recentImports.value.unshift(mediaItem)
    emit('mediaImported', mediaItem)
    
    importUrl.value = ''
    
  } catch (error) {
    console.error('URL import failed:', error)
  } finally {
    isImporting.value = false
  }
}

const importFromIpfs = async () => {
  if (!ipfsCid.value) return
  
  isImporting.value = true
  
  try {
    const cleanCid = ipfsCid.value.replace(/^\/ipfs\//, '')
    
    const uploadItem: UploadItem = {
      id: crypto.randomUUID(),
      name: `IPFS Content (${cleanCid.substring(0, 8)}...)`,
      size: 0,
      type: 'video', // Would be detected from IPFS metadata
      ipfsCid: cleanCid,
      progress: 0,
      status: 'uploading'
    }
    
    uploadQueue.value.push(uploadItem)
    
    // Simulate IPFS fetch
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    uploadItem.status = 'completed'
    uploadItem.progress = 100
    
    const mediaItem = {
      id: crypto.randomUUID(),
      name: uploadItem.name,
      type: uploadItem.type,
      source: 'ipfs',
      ipfsCid: cleanCid,
      createdAt: new Date()
    }
    
    recentImports.value.unshift(mediaItem)
    emit('mediaImported', mediaItem)
    
    ipfsCid.value = ''
    
  } catch (error) {
    console.error('IPFS import failed:', error)
  } finally {
    isImporting.value = false
  }
}

const cancelUpload = (uploadId: string) => {
  const upload = uploadQueue.value.find(u => u.id === uploadId)
  if (upload) {
    upload.status = 'error'
    upload.errorMessage = 'Cancelled by user'
  }
}

const retryUpload = (uploadId: string) => {
  const upload = uploadQueue.value.find(u => u.id === uploadId)
  if (upload) {
    upload.status = 'pending'
    upload.progress = 0
    upload.errorMessage = undefined
    startUpload(upload)
  }
}

const clearCompleted = () => {
  uploadQueue.value = uploadQueue.value.filter(u => u.status !== 'completed')
}

const addToTimeline = (media: any) => {
  emit('mediaImported', media)
  // Could also emit specific event for adding to timeline
}

const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('image/')) return 'image'
  return 'unknown'
}

const getFileTypeFromUrl = (url: string): string => {
  const ext = url.split('.').pop()?.toLowerCase()
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video'
  if (['mp3', 'wav', 'aac', 'ogg'].includes(ext || '')) return 'audio'
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image'
  return 'unknown'
}

const getFilenameFromUrl = (url: string): string => {
  return url.split('/').pop() || 'Unknown File'
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'video': return VideoCameraIcon
    case 'audio': return MusicalNoteIcon
    case 'image': return PhotoIcon
    default: return PhotoIcon
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getProgressBarClass = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    case 'uploading':
    case 'processing': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}

const getStatusText = (upload: UploadItem): string => {
  switch (upload.status) {
    case 'pending': return 'Waiting...'
    case 'uploading': return `Uploading... ${upload.progress}%`
    case 'processing': return 'Processing...'
    case 'completed': return 'Completed'
    case 'error': return upload.errorMessage || 'Error'
    default: return ''
  }
}

onMounted(() => {
  // Load any existing recent imports from localStorage
  const saved = localStorage.getItem('river-recent-imports')
  if (saved) {
    try {
      recentImports.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load recent imports:', e)
    }
  }
})
</script>