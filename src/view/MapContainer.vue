<template>
    <div class="home_div">
        <div id="container" ref="container"></div>

        <div class="input-card" style='width: 24rem;'>
            <div class="input-item">
              <input type="checkbox" name='func' v-model="isAI"><span class="input-text">地块识别</span>
              <input type="checkbox" name='func' v-model="isOpen"><span class="input-text">是否开放边界（取消勾选为障碍边界）</span>
            </div>
            <div class="input-item">
                <label>旋转角度</label>
                <input type="range" id="stepRotate" max="360" min="0" value="0" v-model="rotation">
                <span id="stepRotateValue">{{rotation}}</span>
                <input type="number" placeholder="请输入喷幅宽度" id="spaceInp" v-model="space" style="margin-left:30px;width:120px">
            </div>
            <div class="input-item">
                <input id="clear" type="button" class="btn" v-show="isAI" v-model="btnAtxt" @click="aiClick()" />
              <input id="close" type="button" class="btn" v-show="!isAI" v-model="btnBtxt" @click="manualClick()" />
                <label style="float:right; margin-right:20px">覆盖面积：{{totalSquare}} 平方米</label>
            </div>
        </div>
    </div>
</template>
<script>
import AMapLoader from '@amap/amap-jsapi-loader';
import {DronePlanner} from '../js/DronePlanner.js';
import {TargetExtractor} from '../js/TargetExtractor.js';
import html2canvas from 'html2canvas';

