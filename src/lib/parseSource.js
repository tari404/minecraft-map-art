const fs = require('fs')
const path = require('path')

const colorTabel = fs.readFileSync(path.join(__dirname, './source.txt')).toString()

const regExp = /\{\{\/entry\n\|\sid\s=\s(\d+)\s(\S+)\n\|\srgb\s=\s(.+)\n\|\sblocks\s=\s(.+)\n\}\}/g
console.log(regExp)
const results = [...colorTabel.matchAll(regExp)]
console.log(results.length)
const data = results.map(item => ({
  id: item[1],
  name: item[2],
  color: item[3].split(', ').map(item => Number(item)),
  blocks: item[4].match(/(?<=\{\{BlockLink\|)[^}]+/g),
}))
console.log(data)

fs.writeFileSync(path.join(__dirname, './output.json'), JSON.stringify(data))
