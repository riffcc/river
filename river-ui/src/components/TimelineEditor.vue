<template>
  <div class="h-full flex flex-col bg-gray-800">
    <!-- Timeline Header -->
    <div class="flex items-center justify-between p-3 border-b border-gray-700">
      <div class="flex items-center space-x-4">
        <h3 class="text-sm font-semibold">Timeline</h3>
        
        <!-- Zoom Controls -->
        <div class="flex items-center space-x-2">
          <button @click="zoomOut" class="p-1 hover:bg-gray-700 rounded">
            <MinusIcon class="w-4 h-4" />
          </button>
          <span class="text-xs text-gray-400">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="zoomIn" class="p-1 hover:bg-gray-700 rounded">
            <PlusIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <!-- Timeline Tools -->
        <button 
          v-for="tool in tools"
          :key="tool.id"
          @click="setActiveTool(tool.id)"
          :class="[
            'p-2 rounded text-xs',
            activeTool === tool.id 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          ]"
        >
          <component :is="tool.icon" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Timeline Ruler -->
    <div class="bg-gray-900 border-b border-gray-700 relative">
      <div class="h-8 relative overflow-hidden" ref="rulerContainer">
        <svg 
          :width="timelineWidth" 
          height="32" 
          class="absolute left-0 top-0"
          :style="{ transform: `translateX(-${scrollX}px)` }"
        >
          <!-- Ruler ticks and labels -->
          <g v-for="(tick, index) in rulerTicks" :key="index">
            <line 
              :x1="tick.position" 
              :y1="tick.major ? 0 : 8" 
              :x2="tick.position" 
              :y2="32"
              stroke="#6B7280" 
              stroke-width="1"
            />
            <text 
              v-if="tick.major"
              :x="tick.position + 4" 
              y="20"
              fill="#9CA3AF" 
              font-size="10"
            >
              {{ formatTimeCode(tick.time) }}
            </text>
          </g>
        </svg>
        
        <!-- Playhead -->
        <div 
          class="absolute top-0 w-px h-8 bg-red-500 z-10"
          :style="{ left: `${playheadPosition}px` }"
        >
          <div class="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rotate-45 transform origin-center"></div>
        </div>
      </div>
    </div>

    <!-- Track Container -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Track Headers -->
      <div class="w-48 bg-gray-900 border-r border-gray-700 overflow-y-auto">
        <div 
          v-for="track in timeline.tracks" 
          :key="track.id"
          class="h-16 flex items-center justify-between px-3 border-b border-gray-700"
        >
          <div class="flex items-center space-x-2">
            <button 
              @click="toggleTrackMute(track.id)"
              :class="[
                'p-1 rounded',
                track.muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              ]"
            >
              <component :is="track.muted ? SpeakerXMarkIcon : SpeakerWaveIcon" class="w-4 h-4" />
            </button>
            
            <button 
              @click="toggleTrackLock(track.id)"
              :class="[
                'p-1 rounded',
                track.locked ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'
              ]"
            >
              <component :is="track.locked ? LockClosedIcon : LockOpenIcon" class="w-4 h-4" />
            </button>
            
            <div>
              <div class="text-sm font-medium">{{ track.name }}</div>
              <div class="text-xs text-gray-400 capitalize">{{ track.type }}</div>
            </div>
          </div>
          
          <button 
            @click="deleteTrack(track.id)"
            class="p-1 hover:bg-red-600 rounded"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
        
        <!-- Add Track Button -->
        <div class="p-3">
          <Menu as="div" class="relative">
            <MenuButton class="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              Add Track
            </MenuButton>
            <MenuItems class="absolute bottom-full left-0 w-full bg-gray-800 border border-gray-700 rounded shadow-lg z-20">
              <MenuItem v-slot="{ active }">
                <button 
                  @click="addTrack('video')"
                  :class="[
                    'w-full px-3 py-2 text-left text-sm',
                    active ? 'bg-gray-700' : ''
                  ]"
                >
                  Video Track
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button 
                  @click="addTrack('audio')"
                  :class="[
                    'w-full px-3 py-2 text-left text-sm',
                    active ? 'bg-gray-700' : ''
                  ]"
                >
                  Audio Track
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>
      
      <!-- Timeline Tracks -->
      <div 
        class="flex-1 overflow-auto relative" 
        ref="tracksContainer"
        @scroll="onTimelineScroll"
        @mousedown="onTimelineMouseDown"
        @mousemove="onTimelineMouseMove"
        @mouseup="onTimelineMouseUp"
      >
        <div 
          :style="{ width: `${timelineWidth}px` }"
          class="relative"
        >
          <!-- Track Lanes -->
          <div 
            v-for="(track, trackIndex) in timeline.tracks" 
            :key="track.id"
            class="h-16 relative border-b border-gray-700"
            :style="{ backgroundColor: trackIndex % 2 === 0 ? '#374151' : '#4B5563' }"
          >
            <!-- Clips in this track -->
            <div 
              v-for="clip in track.clips" 
              :key="clip.id"
              class="absolute top-1 bottom-1 rounded cursor-pointer"
              :class="[
                'border-2',
                selectedClipId === clip.id 
                  ? 'border-blue-400 bg-blue-600' 
                  : 'border-gray-500 bg-gray-600'
              ]"
              :style="{
                left: `${timeToPixels(clip.start)}px`,
                width: `${timeToPixels(clip.end - clip.start)}px`
              }"
              @click="selectClip(clip)"
              @mousedown="startDragClip(clip, $event)"
            >
              <div class="p-1 h-full flex flex-col justify-between">
                <div class="text-xs font-medium truncate">{{ clip.name }}</div>
                <div class="text-xs text-gray-300">
                  {{ formatTimeCode(clip.start) }} - {{ formatTimeCode(clip.end) }}
                </div>
              </div>
              
              <!-- Resize handles -->
              <div 
                class="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize bg-blue-500 opacity-0 hover:opacity-100"
                @mousedown="startResizeClip(clip, 'start', $event)"
              ></div>
              <div 
                class="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize bg-blue-500 opacity-0 hover:opacity-100"
                @mousedown="startResizeClip(clip, 'end', $event)"
              ></div>
            </div>
          </div>
          
          <!-- Playhead -->
          <div 
            class="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
            :style="{ left: `${playheadPosition}px` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { 
  PlusIcon, 
  MinusIcon,
  CursorArrowRaysIcon,
  ScissorsIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon
} from '@heroicons/vue/24/solid'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'

