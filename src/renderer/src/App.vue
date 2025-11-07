<script setup lang="ts">

const ipcHandle = () => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <div id="app">
    <h1>Welcome to Your Vue.js + Electron App</h1>
    <button @click="ipcHandle">Send Ping to Main Process</button>
  </div>
</template>
