<template>
  <div>
    <div>
      <input type="file" accept="image/*" @change="onSelectedFile">
      <input type="text" v-model="inputName" placeholder="input name">
      <button @click="download">Download</button>
      <!-- or -->
      <!-- <label for="url">Image URL</label><input name="url" type="text" v-model="path" @change="onInputPath"> -->
    </div>
    <div class="main">
      <canvas width="512" height="512"></canvas>
      <div v-if="finished" class="total">
        <p v-for="(item, i) in needs" :key="i">
          <span>{{ blockType[item.cid] }}: </span><span>{{ item.count }}</span>
        </p>
        <div>Max Height: {{ maxHeight }}</div>
      </div>
    </div>
    <div>
      <label for="column">Column</label><input type="text" name="column" v-model="columnStr">
    </div>
    <div>
      <label for="level">Basic Level</label><input type="text" name="level" v-model="level">
    </div>
    <div v-if="finished" class="total">
      <p v-for="(item, i) in total[column]" :key="i">
        <span>{{ blockType[item.cid] }}: </span><span>{{ item.count }}</span>
      </p>
    </div>
    <div v-if="finished" class="column">
      <div>
        <div v-for="(item, i) in output[column]" :key="i" class="block" :style="{
          background: item.color,
          'margin-bottom': `${item.height * 20}px`
        }">
          <span>{{ item.height + +level }}</span>
          <span>{{ blockType[item.cid] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import nbt from 'prismarine-nbt'
import zlib from 'zlib'

import mapColor from '@/lib/block.json'
import basicNBT from '@/lib/basicNBT.json'

const weight = [0.71, 0.86, 1]
// const weight = [1, 1, 1]

const colorDis = (c, targetC) => {
  let d = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    d[0] += Math.pow(c[i] - targetC[i] * weight[0], 2)
    d[1] += Math.pow(c[i] - targetC[i] * weight[1], 2)
    d[2] += Math.pow(c[i] - targetC[i] * weight[2], 2)
  }
  const minD = Math.min(...d)
  const index = d.findIndex(i => i === minD)
  return [index, minD]
}

const blockType = [
  // 0
  '透明',
  // 1
  '草方块',
  '末地石',
  '蘑菇柄',
  '红石块',

  // 5
  '冰',
  '铁',
  '树叶',
  '白色',
  '粘土块',

  // 10
  '从林木',
  '圆石',
  '水',
  '橡木',
  '石英',
  '橙色',
  '品红',
  '淡蓝',
  '黄色',
  '绿色',

  // 20
  '粉色',
  '灰色',
  '淡灰',
  '青色',
  '紫色',
  '蓝色',
  '棕色',
  '绿色',
  '红色',
  '黑色',

  // 30
  '金',
  '海晶石',
  '青金石',
  '绿宝石',
  '云杉木',
  '下界岩',
  '白瓦',
  '橙瓦',
  '品红瓦',
  '淡蓝瓦',

  // 40
  '黄瓦',
  '黄绿瓦',
  '粉红瓦',
  '灰瓦',
  '淡灰瓦',
  '青瓦',
  '紫瓦',
  '蓝瓦',
  '棕瓦',
  '绿瓦',

  // 50
  '红瓦',
  '黑瓦',
]

export default {
  name: 'MapCanvas',
  data() {
    const output = []
    const total = []
    for (let i = 0; i < 128; i++) {
      output[i] = []
      total[i] = []
      for (let j = 0; j < 128; j++) {
        output[i][j] = {
          cid: 0,
          color: '',
          weight: 0,
          height: 0,
        }
      }
    }
    return {
      finished: false,

      path: '',

      level: '0',
      columnStr: '0',
      inputName: '',
      column: 0,
      rowOffset: 0,

      ctx: null,
      output,
      blockType,
      maxHeight: 0,

      total,
      needs: [],
    }
  },
  watch: {
    columnStr(v) {
      const nv = Number(v)
      if (!isNaN(nv)) {
        this.column = Math.round(nv)
      }
    },
  },
  mounted() {
    const canvas = this.$el.querySelector('.main canvas')
    if (!(canvas instanceof HTMLCanvasElement)) {
      return
    }
    this.ctx = canvas.getContext('2d')
    document.addEventListener('paste', this.onPaste)
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.onPaste)
  },
  methods: {
    onPaste(e) {
      const items = e.clipboardData && e.clipboardData.items
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile()
            this.path = ''
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
              this.loadImg(reader.result)
            }
            break
          }
        }
      }
    },
    onSelectedFile(e) {
      const file = e.target.files[0]
      if (!file) {
        return
      }
      this.path = ''
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        this.loadImg(reader.result)
      }
    },
    onInputPath() {
      this.loadImg(this.path)
    },
    loadImg(path) {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      const img = document.createElement('img')
      img.src = path
      img.onload = () => {
        const a = Math.min(img.width, img.height)
        const sx = (img.width - a) / 2
        const sy = (img.height - a) / 2
        ctx.drawImage(img, sx, sy, a, a, 0, 0, 128, 128)
        const imgArray = ctx.getImageData(0, 0, 128, 128).data
        for (let i = 0; i < imgArray.length; i += 4) {
          const r = imgArray[i]
          const g = imgArray[i + 1]
          const b = imgArray[i + 2]
          let minDis = Infinity
          let cid = 0
          let color = []
          let weightIndex = 0
          for (const c of mapColor) {
            const [index, dis] = colorDis([r, g, b], c.color)
            if (dis < minDis) {
              minDis = dis
              cid = c.id
              color = c.color.map(i => i * weight[index])
              weightIndex = index
            }
          }
          const x = i / 4 % 128
          const y = Math.floor(i / 4 / 128)
          this.output[x][y].cid = cid
          this.output[x][y].weight = weightIndex
          this.output[x][y].color = `rgb(${color.join(',')})`
          this.ctx.fillStyle = `rgb(${color.join(',')})`
          this.ctx.fillRect(x * 4, y * 4, 4, 4)
        }
        this.updateResult()
        this.finished = true
      }
    },
    toInt(bytes) {
      if (bytes.startsWith('1')) {
        return -(~Number('0b' + bytes) + 1)
      } else {
        return Number('0b' + bytes)
      }
    },
    toLongInt(bytes) {
      const high = bytes.substr(0, 32)
      const low = bytes.substr(32, 32)
      return [this.toInt(high), this.toInt(low)]
    },
    updateResult() {
      const needsMap = new Map()
      let maxHeight = 0
      this.output.forEach((column, i) => {
        const totalMap = new Map()
        column.reduce((height, item, index) => {
          totalMap.set(item.cid, (totalMap.get(item.cid) || 0) + 1)
          needsMap.set(item.cid, (needsMap.get(item.cid) || 0) + 1)
          if (item.weight === 0) {
            item.height = Math.min(0, height - 1)
          } else if (item.weight === 2) {
            item.height = height + 1
          } else {
            item.height = height
          }
          if (item.height < 0) {
            const upper = -item.height
            for (let i = index; i >= 0; i--) {
              const h = column[i].height
              column[i].height = h + upper
              if (i > 0) {
                const prevH = column[i - 1].height
                if (h > prevH || h + upper < prevH) {
                  break
                }
              }
            }
          }
          if (item.height > maxHeight) {
            maxHeight = item.height
          }
          return item.height
        }, 0)
        const total = []
        totalMap.forEach((v, k) => {
          total.push({
            cid: k,
            count: v
          })
        })
        this.total[i] = total.sort((a, b) => b.count - a.count)
      })
      const needs = []
      needsMap.forEach((v, k) => {
        needs.push({
          cid: k,
          count: v
        })
      })
      this.needs = needs.sort((a, b) => b.count - a.count)
      this.maxHeight = maxHeight
    },
    download() {
      const h = this.maxHeight + 1
      const v = 128 * 128 * h
      const e = new Array(v).fill(0)
      const map = new Map()
      for (let i = 0; i < this.needs.length; i++) {
        map.set(this.needs[i].cid, i + 1)
      }
      for (let i = 0; i < this.output.length; i++) {
        const column = this.output[i]
        for (let j = 0; j < column.length; j++) {
          const item = column[j]
          const index = v - (128 * 128 * item.height + 128 * j + i) - 1
          e[index] = map.get(item.cid)
        }
      }
      const l = (this.needs.length + 1).toString(2).length
      const result = []
      const restStr = e.reduceRight((str, type) => {
        let newStr = type.toString(2).padStart(l, '0') + str
        if (newStr.length >= 64) {
          const bytes = newStr.substr(-64)
          result.push(this.toLongInt(bytes))
          newStr = newStr.substr(0, newStr.length - 64)
        }
        return newStr
      }, '')
      if (restStr.length) {
        const str = restStr.padStart(64, '0')
        result.push(this.toLongInt(str))
      }

      const blocks = this.needs.map(item => ({
        Name: {
          type: 'string',
          value: mapColor[Number(item.cid) - 1].item[0]
        }
      }))
      blocks.unshift({
        Name: {
          type: 'string',
          value: 'minecraft:air'
        }
      })

      const newNBTData = JSON.parse(JSON.stringify(basicNBT))
      const now = this.toLongInt(Date.now().toString(2).padStart(64, '0'))

      newNBTData.value.Metadata.value.TimeCreated.value = now // CreatedAt
      newNBTData.value.Metadata.value.TimeModified.value = now // ModifiedAt

      newNBTData.value.Metadata.value.TotalVolume.value = v // TotalVolume
  
      newNBTData.value.Metadata.value.Name.value = this.inputName || 'UNNAMED' // TotalVolume

      newNBTData.value.Metadata.value.EnclosingSize.value.y.value = h // Height
      newNBTData.value.Regions.value.Unnamed.value.Size.value.y.value = h // Height

      newNBTData.value.Regions.value.Unnamed.value.BlockStates.value = result // BlockStates
      newNBTData.value.Regions.value.Unnamed.value.BlockStatePalette.value.value = blocks // BlockStatePalette
  
      const nbtBuffer = nbt.writeUncompressed(newNBTData)
      const fileBuffer = zlib.gzipSync(nbtBuffer)

      const blob = new Blob([fileBuffer], {
        type: 'application/octet-stream'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (this.inputName || 'UNNAMED') + '.litematic'
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style lang="stylus" scoped>
.main
  display flex
  canvas
    background-color gray
.column
  margin-top 20px
  margin-bottom 60px
  overflow scroll
  >div
    display flex
    align-items flex-end
input
  margin 10px 0
  font inherit
  &:not(:first-child)
    margin-left 14px
.total
  margin 10px 0
  height fit-content
  display flex
  flex-wrap wrap
  >p
    flex 0 0 120px
    margin 5px
    padding 5px 15px
    border-radius 4px
    line-height 22px
    height 32px
    background-color #f5f5f5
    >span:last-child
      font-size 20px
      color #333
.block
  flex 0 0 60px
  height 60px
  color #fff
  text-shadow 0 0 4px black
  text-align center
  display flex
  flex-direction column
  justify-content center
  align-items center
  >span:first-child
    font-size 24px
    line-height 30px
    font-weight 600
  >span:last-child
    font-size 12px
    line-height 20px
    font-weight 600
</style>
