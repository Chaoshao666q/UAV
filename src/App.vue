<template>
  <div id="app">
    <Mapview></Mapview>
  </div>
</template>
<script>
import Mapview from "./view/MapContainer"
export default {
  name: 'App',
  components: {
    Mapview
  }
}
</script>

<style  scoped>
  #app {
    height: 100%;
    width: 100%;
    padding: 0px;
    margin: 0px;
  }
</style>