interface TimelineProps {
  timeline: {
    tracks: Array<{
      id: string
      name: string
      type: 'video' | 'audio'
      clips: Array<{
        id: string
        name: string
        start: number
        end: number
        speed?: number
        opacity?: number
        resourceId: string
      }>
      muted?: boolean
      locked?: boolean
    }>
  }
  currentTime: number
}

const props = defineProps<TimelineProps>()

const emit = defineEmits<{
  seek: [time: number]
  addClip: [trackId: string, clipData: any]
  moveClip: [clipId: string, newPosition: any]
  splitClip: [clipId: string, splitTime: number]
}>()

// State
const rulerContainer = ref<HTMLElement>()
const tracksContainer = ref<HTMLElement>()
const zoomLevel = ref(1)
const scrollX = ref(0)
const selectedClipId = ref<string | null>(null)
const activeTool = ref('select')
const dragState = ref<any>(null)

// Constants
const PIXELS_PER_SECOND = 20
const TIMELINE_DURATION = 300 // 5 minutes

// Tools
const tools = [
  { id: 'select', icon: CursorArrowRaysIcon },
  { id: 'cut', icon: ScissorsIcon }
]

// Computed
const timelineWidth = computed(() => TIMELINE_DURATION * PIXELS_PER_SECOND * zoomLevel.value)

const playheadPosition = computed(() => {
  return timeToPixels(props.currentTime) - scrollX.value
})

const rulerTicks = computed(() => {
  const ticks = []
  const pixelsPerSecond = PIXELS_PER_SECOND * zoomLevel.value
  const secondsPerTick = zoomLevel.value < 0.5 ? 10 : zoomLevel.value < 1 ? 5 : 1
  
  for (let i = 0; i <= TIMELINE_DURATION; i += secondsPerTick) {
    ticks.push({
      time: i,
      position: i * pixelsPerSecond,
      major: i % (secondsPerTick * 5) === 0
    })
  }
  
  return ticks
})

