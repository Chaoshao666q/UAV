import decodeMask from './Decoder';
import convexHull from 'monotone-convex-hull-2d';
import concaveman from 'concaveman';

export class TargetExtractor {
  constructor(apiKey, secretKey, apiUrl) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.apiUrl = apiUrl;
    let vm = this;

    let tokenUrl = "/access/token?grant_type=client_credentials&client_id=" + apiKey + "&client_secret=" + secretKey;
    fetch(tokenUrl, {
      // mode: 'no-cors',
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
      },
    })
      .then(response => response.text())
      .then(data => {
        let json = data ? JSON.parse(data) : {};
        vm.token = json.access_token;
        console.log(vm.token);
      })
      .catch(err => console.log('Request Failed', err));
  }

  extract(base64, leftUp, width, height,map) {
    return this.postData(this.apiUrl + '?access_token=' + this.token, {
      'image': base64
    }).then(respJson => {
      let paths=[];
      respJson.results.forEach(r => {
        let targetPixels=[];
        r.mask = decodeMask(r.mask, height);
        for (let i = 0; i < height; i++) {
          for (let j = 0; j < width; j++) {
            if (r.mask[i][j]) {
              targetPixels.push([j+1,i+1]);
            }
          }
        }
        // 凸多边形
        const idxArray=convexHull(targetPixels);
        let polygon=[];
        idxArray.forEach(item=>{
          let px=targetPixels[item];
          let lngLat=map.containerToLngLat(new AMap.Pixel(px[0]+leftUp.x, px[1]+leftUp.y));
          polygon.push(lngLat);
        });

        // 凹多边形
        // const target=concaveman(targetPixels);
        // console.log(target);
        // let polygon=[];
        // target.forEach(item=>{
        //   let lngLat=map.containerToLngLat(new AMap.Pixel(item[0]+leftUp.x, item[1]+leftUp.y));
        //   polygon.push(lngLat);
        // });

        paths.push(polygon);
      });
      console.log(paths);
      
      console.log(respJson);
      return paths;
    })
  }

  async postData(url = '', data = {}) {
    const response = await fetch(url, {
      method: 'POST', 
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data) // 
    });
    return response.json(); 
  }
}