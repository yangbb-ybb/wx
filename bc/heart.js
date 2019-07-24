// 绘制心跳
export default class Heart{
  constructor(ctxName,cvsWidth,cvsHeight) {
    this.ctx = wx.createCanvasContext(ctxName); // 绘制对象
    //第一版本 不做任何处理
    this.width = cvsWidth;
    this.height = cvsHeight;
    this.images = [];//所有的 心跳
    // 清理定时器，why ,昨晚看了片文档，单页应用 new  也会缓存
    if (this.timer) {
      this.clearTimer();
    }
    this.timer = null;
    
    // 开始 绘制
    this.draw();
  }
  // 绘制 第一版本 就是写死的
  draw(){
    let ctx = this.ctx;
    let createImage = true;
    setInterval(() => {
      ctx.clearRect(0, 0, this.width, this.height);
      if (createImage) {// 创建元素
        createImage = false;
        this.createCircle(ctx);
      }else{// 移动心
        this.moveCircle(ctx);
      }
      // 绘制 圆环
      this.drawRing();
      // 绘制 主图
      this.drawMainPic(ctx);
      ctx.draw()
    }, 16)
  }
  //圆环
  //没意义 不写了
  drawRing(){
    //ctx.beginPath(ctx);
  }
  // 中间的红心
  drawmainPic(ctx){
    ctx.save();
    ctx.translate(-25, -25);
    ctx.drawImage('/resource/newAdd/images.png', 150, 150, 50, 50);
    ctx.restore();
  }
  // 绘制点
  createCircle(ctx){
    ctx.save();
    ctx.translate(-10, -10);
    for (let i = 0; i < 6; i++) {
      ctx.drawImage('/resource/newAdd/images.png', 150, 150, 20, 20);
      this.images.push({
        posX: 150,  //x坐标
        posY: 150,  //y坐标
        originX:150,//原x
        originY:150,//原y
        width: 20,
        height: 20,
        direc: (Math.random() * 360) >> 0, // 方向
        speed: (Math.random() * 2 + 3) >> 0 //方向上的速度
      })
    }
    ctx.restore();
  }
  // 移动 心
  moveCircle(ctx){
    ctx.save();
    ctx.translate(-10, -10);
    for (let i=0,len=this.images.length;i<len;i++){
      let x = this.images[i].speed * Math.sin(this.images[i].direc);
      let y = this.images[i].speed * Math.cos(this.images[i].direc);
      this.images[i].posX-=x;
      this.images[i].posY-=y;
      // 边界 判断
      if (this.images[i].posX < 0+50 || 
          this.images[i].posX > this.width-50 || 
          this.images[i].posY < 0+50 || 
          this.images[i].posY > this.height-50){
        this.images[i].posX = this.images[i].originX;
        this.images[i].posY = this.images[i].originY;
        // 重新 生成 速度和方向
        this.images[i].direc= (Math.random() * 360) >> 0, // 方向
        this.images[i].speed= (Math.random() * 2 + 3) >> 0 //方向上的速度
      }
      ctx.drawImage('/resource/newAdd/images.png', this.images[i].posX, this.images[i].posY, 20, 20);
    }
    ctx.restore();
  }
  clearTimer(){
    clearInterval(this.timer);
    this.timer=null;
  }
}