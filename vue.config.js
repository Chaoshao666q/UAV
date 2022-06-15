module.exports = {
    //生产环境是否要生成 sourceMap
    productionSourceMap: false,
    //部署应用包时的基本 URL,用法和 webpack 本身的 output.publicPath 一致
    //可以通过三元运算去配置dev和prod环境, publicPath: process.env.NODE_ENV === 'production' ? '/prod/' : './'
    publicPath:'/',
    //build 时输出的文件目录
    outputDir:'dist',
    //放置静态文件目录
    //assertsDir:'./src/assets',
    //dev环境下，webpack-dev-server相关配置
    devServer:{
        port:6200,
        host:'0.0.0.0',
        https:false,
        open:true,
        proxy:{
            '/access':{
                target:'https://aip.baidubce.com/oauth/2.0',
                pathRewrite:{'^/access':''},
                changeOrigin:true,
                secure:false
            },
            '/api':{
                target:'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/segmentation/DIKUAIV2',
                pathRewrite:{'^/api':''},
                changeOrigin:true,
                secure:false
            }
        }
    }
}