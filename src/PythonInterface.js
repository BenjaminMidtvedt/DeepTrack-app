const zerorpc = window.require("zerorpc");
const pythonClient = new zerorpc.Client();

pythonClient.connect("tcp://127.0.0.1:2734");


export default {

    client: pythonClient,
    
    echo: (text, callback) => {
        pythonClient.invoke("echo", text, callback)
    },
    
    track_image: (filepath, callback) => {
        pythonClient.invoke("track_image", filepath, callback)
    },

    segment_image: (value, callback) => {
        pythonClient.invoke("segment_image", value, callback)
    }
}