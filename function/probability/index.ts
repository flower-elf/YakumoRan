import fs from 'fs'
import path from 'path'
import * as api from '../../lib/api'
import config from '../../config'
import logger from '../../lib/logger'
import random from 'random-number-csprng'
import per from '../permission/permission'

try {
  fs.mkdirSync(path.join(api.Data, './probability'))
} catch (error) {}

const limit:any = {}
const limit2:any = {}

const getLimit = (uid: string, tim: number) => {
  if (limit[uid]) return false

  limit[uid] = true
  setTimeout(() => {
    delete limit[uid]
  }, tim)
  return true
}

const secondLimit = (uid: string, tim: number) => {
  if (limit2[uid]) return false

  limit2[uid] = true
  setTimeout(() => {
    delete limit2[uid]
  }, tim)
  return true
}

// 获取玩家的金币
const getMoney = (uid: string) => {
  const moneyPath = path.join(api.Data, `./probability/${uid}.json`)
  if (!fs.existsSync(moneyPath)) {
    fs.writeFileSync(moneyPath, '{"money":100,"probab":50,"highest":0,"overtime":0}')
  }
  return JSON.parse(fs.readFileSync(moneyPath).toString())
}

// 更新json文件
const update = (uid: string, file:any) => {
  try {
    fs.writeFileSync(path.join(api.Data, `./probability/${uid}.json`), JSON.stringify(file, null, 3))
    logger('probability').info('文件写入成功')
  } catch (error) {
    logger('probability').warn('文件写入失败', error)
  }
}

// 核心源码
api.command(new RegExp(`^${config.app.nickname}压(.*)$`), 'probability.do', async (m, e, reply) => {
  if (!getLimit(e.uid, config.function.probab.every)) return

  const nowMoney = getMoney(e.uid)
  if (nowMoney.probab <= 0 || nowMoney.probab >= 100) {
    nowMoney.probab = 50
  }
  const m1 = m[1] === '完' ? nowMoney.money : Number(m[1].trim())

  if (isNaN(m1)) return reply('你输入的似乎不是数字哦~换成数字再试一下吧', config.app.color)
  if (m1 <= 0) return reply('下注金额必须大于0', config.app.color)
  if (m1 > nowMoney.money) return reply('下注金额必须小于您当前余额哦~', config.app.color)
  if (m1 <= Math.max() || m1 >= Math.min()) return reply('请输入一个正常的数字', config.app.color)

  if (nowMoney.money >= m1) {
    if (await random(0, 100) >= nowMoney.probab) {
      nowMoney.money = nowMoney.money - m1
      if (nowMoney.money <= 0) {
        if (secondLimit(e.uid, config.function.probab.huifu)) {
          nowMoney.probab = nowMoney.probab + 10
          nowMoney.money = 100
          nowMoney.overtime = nowMoney.overtime + 1
          update(e.uid, nowMoney)
          reply(` [*${e.username}*]   :  余额 - ${m1} 钞   ❌   ,   已经把您的余额恢复为了 100 钞 , 下次恢复还有${String(config.function.probab.huifu / 1000)}秒！祝您游玩愉快~ `, config.app.color)
        } else {
          nowMoney.probab = nowMoney.probab + 10
          nowMoney.overtime = nowMoney.overtime + 1
          update(e.uid, nowMoney)
          reply(` [*${e.username}*]   :  余额 - ${m1} 钞   ❌   ,   💰 ${String(nowMoney.money)} 钞   ,   恢复还在CD哦~请休息一下，等会过一会发送“重启钱包”来重置钱包吧！`, config.app.color)
        }
      } else {
        nowMoney.probab = nowMoney.probab + 10
        update(e.uid, nowMoney)
        reply(` [*${e.username}*]   :  余额 - ${m1} 钞   ❌   ,   💰 ${String(nowMoney.money)} 钞`, config.app.color)
      }
    } else {
      nowMoney.probab = nowMoney.probab - 10
      nowMoney.money = nowMoney.money + m1
      update(e.uid, nowMoney)
      reply(` [*${e.username}*]   :  余额 + ${m1} 钞   ✔️   ,   💰 ${String(nowMoney.money)} 钞`, config.app.color)
    }
  } else {
    reply(` [*${e.username}*]   :  抱歉  ,  您的余额不足  ,  您的当前余额为  :  ${String(nowMoney.money)} 钞`, config.app.color)
  }

  if (nowMoney.money > nowMoney.highest) { nowMoney.highest = nowMoney.money }

  const glo = getMoney('config')
  if (glo.list == null) { glo.list = [nowMoney.money] }
  if (glo.name == null) { glo.name = [e.uid] }
  const num = glo.name.indexOf(e.uid)
  if (num !== -1) {
    if (glo.list[num] < nowMoney.money) {
      glo.list.splice(num, 1)
      glo.name.splice(num, 1)
    } else {
      return
    }
  }

  if (glo.list.length === 0) {
    glo.list.push(nowMoney.money)
    glo.name.push(e.uid)
    return
  }
  for (let i = 0; i < glo.list.length; i++) {
    let num1 = glo.list[i + 1]
    let num2 = glo.list[i - 1]
    if (num1 == null) { num1 = 0 }
    if (num2 == null) { num2 = nowMoney.money + 1 }
    if (nowMoney.money < glo.list[i] && nowMoney.money > num1) {
      glo.list.splice(i + 1, 0, nowMoney.money)
      glo.name.splice(i + 1, 0, e.uid)
      break
    } else if (nowMoney.money > glo.list[i] && nowMoney.money < num2) {
      glo.list.splice(i, 0, nowMoney.money)
      glo.name.splice(i, 0, e.uid)
      break
    }
  }

  update(e.uid, nowMoney)
  update('config', glo)
})

