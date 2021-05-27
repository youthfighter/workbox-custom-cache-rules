<template>
  <div id="app">
    <div id="nav">
      <img :src="src1">
      <button @click="btnClick">更换token</button>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      src1: './images/1.jpg'
    }
  },
  methods: {
    btnClick() {
      this.src1 = `./images/1.jpg?token=${Date.now()}`
    }
  }
}
</script>
<style scoped>
img{
  width: 100%;
  height: auto;
}
</style>
