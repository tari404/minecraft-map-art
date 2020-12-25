<template>
  <div id="app">
    <MapCanvas />
  </div>
</template>

<script>
import MapCanvas from '@/components/MapCanvas'

export default {
  name: 'App',
  components: {
    MapCanvas,
  }
}
</script>

<style lang="stylus">
#app
  font-family Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale
</style>
