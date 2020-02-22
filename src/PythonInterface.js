const zerorpc = window.require("zerorpc");
const pythonClient = new zerorpc.Client();

pythonClient.connect("tcp://127.0.0.1:2734");


class Python {

    nextJob = undefined
    client = pythonClient

    callbackWrapper(func) {
        const self = this
        function callbackHandler(error, res) {

            if (self.nextJob) {
                self.nextJob()
                self.nextJob = undefined
            }

            if ((error && error.name) === "TimeoutExpired") {
                return
            }
            return func(error, res)
        }
        return callbackHandler
    }

    queue(func) {
        if (this.nextJob) {
            this.nextJob = func 
        } else {
            this.nextJob = () => {} 
            func()
        }
        
    }

    
    
    echo(text, callback) {
        this.queue(() => pythonClient.invoke("echo", text, this.callbackWrapper(callback)))
    }
    
    track_image(filepath, segmentation_thr, minArea, maxArea, callback) {
        this.queue(() => pythonClient.invoke("track_image", filepath, segmentation_thr, minArea, maxArea, this.callbackWrapper(callback)))
    }

    sampleFeature(config, callback)  {
        this.queue(() => pythonClient.invoke("sample_feature", config, this.callbackWrapper(callback)))
    }

}

export default new Python()