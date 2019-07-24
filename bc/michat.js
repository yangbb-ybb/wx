let config = require('../config.js')
let util = require('./util.js')
let base64 = require('./base64.js')
let MIMCUser = require('./mimc-min.js')

module.exports = {
  mimc_appId: config.mimc_appId,
  mimc_appAccount: '',
  app: null,
  isLogin: false,

  init (app) {
    this.app = app
    this.mimc_appAccount = app.globalData.userInfo.OpenId
    this.fetchMIMCToken(data => {
      let user = new MIMCUser(this.mimc_appId, this.mimc_appAccount)
      user.registerFetchToken(() => { return data })  //获取token回调
      user.registerStatusChange(this.statusChange)         //登录结果回调
      user.registerServerAckHandler(this.serverAck)       //发送消息后，服务器接收到消息ack的回调
      user.registerP2PMsgHandler(this.receiveP2PMsg)       //接收单聊消息回调
      user.registerDisconnHandler(this.disconnect)        //连接断开回调
      user.login()

      app.globalData.mimcUser = user
      app.globalData.mimc = this
    })
  },

  /*@note: fetchToken()访问APP应用方自行实现的AppProxyService服务，该服务实现以下功能：
      存储appId/appKey/appSec（不应当存储在APP客户端/html/js）
      用户在APP系统内的合法鉴权
      调用小米TokenService服务，并将小米TokenService服务返回结果通过fetchToken()原样返回 **/
  fetchMIMCToken(callback) {
    let app = getApp()
    return util.privateRequest({
      url: config.service.fetchMimcToken
    })
    .then(data => {
      // console.log(data)
      app.globalData.hasChatMoudle = true
      callback && callback(data)
    }, res => {
      if(res.ReturnCode == 405) {
        app.globalData.hasChatMoudle = false
      }
    })
  },

  /**
   * 登陆状态回调
   */
  statusChange(bindResult, errType, errReason, errDesc) {
    if (bindResult) {
      console.log("login succeed")
    }
    else {
      console.log("login failed.errReason=" + errReason + ",errDesc=" + errDesc + ",errType=" + errType)
    }
  },

  getRecordMsg(param, callback) {
    param = param || {}

    return wx.request({
      url: 'https://mimc.chat.xiaomi.net/api/msg/p2p/queryOnCount/',
      method: 'POST',
      header: {
        token: this.app.globalData.mimcUser.getToken()
      },
      data: {
        fromAccount: this.mimc_appAccount,
        // toAccount: 'test_B',
        // utcToTime: new Date().getTime(),
        // count: 20,
        ...param
      },
      complete: () => {
        wx.hideLoading()
      },
      success: res => {
        // console.log(res)
        if (res.statusCode === 200) {
          callback && callback(res.data)
        }
      }
    })
  },

  getContactList (callback) {
    return wx.request({
      url: 'https://mimc.chat.xiaomi.net/api/contact/v2',
      header: {
        token: this.app.globalData.mimcUser.getToken()
      },
      data: {
        msgExtraFlag: true
      },
      complete: () => {
        wx.hideLoading()
      },
      success: res => {
        // console.log(res)
        if (res.statusCode === 200) {
          callback && callback(res.data)
        }
      }
    })
  },

  sendMsg(param) {
    if (!param.msg) return

    // var toUser = 'test_B'
    var toUser = param.toUser
    var message = param.msg
    var message_ = base64.encode(message);
    var ts = new Date().getTime()
    let jsonMsg = String(JSON.stringify({
      version: 0,
      msgId: `${param.bizType || 'TEXT'}_${ts}`,
      timestamp: ts,
      content: message_
    }));
    // console.log(jsonMsg);
    try {
      var packetId = this.app.globalData.mimcUser.sendMessage(toUser, jsonMsg, (param.bizType || 'TEXT'))
    }
    catch (err) {
      console.log("sendMessage fail, err=" + err);
    }
    // console.log(" to " + toUser + ":" + message);
  },

  pushMsg(param) {
    var FromAccount = param.fromUser
    var ToAccount = this.mimc_appAccount
    var bizType = param.bizType || ''
    var FromResource = 'resWeb'
    var Msg = base64.encode(encodeURIComponent(param.msg))
    var ts = new Date().getTime()
    var jsonMsg = String(JSON.stringify({
      version: 0,
      msgId: `${bizType}_${ts}`,
      timestamp: String(ts),
      content: Msg
    }))
    var MsgType = ''
    var BizType = bizType

    return util.request({
      url: config.service.pushMimcMsg,
      method: 'POST',
      data: {
        FromAccount,
        ToAccount,
        FromResource,
        Msg: jsonMsg,
        MsgType,
        BizType
      }
    })
  },

  /**
   * 发送消息的服务器回调
   */
  serverAck(packetId, sequence, timeStamp, errMsg) {
    // console.log("receive msg ack:" + packetId + ",sequence=" + sequence + ",ts=" + timeStamp);
  },

  /**
   * 接收单聊消息回调
   */
  receiveP2PMsg(message) {
    console.log('in global callback for receiveP2PMsg')
    let pages = getCurrentPages()
    let currentPage = pages[pages.length - 1]
    currentPage.handlerP2PMsg && currentPage.handlerP2PMsg(message)
  },

  /**
   * 断开连接回调
   */
  disconnect() {
    console.log("disconnect")
    let app = getApp()
    app.globalData.mimcUser.logout()
    app.globalData.needToReLoginMimc = true
  },

  /**
   * 退出登录
   */
  logout() {
    let app = getApp()
    app.globalData.mimcUser.logout()
  },

}