// 查看钱包
api.command(/^查看钱包$/, 'probability.query', async function (m, e, reply) {
  const nowMoney = getMoney(e.uid)
  reply(` [*${e.username}*]   :  您的余额为  :  ${String(nowMoney.money)}钞`, config.app.color)
})

// 钱包重启计划
api.command(/^重启钱包$/, 'probability.reset', async function (m, e, reply) {
  const nowMoney = getMoney(e.uid)
  if (!secondLimit(e.uid, config.function.probab.huifu)) {
    return null
  } else {
    nowMoney.money = 100
    nowMoney.probab = 50
    update(e.uid, nowMoney)
    reply(` [*${e.username}*]   :  唔~! 请加油哦~ 这是阁下的新钱包~ 祝您能够玩得愉快~!  :  ${String(nowMoney.money)}钞`, config.app.color)
  }
})

// 设置积分
api.command(/^设置\s\[@(.*)@]\s:(.*)$/, 'probability.setting', async function (m, e, reply) {
  const m1 = Number(m[2].trim())
  if (isNaN(m1)) return reply(` [*${e.username}}*]  : 你输入的似乎不是数字哦~换成数字再试一下吧`, config.app.color)
  if (m1 <= 0) return reply(` [*${e.username}}*]  : 下注金额必须大于0`, config.app.color)
  if (m1 <= Math.max() || m1 >= Math.min()) return reply(` [*${e.username}}*]  : 请输入一个正常的数字`, config.app.color)

  const nowMoney = getMoney(e.uid)
  if (!per.users.hasPermission(e.uid, 'permission.probability') && !per.users.hasPermission(e.uid, 'probability.op')) {
    reply(` [*${e.username}*]   :  ${config.app.nickname}做不到啦...去叫叫咱的主人来试试..(?`, config.app.color)
    return null
  }

  nowMoney.money = m1
  update(m[1], nowMoney)
  reply(` [*${e.username}*]   :  [@${m[1]}@]  的余额为  :  ${String(nowMoney.money)}钞`, config.app.color)
})

// 查看自己的信息
api.command(/^模拟信息$/, 'probability.list.me', async function (m, e, reply) {
  const nowMoney = getMoney(e.uid)
  try {
    reply(`[ 模拟赌博 ] \n\n [*${e.username}*] \n您的模拟破产次数：${nowMoney.overtime}\n您的模拟结果最高：${nowMoney.highest}`)
  } catch (error) {}
})

// 查看房间排行榜
api.command(/^模拟排行榜$/, 'probability.list.room', async function (m, e, reply) {
  const nowConfig = getMoney('config')
  try {
    let out = ''
    for (let i = 0; i < nowConfig.list.length; i++) {
      out = out + ` ${i + 1} : [@${nowConfig.name[i]}@]   => ${nowConfig.list[i]} \n`
    }
    reply(`[ 模拟赌博排行榜 ] \n\n [*${e.username}*] \n\n${out}`)
  } catch (error) {}
})
