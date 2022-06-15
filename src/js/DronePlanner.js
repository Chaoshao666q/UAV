export class DronePlanner{
    constructor(ll2pxFn,px2llFn,distanceFn){
        this.ll2pxFn=ll2pxFn;
        this.px2llFn=px2llFn;
        this.distanceFn=distanceFn;
    }

    plan(polygon,rotate,space,isOpen){
        let bounds = this.createPolygonBounds(polygon);
        let rPolygon = this.createRotatePolygon(polygon, bounds, -rotate || 0);

        if (!rPolygon) {
            throw new Error('旋转错误！');
        }

        let rBounds = this.createPolygonBounds(rPolygon);
        let latline = this.createLats(rBounds, space);

        let line = [];
        let polyline = [];
        let check = null;
        // 计算横向线段
        for (let i = 1; i < Math.floor(latline.len)+1; i++) {
            line = [];
            for (let j = 0; j < rPolygon.length; j++) {
                let nt = j + 1== rPolygon.length?0:j+1;
                check = this.createInlinePoint(
                    [rPolygon[j].lng, rPolygon[j].lat], [rPolygon[nt].lng, rPolygon[nt].lat],
                    rBounds.northLat - i * latline.lat
                );
                if (check && check[1]) {
                    line.push(check)
                }
            }

            if (line.length < 2) {
                continue;
            }

            if (line[0][0] === line[1][0]) {
                continue;
            }
            // 线段都是 西向东
            polyline.push({
                lat: line[0][1],
                lng: Math.min(line[0][0], line[1][0]),
            }, {
                lat: line[0][1],
                lng: Math.max(line[0][0], line[1][0])
            })
        }
        if(latline.len>Math.floor(latline.len)){//最后一个矩形保持宽度
            const leng=polyline.length;
            polyline.push({
                lat: polyline[leng-2].lat-latline.lat,
                lng: polyline[leng-2].lng
            }, {
                lat: polyline[leng-1].lat-latline.lat,
                lng: polyline[leng-1].lng
            })
        }
        //todo 中间没分割线的

        let halfSpaceLng=this.getLngs(rBounds,space)/2;
        let halfSpaceLat=latline.lat/2;
        
        // 记录小矩形（左下点，右上点）
        let rects=[];
        // 上面第一个
        rects.push(polyline[0],{lng:polyline[1].lng,lat:rBounds.northLat});

        // 中间的
        if(polyline.length>=4){
            if(isOpen){// 开放边界
                for(let i=0;i<polyline.length-3;i+=2){
                    if(this.distanceFn(polyline[i],polyline[i+1])>this.distanceFn(polyline[i+2],polyline[i+3])){
                        rects.push({lng:polyline[i].lng,lat:polyline[i+2].lat},polyline[i+1]);
                    }else{
                        rects.push(polyline[i+2],{lng:polyline[i+3].lng,lat:polyline[i+1].lat});
                    }
                }
            }else{// 障碍边界
                for(let i=0;i<polyline.length-3;i+=2){
                    if(this.distanceFn(polyline[i],polyline[i+1])<this.distanceFn(polyline[i+2],polyline[i+3])){
                        rects.push({lng:polyline[i].lng,lat:polyline[i+2].lat},polyline[i+1]);
                    }else{
                        rects.push(polyline[i+2],{lng:polyline[i+3].lng,lat:polyline[i+1].lat});
                    }
                }
            }
            
        }

        // 下面最后一个
        // rects.push({lng:polyline[polyline.length-2].lng,lat:rBounds.southLat},polyline[polyline.length-1]);
        
        // 矩形四个点补齐
        let rectPolygons=[];
        for(let i=0;i<rects.length-1;i+=2){
            rectPolygons.push({lng:rects[i].lng,lat:rects[i+1].lat},rects[i+1],{lng:rects[i+1].lng,lat:rects[i].lat},rects[i]);
        }

        let planRoute=[];
        for(let idx=0;idx<rectPolygons.length-3;idx+=4){
            let left={lng:rectPolygons[idx].lng+halfSpaceLng,lat:rectPolygons[idx].lat-halfSpaceLat};
            let right={lng:rectPolygons[idx+1].lng-halfSpaceLng,lat:rectPolygons[idx+1].lat-halfSpaceLat}
            if(idx%8){
                planRoute.push(right,left);
            }else{
                planRoute.push(left,right);
            }
        }

        return {
            rectPaths:this.createRotatePolygon(rectPolygons, bounds, rotate || 0),
            routePath:this.createRotatePolygon(planRoute, bounds, rotate || 0)
        }



    }

    createPolygonBounds(latlngs) {
        let lats = [];
        let lngs = [];
        for (let i = 0; i < latlngs.length; i++) {
            lats.push(latlngs[i].lat);
            lngs.push(latlngs[i].lng);
        }
        let maxLat = Math.max.apply(Math, lats);
        let maxLng = Math.max.apply(Math, lngs);
        let minLat = Math.min.apply(Math, lats);
        let minLng = Math.min.apply(Math, lngs);
        return {
            center: {
                lat: (maxLat + minLat) / 2,
                lng: (maxLng + minLng) / 2
            },
            // 左上起点，顺时针
            latlngs: [{
                lat: maxLat,
                lng: minLng
            }, {
                lat: maxLat,
                lng: maxLng
            }, {
                lat: minLat,
                lng: maxLng
            }, {
                lat: minLat,
                lng: minLng
            }],
            northLat: maxLat,
            southLat: minLat
        }
    }

    createRotatePolygon(latlngs, bounds, rotate) {
        if (typeof this.ll2pxFn !== 'function' && typeof this.px2llFn !== 'function') {
            return false
        }
        let res = [],
            a, b;
        let c = this.ll2pxFn(bounds.center);
        for (let i = 0; i < latlngs.length; i++) {
            a = this.ll2pxFn(latlngs[i]);
            b = this.transform(a.x, a.y, c.x, c.y, rotate);
            res.push(this.px2llFn(b));
        }
        return res;
    }

    transform(x, y, tx, ty, deg, sx, sy) {
        let raid = deg * Math.PI / 180;
        if (!sy) sy = 1;
        if (!sx) sx = 1;
        return [
            sx * ((x - tx) * Math.cos(raid) - (y - ty) * Math.sin(raid)) + tx,
            sy * ((x - tx) * Math.sin(raid) + (y - ty) * Math.cos(raid)) + ty
        ]
    }

    createLats(bounds, space) {
        let nw = bounds.latlngs[0];
        let sw = bounds.latlngs[3];

        if (typeof this.distanceFn !== 'function') {
            throw new Error('You must call the ".setDistanceFn" method and set a function to calculate the distance!');
        }

        let distance = this.distanceFn({
            lat: nw.lat,
            lng: nw.lng
        }, {
            lat: sw.lat,
            lng: sw.lng
        });
        let steps = distance / space;
        let lats = (nw.lat - sw.lat) / steps;
        return {
            len: steps,
            lat: lats
        }
    }

    getLngs(bounds, space) {
        let se = bounds.latlngs[2];
        let sw = bounds.latlngs[3];

        if (typeof this.distanceFn !== 'function') {
            throw new Error('You must call the ".setDistanceFn" method and set a function to calculate the distance!');
        }

        let distance = this.distanceFn({
            lat: se.lat,
            lng: se.lng
        }, {
            lat: sw.lat,
            lng: sw.lng
        });
        let steps = distance / space;
        let lngs = (se.lng - sw.lng) / steps;
        return  lngs;
    }

    createInlinePoint(p1, p2, y) {
        let yMin=Math.min(p1[1],p2[1]);
        let yMax=Math.max(p1[1],p2[1]);
        if(y<yMin || y>yMax){
            return false;
        }

        let s = p1[1] - p2[1];
        let x;
        if (s) {
            x = (y - p1[1]) * (p1[0] - p2[0]) / s + p1[0]
        } else {
            return false
        }
        if (x > p1[0] && x > p2[0]) {
            return false
        }
        if (x < p1[0] && x < p2[0]) {
            return false
        }
        return [x, y]
    }

}