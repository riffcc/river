<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
      <div class="relative max-w-7xl mx-auto px-4 py-24">
        <div class="text-center">
          <h1 class="text-6xl font-bold mb-6">
            🌊 <span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">River</span>
          </h1>
          <p class="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Collaborative video editing powered by TAMS and decentralized storage. 
            Create, edit, and share videos with frame-perfect precision and real-time collaboration.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <router-link 
              to="/editor"
              class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
            >
              Launch Editor
            </router-link>
            <button class="px-8 py-4 border border-gray-600 hover:border-gray-500 rounded-lg font-semibold text-lg transition-colors">
              Watch Demo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="max-w-7xl mx-auto px-4 py-16">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold mb-4">Powerful Features</h2>
        <p class="text-gray-400 text-lg">Everything you need for professional video editing</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <!-- Real-time Collaboration -->
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Real-time Collaboration</h3>
          <p class="text-gray-400">Work together with your team in real-time. See edits as they happen with conflict-free collaborative editing.</p>
        </div>

        <!-- TAMS Integration -->
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">TAMS Integration</h3>
          <p class="text-gray-400">Built on Time-addressable Media Store for immutable, frame-accurate editing with copy-on-write efficiency.</p>
        </div>

        <!-- Decentralized Storage -->
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">IPFS Storage</h3>
          <p class="text-gray-400">Store your media on IPFS for permanent, decentralized access. Never lose your content with distributed storage.</p>
        </div>
      </div>
    </div>

    <!-- Technical Specs -->
    <div class="bg-gray-800 py-16">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold mb-4">Built for Performance</h2>
          <p class="text-gray-400 text-lg">Professional-grade video editing with modern web technologies</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-400 mb-2">25 FPS</div>
            <div class="text-gray-400">Frame Precision</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-400 mb-2">4K</div>
            <div class="text-gray-400">Video Support</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-400 mb-2">Unlimited</div>
            <div class="text-gray-400">Timeline Tracks</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-yellow-400 mb-2">Real-time</div>
            <div class="text-gray-400">Collaboration</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="max-w-7xl mx-auto px-4 py-16 text-center">
      <h2 class="text-3xl font-bold mb-4">Ready to start editing?</h2>
      <p class="text-gray-400 text-lg mb-8">Jump into River and experience the future of collaborative video editing.</p>
      
      <router-link 
        to="/editor"
        class="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
      >
        Launch River Editor
      </router-link>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-800 py-8">
      <div class="max-w-7xl mx-auto px-4 text-center text-gray-400">
        <p>&copy; 2024 River. Built with TAMS and Lens SDK. Open source and decentralized.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Empty script - all functionality is template-based
</script>
