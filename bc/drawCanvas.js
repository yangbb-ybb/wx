// 绘制基础库（只能绘制 静态图片）
// 为什么走队列
// --- 基于有些位子是不确定的 根据文字的长度 动态确认下一个文字的位子
// --- 绘制图片需要先加载，走队列可以确保
// --- 需要确保在主函数 中得到此函数 得到的结果（导出的图片）而不需要eventBus进行事件监听
/**
 * 基本类型
 * rect
 * text
 * line
 * image
 * dot
 * fn
 * 
 * PS：若需要添加 只需在  _draw 函数 添加对应的方法
 *     若当前的设计不满足需求，只需在当前的绘制函数 添加对应的方法
 *     若的确不能满足，传入 fn,绘制库能在队列中直接添加改方法，并运行(未测试，有需求再改)
*/
export default class Draw{
  // data 绘制的数据
  constructor(ctxName,data,ctxWidth,ctxHeight){
    this.ctxName = ctxName;
    this.ctx = wx.createCanvasContext(ctxName); // 绘制对象
    this.width = ctxWidth || 1000;
    this.height= ctxHeight|| 1000;
    this.data= data;
    this.queue = [];// 所有的 动作走队列
    this._draw(data);
  }
  /**
   * data-item:{
   *   type:image/text/line
   *   图片{
   *    x
   *    y
   *    width:图片的宽度
   *    height:图片的高度
   *    [src]: 图片地址
   *    [clip]: 是否裁剪
   *    [clipR]:裁剪半径
   *   }
   *   文字{
   *     x
   *     y
   *     [font]:字体
   *     [textAlign]:文字对齐方式
   *     [textBaseline]:基线
   *     [text]:文本内容
   *     [bold]:是否加粗 // 真机修复
   *     [strokeWidth]:加粗宽度
   *     [returnWidth]:false
   *   }
   *   // 线
   *   线{
   *      beginX:开始位置X
   *      beginY:开始位置Y
   *      endX:  结束位置X
   *      endY:  结束位子Y
   *      width: 宽度
   *      color: 颜色
   *    }
   *    dot{
   *      x
   *      y
   *      r
   *      color
   *    }
   *    fn{
   *      fn:func(ctx){}
   *    }
   * }
  */
  _draw(data){
    // 清空上次绘制
    this.ctx.clearRect(0, 0, this.width, this.height);
    // 添加队列
    for (let i=0,len=data.length;i<len;i++){
      switch(data[i].type){
        case 'image':
          this.queue.push(this.drawImage.bind(this,data[i]));
          break;
        case 'text':
          this.queue.push(this.drawText.bind(this, data[i]));
          break;
        case 'line':
          this.queue.push(this.drawLine.bind(this, data[i]));
          break;
        case 'dot':
          this.queue.push(this.drawDot.bind(this, data[i]));
          break;
        case 'rect':
          //未测试
          this.queue.push(this.drawRect.bind(this, data[i])); 
          break;
        case 'fn':
          this.queue.push(this.fn.bind(this,data[i]));
          break;
        default:
          console.lgo(data[i].type);
          console.log(data[i]);
          console.warn('警告,当前模式还未设计,请检查 type属性,或者自行添加');
      }
    }
  }
  //绘制函数 
  _doMainItemNext(res,fun){
    return Promise.resolve().then(res=>{
      return this.queue[0] && this.queue[0](res);
    })
    .then(res=>{
      this.queue.shift();//出栈
      return res
    })
    .then((res)=>{
      if(this.queue.length){
        // 递归链式 promise 调用
        return this._doMainItemNext(res)
      }else{
        return this.finish();
      }
    })
  }
  // 绘制函数 需要手动运行
  doMain(){
    wx.showLoading({
      title: '绘制中...',
      mask:true
    })
    return this._doMainItemNext();
  }
  // 绘制 文字
  drawText(data){
    let ctx  = this.ctx;
    ctx.font = data.font||'20px sans-serif';
    ctx.setFillStyle(data.color || "#FF6100");
    ctx.textAlign = data.textAlign || "left";
    ctx.textBaseline = data.textBaseline || 'top';
    ctx.fillText(data.text || '暂无信息', data.x, data.y);
    if(data.bold){// 需要加粗 debug
      ctx.setStrokeStyle(data.color || "#FF6100")
      ctx.strokeText(data.text || '暂无信息', data.x, data.y, data.strokeWidth);
    }
    if(data.returnWidth){
      return ctx.measureText(data.text || '暂无信息').width
    }
  }
  //绘制图片
  drawImage(data){
    let ctx = this.ctx;
    // 裁切
    if(data.clip){
      ctx.save();
      ctx.beginPath()
      ctx.arc(data.x + data.width/2,data.y + data.height/2,data.clipR,0,2 * Math.PI)
      ctx.clip()
    }
    if ((data.src).indexOf('http')!=-1){
      if(data.src){//必须有数据才能 绘制
        return this.promisify(wx.downloadFile)({
          url: data.src
        }).then(res => {
          ctx.drawImage(res.tempFilePath, data.x, data.y, data.width, data.height);
          this.restore(data)
        })
      }
    }else{
      ctx.drawImage(data.src, data.x, data.y, data.width, data.height);
      this.restore(data);
    }
  }
  // 重置 
  restore(data){
    if(data.clip){
      this.ctx.restore();
    }
  }
  // 画线
  drawLine(data){
    let ctx = this.ctx;
    ctx.setStrokeStyle(data.color || '#DBDBDB')
    ctx.beginPath();
    ctx.setLineWidth(data.width||1);
    ctx.moveTo(data.startX, data.startY);
    ctx.lineTo(data.endX, data.endY);
    ctx.closePath();
    ctx.stroke()
  }
  // 绘制点
  drawDot(data){
    let ctx = this.ctx;
    ctx.arc(data.x, data.y, data.r||0, 0, 2 * Math.PI);
    ctx.setFillStyle(data.color || '#062941');
    ctx.fill()
  }
  //绘制一个矩形 区域
  drawRect(data){
    let ctx = this.ctx;
    ctx.setFillStyle(data.color || "#062941");
    ctx.fillRect(data.x, data.y, data.width, data.height);
  }
  // 自定义 函数(一些 特殊复杂情况)
  // 自行 传递函数 进来
  fn(data){
    let ctx = this.ctx;
    data.fn(ctx);
  }
  // 调用 微信 接口
  promisify (original) {
    return function (opt) {
      return new Promise((resolve, reject) => {
        opt = Object.assign({
          success: resolve,
          fail: reject
        }, opt)
        original(opt)
      })
    }
  }
  // 绘制完成
  finish(){
    return new Promise(reslove=>{
      let newFun = this.getLocalImg.bind(this,reslove)
      return this.ctx.draw(false, setTimeout(newFun, 3000))
    })
  }
  //得到本地化图片，扔给主函数
  getLocalImg(reslove){
    wx.hideLoading()
    let self = this;
    wx.canvasToTempFilePath({
      canvasId: this.ctxName,
      success: (res) => {
        reslove(res);
        // 图片 res.tempFilePath
      }
    })
  }
}