export default {
    name:"Mapview",
    data(){
        return{
            apiurl:'/api',
            apiKey:'NOwT5GXVoWl42Zk6CGWkWO6g',
            secretKey:'qlsZVNoozDdzNHIKxlyWE2zrp0RZrf93',

            btnBtxt:'开始绘制',
            btnAtxt:'开始截图',
            map:null,
            mouseTool:null,
            radios:null,
            planner:null,
            extrator:null,
            rectangles:[],
            route:[],
            isAI:false,
            isOpen:true,
            isDrawing:false,
            overlays:[],
            targetPolygon:[],
            rotation:0,
            space:10,
            totalSquare:0
        } 
    },
    created(){

    },
    mounted(){
        this.initAMap();
    },
    methods:{
        //以下为高德地图的调用
        initAMap(){
            let vm=this;
            AMapLoader.load({
                key:'7d4ea95938d8b2dd89b3dc09323573a9',  //设置高德key
                version:"2.0",
                plugins:['AMap.ToolBar','AMap.Driving','AMap.Scale'],
                AMapUI:{
                    version:"1.1",
                    plugins:[],

                },
                Loca:{
                    version:"2.0"
                },
            }).then((AMap)=>{
                this.map = new AMap.Map("container",{
                    WebGLParams:{
                        preserveDrawingBuffer:true
                    },
                    viewMode:"3D",
                    zoom:18,    //缩放等级
                    zooms:[2,22],   //缩放范围
                    center:[114.029661,35.298607],    //初始位置，因为是论文演示，所以默认演示位置
                    layers: [new AMap.TileLayer.Satellite()],  //设置图层,可设置成包含一个或多个图层的数组
                    mapStyle: 'amap://styles/whitesmoke',  //设置地图的显示样式
                });
                this.map.addControl(new AMap.Scale());

                vm.planner=new DronePlanner(lnglat=>{
                    return vm.map.lngLatToContainer(new AMap.LngLat(lnglat.lng, lnglat.lat));
                },px=>{
                    return vm.map.containerToLngLat(new AMap.Pixel(px[0], px[1]));
                },(p1,p2)=>{
                    return new AMap.LngLat(p1.lng, p1.lat).distance(new AMap.LngLat(p2.lng, p2.lat));
                });

                vm.extrator= new TargetExtractor(vm.apiKey,vm.secretKey,vm.apiurl);

                this.map.plugin(["AMap.MouseTool"], function() {
                    vm.mouseTool = new AMap.MouseTool(vm.map);
                    vm.mouseTool.on('draw',function(e){
                        if(vm.isAI){
                            vm.map.remove(e.obj);
                            setTimeout(() => {
                                vm.postRectangle(e.obj.getBounds());
                                vm.map.add(e.obj);
                            }, 1);                            

                            
                            vm.mouseTool.close();
                        }else{
                            const postResults=vm.postPolygon(e.obj.getPath(),vm.planner,vm.isOpen);
                            vm.rectangles=postResults.rects;
                            vm.route.push(postResults.polyline);
                            vm.map.add(vm.rectangles);
                            vm.map.add(vm.route);

                            vm.isDrawing=false;
                            vm.btnBtxt='清除航线并重新绘制';
                            vm.mouseTool.close();
                        }
                        vm.overlays.push(e.obj);
                    });
                });
            }).catch(e=>{
                console.log(e);
            })
        },
        draw(type){
            let vm=this;
          switch(type){
            case 'marker':{
                vm.mouseTool.marker({
                  //同Marker的Option设置
                });
                break;
            }
            case 'polyline':{
                vm.mouseTool.polyline({
                  strokeColor:'#80d8ff'
                  //同Polyline的Option设置
                });
                break;
            }
            case 'polygon':{
                vm.mouseTool.polygon({
                  fillColor:'#f5f5f5',
                  strokeColor:'#ff0000'
                  //同Polygon的Option设置
                });
                break;
            }
            case 'rectangle':{
                vm.mouseTool.rectangle({
                  fillColor:'#f5f5f5',
                  strokeColor:'#ff0000'
                  //同Polygon的Option设置
                });
                break;
            }
            case 'circle':{
                vm.mouseTool.circle({
                  fillColor:'#f5f5f5',
                  strokeColor:'#ff0000'
                  //同Circle的Option设置
                });
                break;
            }
          }
        },
        manualClick(){
            if(this.isDrawing){
                return;
            }
            this.map.remove(this.rectangles);
            this.map.remove(this.route);
            this.map.remove(this.overlays);
            this.map.remove(this.targetPolygon);

            this.rectangles=[];
            this.route=[];
            this.overlays=[];
            this.targetPolygon=[];

            this.btnBtxt='绘制中';
            this.isDrawing=true;
            this.draw('polygon');
        },
        postPolygon(polygon,dronePlanner,isOpen){
            let planDetail=dronePlanner.plan(polygon,this.rotation,this.space,isOpen);
            let rectPaths=planDetail.rectPaths;
            let rects=[];
            let squares=[];
            let total=0;
            //绘制矩形
            for(let i=0;i<rectPaths.length-3;i+=4){
                let rectangle = new AMap.Polygon({
                    path: [rectPaths[i],rectPaths[i+1],rectPaths[i+2],rectPaths[i+3]],
                    strokeColor:'yellow',
                    strokeWeight: 1,
                    strokeOpacity:0,//0.5,控制矩形参数
                    // strokeDasharray: [30,10],
                    // strokeStyle还支持 solid
                    // strokeStyle: 'dashed',
                    fillColor:'yellow',
                    fillOpacity:0,//0.3,控制矩形参数
                    // cursor:'pointer',
                    zIndex:50,
                });
                rects.push(rectangle);
                const square=rectangle.getArea();
                squares.push(square);
                total+=square;
            }

            var polyline = new AMap.Polyline({
                path: planDetail.routePath,  
                borderWeight: 2, // 线条宽度，默认为 1
                strokeColor: '#00ff00', // 线条颜色
                lineJoin: 'round' // 折线拐点连接处样式
            });

            console.log(squares);
            this.totalSquare=Math.round(total);
            return {rects,polyline};
        },

        aiClick(){
            if(this.isDrawing){
                return;
            }
            this.map.remove(this.rectangles);
            this.map.remove(this.route);
            this.map.remove(this.overlays);
            this.map.remove(this.targetPolygon);

            this.rectangles=[];
            this.route=[];
            this.overlays=[];
            this.targetPolygon=[];

            this.btnAtxt='绘制中';
            this.isDrawing=true;
            this.draw('rectangle');
        },
        postRectangle(amapBounds){
            const vm=this;
            let nw=amapBounds.getNorthWest();
            let se=amapBounds.getSouthEast();
            let lu=vm.map.lngLatToContainer(nw).round();
            let rl=vm.map.lngLatToContainer(se).round();
            let width=rl.x-lu.x;
            let height=rl.y-lu.y;

            html2canvas(this.$refs.container,{
                backgroundColor:null,
                useCORS:true,
                scale:1,
                allowTaint:true
            }).then(canvas=>{                
                const img=new Image();
                img.src=canvas.toDataURL('image/jpeg');
                img.onload=function(){
                    const canvasCQ=document.createElement('canvas');
                    const ctx=canvasCQ.getContext('2d');
                    canvasCQ.width=width;
                    canvasCQ.height=height;
                    ctx.drawImage(img,lu.x,lu.y,width,height,0,0,width,height);

                    const base64Origin=canvasCQ.toDataURL('image/jpeg');

                    const chunks = base64Origin.split(',');
                    vm.extrator.extract( chunks.length > 1 ? chunks[1] : src,lu,width,height,vm.map)
                    .then(targetPaths=>{
                        vm.map.remove(vm.targetPolygon);
                        vm.targetPolygon=[];
                        targetPaths.forEach(path=>{
                            var polygon = new AMap.Polygon({
                                path: path,  
                                fillColor: '#f5f5f5', // 多边形填充颜色
                                fillOpacity:0.5,
                                borderWeight: 1, // 线条宽度，默认为 1
                                strokeColor: '#ff0000', // 线条颜色
                            });
                            vm.targetPolygon.push(polygon);

                            const postDetail=vm.postPolygon(polygon.getPath(),vm.planner,vm.isOpen);
                            vm.rectangles=vm.rectangles.concat(postDetail.rects);
                            vm.route.push(postDetail.polyline);
                            
                        });
                        vm.map.add(vm.rectangles);
                        vm.map.add(vm.route);
                        vm.map.add(vm.targetPolygon);
                        vm.isDrawing=false;
                        vm.btnAtxt='开始识别';

                        vm.map.remove(vm.overlays);
                        vm.overlays=[];
                    });
                    
                }                
            })
        }
    }


}
</script>
<style  scoped>
    .home_div{
        padding:0px;
        margin: 0px;
        width: 100%;
        height: 100%;
        position: relative;
    }
    #container{
        padding:0px;
        margin: 0px;
        width: 100%;
        height: 100%;
        position:absolute;
    }
    .map_title{
         position:absolute;
         z-index: 1;
         width: 100%;
         height: 50px;
         background-color: rgba(27, 25, 27, 0.884);

    }
    h3{
        position:absolute;
        left: 10px;
        z-index: 2;
        color: white;
    }
    .input-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        word-wrap: break-word;
        background-color: #fff;
        background-clip: border-box;
        border-radius: .25rem;
        width: 12rem;
        border-width: 0;
        border-radius: 0.4rem;
        box-shadow: 0 2px 6px 0 rgba(114, 124, 245, .5);
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        padding: 0.75rem 1.25rem;
    }
    .btn {
        display: inline-block;
        font-weight: 400;
        text-align: center;
        white-space: nowrap;
        vertical-align: middle;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        border: 1px solid transparent;
        transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
        background-color: transparent;
        background-image: none;
        color: #25A5F7;
        border-color: #25A5F7;
        padding: .25rem .5rem;
        line-height: 1.5;
        border-radius: 1rem;
        -webkit-appearance: button;
        cursor:pointer;
    }

    .btn:hover {
        color: #fff;
        background-color: #25A5F7;
        border-color: #25A5F7;
        text-decoration: none
    }

</style>