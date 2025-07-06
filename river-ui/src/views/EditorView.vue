<template>
  <div class="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
    <!-- Top Navigation -->
    <nav class="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-bold text-blue-400">🌊 River</h1>
        <div class="flex items-center space-x-2">
          <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
            New Project
          </button>
          <button class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
            Open
          </button>
          <button class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
            Save
          </button>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- Collaboration Status -->
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          <span class="text-sm text-gray-300">3 collaborators</span>
        </div>
        
        <!-- Project Info -->
        <div class="text-sm text-gray-400">
          My Video Project
        </div>
      </div>
    </nav>

    <!-- Main Editor Layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar - Media Library -->
      <div class="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div class="p-4 border-b border-gray-700">
          <h2 class="text-lg font-semibold mb-3">Media Library</h2>
          <button 
            @click="showMediaImport = true"
            class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Import Media
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Media items -->
          <div class="space-y-2">
            <div v-for="item in mediaItems" :key="item.id" 
                 class="p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                 @click="selectMediaItem(item)">
              <div class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                  <component :is="getMediaIcon(item.type)" class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">{{ item.name }}</div>
                  <div class="text-xs text-gray-400">{{ formatDuration(item.duration) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center - Preview and Timeline -->
      <div class="flex-1 flex flex-col">
        <!-- Video Preview -->
        <div class="flex-1 bg-black flex items-center justify-center relative">
          <div class="relative">
            <video 
              ref="videoPlayer"
              class="max-w-full max-h-full"
              :src="currentVideoSrc"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onVideoLoaded"
            />
            
            <!-- Video Overlay Controls -->
            <div class="absolute bottom-4 left-4 right-4">
              <div class="bg-black bg-opacity-50 rounded p-3">
                <div class="flex items-center space-x-4">
                  <button @click="togglePlay" class="p-2 hover:bg-gray-700 rounded">
                    <component :is="isPlaying ? PauseIcon : PlayIcon" class="w-6 h-6" />
                  </button>
                  
                  <div class="flex-1">
                    <input 
                      type="range" 
                      :value="currentTime" 
                      :max="duration"
                      @input="seekVideo"
                      class="w-full"
                    />
                  </div>
                  
                  <div class="text-sm">
                    {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                  </div>
                  
                  <button @click="toggleMute" class="p-2 hover:bg-gray-700 rounded">
                    <component :is="isMuted ? SpeakerXMarkIcon : SpeakerWaveIcon" class="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline Section -->
        <div class="h-64 bg-gray-800 border-t border-gray-700">
          <TimelineEditor 
            :timeline="timeline"
            :current-time="currentTime"
            @seek="seekVideo"
            @add-clip="addClip"
            @move-clip="moveClip"
            @split-clip="splitClip"
          />
        </div>
      </div>

      <!-- Right Sidebar - Properties and Effects -->
      <div class="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <!-- Properties Panel -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-4 border-b border-gray-700">
            <h2 class="text-lg font-semibold mb-3">Properties</h2>
            
            <div v-if="selectedClip" class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Clip Name</label>
                <input 
                  v-model="selectedClip.name"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2">Speed</label>
                <input 
                  v-model="selectedClip.speed"
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.25"
                  class="w-full"
                />
                <div class="text-xs text-gray-400 mt-1">{{ selectedClip.speed }}x</div>
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2">Opacity</label>
                <input 
                  v-model="selectedClip.opacity"
                  type="range"
                  min="0"
                  max="100"
                  class="w-full"
                />
                <div class="text-xs text-gray-400 mt-1">{{ selectedClip.opacity }}%</div>
              </div>
            </div>
            
            <div v-else class="text-gray-400 text-center py-8">
              Select a clip to edit properties
            </div>
          </div>
          
          <!-- Effects Panel -->
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-3">Effects</h2>
            
            <div class="space-y-2">
              <button 
                v-for="effect in availableEffects" 
                :key="effect.id"
                @click="applyEffect(effect)"
                class="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left"
              >
                <div class="font-medium">{{ effect.name }}</div>
                <div class="text-xs text-gray-400">{{ effect.description }}</div>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Collaboration Panel -->
        <div class="border-t border-gray-700 p-4">
          <h3 class="text-sm font-semibold mb-2">Collaborators</h3>
          <div class="space-y-2">
            <div v-for="collaborator in collaborators" :key="collaborator.id"
                 class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                <span class="text-xs font-bold">{{ collaborator.initials }}</span>
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium">{{ collaborator.name }}</div>
                <div class="text-xs text-gray-400">{{ collaborator.status }}</div>
              </div>
              <div :class="[
                'w-2 h-2 rounded-full',
                collaborator.online ? 'bg-green-500' : 'bg-gray-500'
              ]"></div>
            </div>
          </div>
          
          <button class="w-full mt-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">
            Invite Collaborator
          </button>
        </div>
      </div>
    </div>
    
    <!-- Media Import Modal -->
    <MediaImport 
      v-if="showMediaImport"
      @close="showMediaImport = false"
      @media-imported="onMediaImported"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  PhotoIcon
} from '@heroicons/vue/24/solid'
import TimelineEditor from '@/components/TimelineEditor.vue'
import MediaImport from '@/components/MediaImport.vue'

// State
const videoPlayer = ref<HTMLVideoElement>()
const isPlaying = ref(false)
const isMuted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const currentVideoSrc = ref('')
const selectedClip = ref<any>(null)
const showMediaImport = ref(false)

// Timeline data
const timeline = reactive({
  tracks: [
    {
      id: 'video-1',
      name: 'Video Track 1',
      type: 'video',
      clips: [
        {
          id: 'clip-1',
          name: 'Intro Video',
          start: 0,
          end: 30,
          speed: 1,
          opacity: 100,
          resourceId: 'video-resource-1'
        }
      ]
    },
    {
      id: 'audio-1', 
      name: 'Audio Track 1',
      type: 'audio',
      clips: []
    }
  ]
})

// Media library
const mediaItems = ref([
  {
    id: 'media-1',
    name: 'Intro Video.mp4',
    type: 'video',
    duration: 45.5,
    src: '/sample-video.mp4'
  },
  {
    id: 'media-2',
    name: 'Background Music.mp3',
    type: 'audio', 
    duration: 180.0,
    src: '/sample-audio.mp3'
  },
  {
    id: 'media-3',
    name: 'Logo.png',
    type: 'image',
    duration: 0,
    src: '/sample-image.png'
  }
])

// Collaborators
const collaborators = ref([
  {
    id: 'user-1',
    name: 'Alice Cooper',
    initials: 'AC',
    status: 'Editing timeline',
    online: true
  },
  {
    id: 'user-2', 
    name: 'Bob Smith',
    initials: 'BS',
    status: 'Reviewing',
    online: true
  },
  {
    id: 'user-3',
    name: 'Carol Johnson',
    initials: 'CJ',
    status: 'Offline',
    online: false
  }
])

// Effects
const availableEffects = ref([
  {
    id: 'fade-in',
    name: 'Fade In',
    description: 'Gradually fade in from black'
  },
  {
    id: 'fade-out',
    name: 'Fade Out', 
    description: 'Gradually fade out to black'
  },
  {
    id: 'blur',
    name: 'Blur',
    description: 'Apply gaussian blur effect'
  },
  {
    id: 'color-correction',
    name: 'Color Correction',
    description: 'Adjust brightness, contrast, saturation'
  }
])

// Methods
const togglePlay = () => {
  if (!videoPlayer.value) return
  
  if (isPlaying.value) {
    videoPlayer.value.pause()
  } else {
    videoPlayer.value.play()
  }
  isPlaying.value = !isPlaying.value
}

const toggleMute = () => {
  if (!videoPlayer.value) return
  
  videoPlayer.value.muted = !videoPlayer.value.muted
  isMuted.value = videoPlayer.value.muted
}

const seekVideo = (event: Event) => {
  if (!videoPlayer.value) return
  
  const target = event.target as HTMLInputElement
  const time = parseFloat(target.value)
  videoPlayer.value.currentTime = time
  currentTime.value = time
}

const onTimeUpdate = () => {
  if (!videoPlayer.value) return
  currentTime.value = videoPlayer.value.currentTime
}

const onVideoLoaded = () => {
  if (!videoPlayer.value) return
  duration.value = videoPlayer.value.duration
}

const selectMediaItem = (item: any) => {
  console.log('Selected media item:', item)
  // TODO: Update preview or add to timeline
}

const onMediaImported = (media: any) => {
  mediaItems.value.unshift(media)
  console.log('Media imported:', media)
}

const addClip = (trackId: string, clipData: any) => {
  console.log('Add clip to track:', trackId, clipData)
  // TODO: Implement clip adding logic
}

const moveClip = (clipId: string, newPosition: any) => {
  console.log('Move clip:', clipId, newPosition)
  // TODO: Implement clip moving logic
}

const splitClip = (clipId: string, splitTime: number) => {
  console.log('Split clip:', clipId, 'at time:', splitTime)
  // TODO: Implement clip splitting logic
}

const applyEffect = (effect: any) => {
  if (!selectedClip.value) return
  
  console.log('Apply effect:', effect, 'to clip:', selectedClip.value)
  // TODO: Implement effect application
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'video': return VideoCameraIcon
    case 'audio': return MusicalNoteIcon
    case 'image': return PhotoIcon
    default: return PhotoIcon
  }
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  // Initialize video player with first media item
  if (mediaItems.value.length > 0) {
    currentVideoSrc.value = mediaItems.value[0].src
  }
})
</script>