// Methods
const timeToPixels = (time: number) => {
  return time * PIXELS_PER_SECOND * zoomLevel.value
}

const pixelsToTime = (pixels: number) => {
  return pixels / (PIXELS_PER_SECOND * zoomLevel.value)
}

const formatTimeCode = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 25) // Assuming 25fps
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

const zoomIn = () => {
  zoomLevel.value = Math.min(4, zoomLevel.value * 1.5)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(0.25, zoomLevel.value / 1.5)
}

const setActiveTool = (toolId: string) => {
  activeTool.value = toolId
}

const selectClip = (clip: any) => {
  selectedClipId.value = clip.id
}

const onTimelineScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollX.value = target.scrollLeft
}

const onTimelineMouseDown = (event: MouseEvent) => {
  if (activeTool.value === 'select' && !event.target?.closest('.clip')) {
    // Click on empty timeline - move playhead
    const rect = tracksContainer.value!.getBoundingClientRect()
    const clickX = event.clientX - rect.left + scrollX.value
    const time = pixelsToTime(clickX)
    emit('seek', Math.max(0, Math.min(TIMELINE_DURATION, time)))
  }
}

const onTimelineMouseMove = (event: MouseEvent) => {
  if (dragState.value) {
    const rect = tracksContainer.value!.getBoundingClientRect()
    const currentX = event.clientX - rect.left + scrollX.value
    const deltaX = currentX - dragState.value.startX
    const deltaTime = pixelsToTime(deltaX)
    
    if (dragState.value.type === 'move') {
      // Move clip
      const newStart = Math.max(0, dragState.value.originalStart + deltaTime)
      const duration = dragState.value.clip.end - dragState.value.clip.start
      
      // Update clip position (this would be handled by parent component)
      console.log('Moving clip to:', newStart)
    }
  }
}

const onTimelineMouseUp = () => {
  dragState.value = null
}

const startDragClip = (clip: any, event: MouseEvent) => {
  event.stopPropagation()
  const rect = tracksContainer.value!.getBoundingClientRect()
  const startX = event.clientX - rect.left + scrollX.value
  
  dragState.value = {
    type: 'move',
    clip,
    startX,
    originalStart: clip.start
  }
}

const startResizeClip = (clip: any, handle: 'start' | 'end', event: MouseEvent) => {
  event.stopPropagation()
  const rect = tracksContainer.value!.getBoundingClientRect()
  const startX = event.clientX - rect.left + scrollX.value
  
  dragState.value = {
    type: 'resize',
    clip,
    handle,
    startX,
    originalStart: clip.start,
    originalEnd: clip.end
  }
}

const toggleTrackMute = (trackId: string) => {
  const track = props.timeline.tracks.find(t => t.id === trackId)
  if (track) {
    track.muted = !track.muted
  }
}

const toggleTrackLock = (trackId: string) => {
  const track = props.timeline.tracks.find(t => t.id === trackId)
  if (track) {
    track.locked = !track.locked
  }
}

const addTrack = (type: 'video' | 'audio') => {
  const newTrack = {
    id: `${type}-${Date.now()}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${props.timeline.tracks.length + 1}`,
    type,
    clips: [],
    muted: false,
    locked: false
  }
  
  props.timeline.tracks.push(newTrack)
}

const deleteTrack = (trackId: string) => {
  const index = props.timeline.tracks.findIndex(t => t.id === trackId)
  if (index > -1) {
    props.timeline.tracks.splice(index, 1)
  }
}

// Watch for playhead position to auto-scroll
watch(() => props.currentTime, (newTime) => {
  const playheadX = timeToPixels(newTime)
  const containerWidth = tracksContainer.value?.clientWidth || 0
  
  if (playheadX - scrollX.value > containerWidth - 100) {
    // Scroll to keep playhead visible
    nextTick(() => {
      tracksContainer.value?.scrollTo({
        left: playheadX - containerWidth / 2,
        behavior: 'smooth'
      })
    })
  }
})
</script>

<style scoped>
.clip {
  transition: all 0.1s ease;
}

.clip:hover {
  transform: scale(1.02);
  z-index: 10;
}
</style>