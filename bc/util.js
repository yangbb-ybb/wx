const config = require('../config')

module.exports = {
  request: (opts) => {
    let self = this
    let app = getApp()
    let token = app.globalData.token

    // console.log(opts)

    return new Promise((resolve, reject) => {
      let headerParam = {}
      token && (headerParam.Authorization = token)

      wx.request({
        url: opts.url,
        header: headerParam,
        method: opts.method || 'GET',
        data: opts.data || {},
        complete: () => {
          opts.complete && opts.complete()
        },
        success: res => {
          const data = res.data

          if (data.ReturnCode == 200) {
            app.globalData.isHandle401Error = false
            app.globalData.isHandle0300Error = false
            resolve(data.Data)
          }
          else if (data.ReturnCode == 401) {
            if (!app.globalData.isHandle401Error){
              app.globalData.isHandle401Error = true
              // console.log(data)
              wx.setStorageSync('isOverdue', true)
              wx.removeStorageSync('userInfo')
              app.globalData.currentCheckBrokerId = ''
              // wxLogin(app)
              wx.reLaunch({
                url: '/pages/Home/Home',
              })
              reject({ code: 401 })
            }
          }
          // 0300禁用 0301删除
          else if (data.ReturnCode === '0300' || data.ReturnCode === '0301') {
            if (!app.globalData.isHandle0300Error) {
              app.globalData.isHandle0300Error = true
              // console.log(data)
              wx.setStorageSync('isOverdue', true)
              wx.removeStorageSync('userInfo')
              // console.log(app.globalData.currentCheckBrokerId)

              wx.showModal({
                title: '温馨提示',
                content: '由于特殊原因，您的置业顾问暂时无法为您提供服务，已为您重新分配新的置业顾问，给您带来了不便，请谅解~',
                showCancel: false,
                success: res => {
                  if (res.confirm) {
                    // 禁用需要重新调用分配置业顾问接口
                    if (data.ReturnCode === '0300') {
                      wx.showLoading({
                        title: '分配中..',
                      })

                      let ReplacedMemberId = data.Data ? data.Data.ConsultantId : app.globalData.currentCheckBrokerId

                      wx.request({
                        url: config.service.reAllot,
                        method: 'POST',
                        header: headerParam,
                        data: {
                          ReplacedMemberId,
                          FormId: '',
                          Remark: '获取系统分配的置业顾问信息'
                        },
                        complete() {
                          wx.hideLoading()
                          app.globalData.currentCheckBrokerId = ''
                        },
                        success: res => {
                          wx.reLaunch({
                            url: '/pages/Home/Home',
                          })
                        }
                      })
                    }
                    // 删除不需要调用重新分配
                    else{
                      app.globalData.currentCheckBrokerId = ''
                      wx.reLaunch({
                        url: '/pages/Home/Home',
                      })
                    }
                  }
                }
              })
              // wxLogin(app)
              reject({ code: '0300' })
            }
          }
          else if (data.ReturnCode == 403) {
            if(!app.globalData.isHandleOverdue){
              app.globalData.isHandleOverdue = true
              wx.reLaunch({
                url: '/pages/Home/Home',
              })
            }
          }
          else {
            wx.showModal({
              title: '错误',
              content: data.Msg,
              showCancel: false,
              success: function (res) {
                if (data.ReturnCode == '0003'){
                  app.globalData.isForbidden = true
                }
                opts.errorCallBack && opts.errorCallBack()
              },
              fail: function () { }
            })
            // alert(data.Msg)
            console.log(data)
            reject(data)
          }
        }
      })
    })
  },
  privateRequest: opts => {
    let app = getApp()
    let token = app.globalData.token

    return new Promise((resolve, reject) => {
      let headerParam = {}
      token && (headerParam.Authorization = token)

      wx.request({
        url: opts.url,
        header: headerParam,
        method: opts.method || 'GET',
        data: opts.data || {},
        complete: () => {
          opts.complete && opts.complete()
        },
        success: res => {
          const data = res.data

          if (data.ReturnCode == 200) {
            resolve(data.Data)
          }
          else {
            // alert(data.Msg)
            console.log(data)
            reject(data)
          }
        }
      })
    })
  },

  trim: string => {
    if (typeof string != 'string') return ''
    return string.replace(/^\s+|\s+$/gm, '')
  },

  checkPhone: phone => {
    if (typeof phone !== 'string') return false

    if (phone[0] != 1 || phone.length != 11) {
      return false
    }

    return true
  },

  promisify: original => {
    return function (opt) {
      return new Promise((resolve, reject) => {
        opt = Object.assign({
          success: resolve,
          fail: reject
        }, opt)
        original(opt)
      })
    }
  },

  wxToast: msg => {
    wx.showToast({
      icon: 'none',
      title: msg,
      duration: 2000
    })
  },

  fixPrefixion: number => {
    if(number < 10){
      return `0${number}`
    }
    return number
  },

  formatImageUrl: url => {
    if (!url) return null
    if (url.indexOf('http') > -1) return url
    return `${config.service.ossRoot}/${url}`
  },

  isLeapYear (year) {
    year = year || new Date().getFullYear()

    if (year % 4 === 0 && year % 100 !== 0 || year % 400 === 0) {
      return true
    }
    else {
      return false
    }
  },

  /**
   * 获取该月最大天数，不传参数则取当月
   */
  getMaxDate (month) {
    month = month || new Date().getMonth() + 1

    switch (month) {
      case 1:
      case 3:
      case 5:
      case 7:
      case 8: 
      case 10:
      case 12: 
        return 31
      case 4: 
      case 5:
      case 6: 
      case 9:
      case 11:
        return 30
      case 2:
        return this.isLeapYear()? 29: 28
    }
  },

  isLargeThanDays (startDateObj, days) {
    days = days || 3

    let now = new Date()
    if (now.getFullYear() > startDateObj.getFullYear()) {
      return true
    }
    if(now.getMonth() - startDateObj.getMonth() > 0){
      return this.getMaxDate(startDateObj.getMonth() + 1) - startDateObj.getDate() + now.getDate()
    }
    return now.getDate() - startDateObj.getDate() > days
  },

  // 2019-02-19 12:00 -> 59分钟前
  // 分/时/天以精确计算；
  // 大于24小时且模糊小于三天的按照日模糊计算
  // 模糊大于三天的显示日月；
  // 跨年显示年月日
  formatTimeToTill (timeString, type) {
    let start = !type? new Date(timeString.replace(/-/g, '/')): new Date(timeString)
    let now = new Date();

    let startYear = start.getFullYear()
    let startMonth = start.getMonth() + 1
    let startDate = start.getDate()

    // 间隔时间换算到秒
    let during = (now - start) / 1000

    if(during < 60){ // 小于一分钟
      return '刚刚'
    }
    else if(now.getFullYear() !== startYear){ // 跨年
      return `${startYear}.${this.fixPrefixion(startMonth)}.${this.fixPrefixion(startDate)}`
    }
    else if(this.isLargeThanDays(start)){ // 大于模糊三天
      return `${this.fixPrefixion(startMonth)}.${this.fixPrefixion(startDate)}`
    }
    else if(during / 60 / 60 / 24 >= 1){
      let days = null
      if(now.getMonth() + 1 == startMonth){ // 不跨月
        days = now.getDate() - startDate
      }
      else{ // 跨月
        // console.log(this.getMaxDate(startMonth))
        days = this.getMaxDate(startMonth) - startDate + now.getDate()
      }
      return `${days}天前`
    }
    else{ // 小于一天
      if(during / 60 < 60){
        return `${parseInt(during / 60)}分钟前`
      }
      return `${parseInt(during / 3600)}小时前`
    }
  },

  /**
   * 保留小数位的千位分割
   * @param {number} number 
   */
  formatPriceNumber: (number) => {
    return number.toString().replace(/\d+/, function (n) { // 先提取整数部分
      return n.replace(/(\d)(?=(\d{3})+$)/g, function ($1) {
        return `${$1},`
      })
    })
  },
  /**
   * 处理标签 
   * obj 对象
   * tags需要切的标签
   */
  splitTags(obj,tags){
    for(let i=0,len=tags.length;i<len;i++){
      obj[tags[i]] = this.splitTag(obj[tags[i]],tags[i]);
    }
    return obj
  },
  // 内部函数 具体的切割
  splitTag(value,tags){
    let self = this;
    //若值为 null
    if (value===null||value===""){
      return '';
    }
    //若已经是数组
    if (Object.prototype.toString.call(value)==="[object Array]"){
      return value;
    }
    //若是字符串
    if(typeof value ==="string"){
      if (tags === "UserAvatars") {
        value = value.split(',').map(th => {
          return self.formatImageUrl(th);
        })
      } else {
        value = value.split(',');
      }
      value = value.length ? value : '';
    }
    return value;
  },
  // 物业类型
  formatPropertyType: propertyType => {
    switch (propertyType) {
      case 0:
        return '住宅'
      case 1:
        return '商住'
      case 2:
        return '商铺'
    }
  },

  // 装修类型
  formatDecoration: buildingInfo => {
    switch (buildingInfo.DecorationType) {
      case 0:
        return `装修${buildingInfo.DecorationPrice > 0 ? `(${buildingInfo.DecorationPrice}元/m²)`: ''}`
      case 1:
        return '毛坯'
      case 2:
        return `部分装修${buildingInfo.DecorationPrice > 0 ? `(${buildingInfo.DecorationPrice}元/m²)` : ''}`
    }
  },

  // 供水类型
  formatWaterType: waterType => {
    switch (waterType * 1) {
      case 0:
        return '民用'
      case 1:
        return '商用'
      case 2:
        return '工业'
    }
  },

  // 供电类型
  formatElectricType: electricType => {
    switch (electricType * 1) {
      case 0:
        return '民用'
      case 1:
        return '商用'
      case 2:
        return '工业'
      case 3:
        return '行政事业'
      case 4:
        return '特种'
    }
  },

  // 互动类型
  formatInteractionType (type) {
    switch (type * 1) {
      case 0:
        return '查看名片'
      case 1:
        return '查看楼盘'
      case 2:
        return '保存电话'
      case 3:
        return '转发名片'
      case 4:
        return '拨打电话'
      case 5:
        return '转发楼盘'
      case 6:
        return '聊天咨询'
      case 7:
        return '授权手机号'
      default:
        return ''
    }
  },

  // 互动描述
  formatInteractionText (interaction) {
    // console.log(interaction)
    let interactionType = interaction.InteractionType === undefined ? interaction.InteractiveType : interaction.InteractionType
    // console.log(interactionType)
    switch (interactionType * 1) {
      case 0:
        return '查看了你的名片'
      case 1:
        return '查看了楼盘'
      case 2:
        return '保存了你的电话'
      case 3:
        return '转发了你的名片'
      case 4:
        return '尝试拨打了你的电话'
      case 5:
        return '转发了楼盘'
      case 6:
        return '聊天咨询'
      case 7:
        return '授权了手机号'
      default:
        return ''
    }
  },

  // 推盘状态
  formatBuildingStatus (status) {
    switch (status * 1) {
      case 0:
        return '即将开盘'
      case 1:
        return '销售公示'
      case 2:
        return '正在登记'
      case 3:
        return '即将摇号'
      case 4:
        return '即将选房'
      case 5:
        return '已开盘'
    }
  },

  formatDistance (distance) {
    distance = distance * 1
    if (distance < 1000) {
      return `${parseInt(distance)}m`
    }
    return `${(distance / 1000).toFixed(2)}km`
  },

  formatChatTime (curTimestamp, lastTimeStamp) {
    
    // 如果lastTimeStamp不传，则必返回当前消息时间
    // 如果有lastTimeStamp，则判断时间，本条消息与上条消息时间超过十分钟才返回本条消息时间
    if (lastTimeStamp && this.calcIntervalTime(curTimestamp - lastTimeStamp) <= 10) return ''
    let current = new Date(curTimestamp)
    return `${current.getMonth() + 1}月${current.getDate()}日 ${this.fixPrefixion(current.getHours())}:${this.fixPrefixion(current.getMinutes())}`
  },

  // 计算间隔时间，返回分钟数
  calcIntervalTime (delta) {
    return delta / 1000 / 60
  },

  scrollPageToBottom () {
    wx.pageScrollTo({
      scrollTop: 10000,
      duration: 100
    })
  },

  clipRadiusInCanvas (ctx, centerX, centerY, r, fillColor) {
    fillColor = fillColor || '#fff' // 填充色默认白色

    let leftX = centerX - r
    let rightX = centerX + r
    let topY = centerY - r
    let bottomY = centerY + r

    // 左上
    ctx.beginPath()
    ctx.moveTo(leftX, centerY)
    ctx.arcTo(leftX, topY, centerX, topY, r)
    ctx.lineTo(leftX, topY)
    ctx.lineTo(leftX, centerY)
    ctx.setFillStyle(fillColor)
    ctx.closePath()
    ctx.fill()
    // 右上
    ctx.beginPath()
    ctx.moveTo(rightX, centerY)
    ctx.arcTo(rightX, topY, centerX, topY, r)
    ctx.lineTo(rightX, topY)
    ctx.lineTo(rightX, centerY)
    ctx.setFillStyle(fillColor)
    ctx.closePath()
    ctx.fill()
    // 左下
    ctx.beginPath()
    ctx.moveTo(leftX, centerY)
    ctx.arcTo(leftX, bottomY, centerX, bottomY, r)
    ctx.lineTo(leftX, bottomY)
    ctx.lineTo(leftX, centerY)
    ctx.setFillStyle(fillColor)
    ctx.closePath()
    ctx.fill()
    // 右下
    ctx.beginPath()
    ctx.moveTo(rightX, centerY)
    ctx.arcTo(rightX, bottomY, centerX, bottomY, r)
    ctx.lineTo(rightX, bottomY)
    ctx.lineTo(rightX, centerY)
    ctx.setFillStyle(fillColor)
    ctx.closePath()
    ctx.fill()
  }
}