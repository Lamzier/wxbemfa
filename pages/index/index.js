const app = getApp()
Page({
  data: {

    //需要修改的地方
    uid:"5f56bf454ed74288826806825256fbaa",//用户密钥，巴法云控制台获取
    // ledtopic:"light002",//控制led的主题，创客云控制台创建
    dhttopic:"temp004",//传输温湿度的主题，创客云控制台创建
    device_status:"离线",// 显示led是否在线的字符串，默认离线

    webState:{//web状态栏
      deng: "关闭",
      fengshan: "关闭",
      chuanghu: "关闭"
    },

    wendu:"",//温度值，默认为空
    shidu:"",//湿度值，默认为空
    dataTime:"", //记录数据上传的时间
    client: null,//mqtt客户端，默认为空
    botton_state: {
      deng: false,
      fengshan: false,
      chuanghu: false,
    },
    botton_icon: {
      deng: "/utils/img/deng_false.png",
      fengshan: "/utils/img/fengshan_false.png",
      chuanghu: "/utils/img/chuanghu_false.png",
    },

  },

//屏幕打开时执行的函数
  onLoad() {
    //检查设备是否在线
    this.getOnline()

    // //检查设备是打开还是关闭
    // this.getOnOff()
    //获取服务器上现在存储的dht11数据
    this.getdht11()
    //设置定时器，每3秒请求一下设备状态
    setInterval(this.getdht11, 3000)
  },

  /**
   * 按钮被点击
   */
  onChange: function(e){
    let that = this
    let value = e.target.dataset.value
    //改变按钮状态
    let botton_state = that.data.botton_state
    if (botton_state == undefined) return
    //数据校验 可以不用
    let state = !botton_state[value]//取状态
    that.setBottonState(value , state)//改变按钮状态
    //执行动作
    that.setDeviceState(that.getTopic(value) , state ? "on" : "off")

    // if (value == "deng"){
    //   that.setDeviceState(that.getTopic(value) , state ? "on" : "off")
    // }else if (value == "fengshan"){
    //   that.setDeviceState(that.data.ledtopic , state ? "on" : "off")
    // }else if (value == "chuanghu"){
    //   that.setDeviceState(that.data.ledtopic , state ? "on" : "off")
    // }

  },

  /**
   * 获取主题
   * @param name 设备名称
   * @returns 主题名称 
   */
  getTopic: function(name){
    if (name == "deng"){
      return "light002"
    }else if (name == "fengshan"){
      return "fen003"
    }else if (name == "chuanghu"){
      return "duoji009"
    }
  },

  /**
   * 设置按钮状态
   */
  setBottonState: function(name , value){
    let that = this
    //改变按钮状态
    let botton_state = that.data.botton_state
    let botton_icon = that.data.botton_icon
    if (botton_state == undefined || botton_icon == undefined) return
    //数据校验 可以不用
    botton_state[name] = value//更新状态
    //修改图标状态
    botton_icon[name] = "/utils/img/" + name + "_" + value + ".png"
    that.setData({
      botton_state: botton_state,
      botton_icon: botton_icon
    })
  },

  //请求设备状态,检查设备是否在线
  getOnline: function(){
    var that = this
     //api 接口详细说明见巴法云接入文档
    wx.request({
      url: 'https://api.bemfa.com/api/device/v1/status/?', //状态api接口，详见巴法云接入文档
      data: {
        uid: that.data.uid,
        topic: that.data.ledtopic,
      },
      header: {
        'content-type': "application/x-www-form-urlencoded"
      },
      success (res) {
        // console.log(res.data)
        if(res.data.status === "online"){//如果在线
          that.setData({
            device_status:"在线"  //设置状态为在线
          })
        }else{                          //如果不在线
          that.setData({
            device_status:"离线"   //设置状态为离线
          })
        }
        // console.log(that.data.device_status)
      }
    })    
  },
  //  //获取开关状态，检查设备是打开还是关闭
  // getOnOff(){
  //   //api 接口详细说明见巴法云接入文档
  //   var that = this
  //   wx.request({
  //     url: 'https://api.bemfa.com/api/device/v1/data/1/get/', //状态api接口，详见巴法云接入文档
  //     data: {
  //       uid: that.data.uid,
  //       topic: that.data.ledtopic,
  //       num:1
  //     },
  //     header: {
  //       'content-type': "application/x-www-form-urlencoded"
  //     },
  //     success (res) {
  //       console.log(res.data.msg)
  //       if(res.data.msg == "on"){  //如果开关on
  //         that.setData({
  //           checked:true,
  //           ledOnOff:"打开",
  //           ledicon: "/utils/img/lighton.png",
  //         })
  //       }else{           //如果开关off
  //         that.setData({
  //           checked:false,
  //           ledOnOff:"关闭",
  //           ledicon: "/utils/img/lightoff.png",
  //         })
  //       }
  //     }
  //   })    
  // },


  getdht11(){
    //获取温湿度值，屏幕初始化时，未订阅收到温湿度时，先去主动获取值
    //api 接口详细说明见巴法云接入文档
    var that = this
    wx.request({
      url: 'https://api.bemfa.com/api/device/v1/data/1/get/', //状态api接口，详见巴法云接入文档
      data: {
        uid: that.data.uid,
        topic: that.data.dhttopic,
        num:1
      },
      header: {
        'content-type': "application/x-www-form-urlencoded"
      },
      success (res) {
        // console.log(res)
        if(res.data.msg.indexOf("#") != -1){//如果数据里包含#号，表示获取的是传感器值，因为单片机上传数据的时候用#号进行了包裹
          //如果有#号就进行字符串分割
          var all_data_arr = res.data.msg.split("#"); //分割数据，并把分割后的数据放到数组里。
          // console.log(res.data.msg)//打印数组
          // console.log(all_data_arr)//打印数组
          that.setData({ //数据赋值给变量
            wendu:all_data_arr[1],//赋值温度
            shidu:all_data_arr[2], //赋值湿度
            dataTime:res.data.time
          })
          //更新按钮状态
          // that.setBottonState("deng" , all_data_arr[3] == "on" ? true : false)//灯
          //更新web状态
          let webState = that.data.webState
          webState["deng"] = all_data_arr[3]
          webState["fengshan"] = all_data_arr[4]
          webState["chuanghu"] = all_data_arr[5]
          that.setData({
            webState: webState
          })




        }
      }
    })    
  },
  
  /**
   * 设置驱动状态
   * @param topic 主题 ， 即设备
   * @param msg on/off
   */
  setDeviceState(topic , msg){
    wx.request({
      url: 'https://api.bemfa.com/api/device/v1/data/1/push/get/?', //状态api接口，详见巴法云接入文档
      
      data: {
        uid: this.data.uid,
        topic: topic,
        msg:msg
      },
      header: {
        'content-type': "application/x-www-form-urlencoded"
      },
      success (res) {
      }
    })   
  },

})
