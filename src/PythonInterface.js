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
                console.log("timer")
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

    getAllFeatures(callback) {
        pythonClient.invoke("get_available_features", true, callback)
    }

    getFeatureProperties(featureName, callback) {
        pythonClient.invoke("get_feature_properties", featureName, callback)
    }

    enqueueTraining(config, callback) {
        pythonClient.invoke("enqueue_training", config, callback)
    }

    getQueue(config, callback) {
        this.queue(() => pythonClient.invoke("get_queue", this.callbackWrapper(callback)))
    }

    popQueue(key, callback) {
        this.queue(() => pythonClient.invoke("pop_queue", key, this.callbackWrapper(callback)))
    }

    getAvailableFunctions(callback) {
        pythonClient.invoke("getAvailableFunctions", callback)
    }
    
    pauseQueue(callback) {
        pythonClient.invoke("pause_queue", callback)
    }

    unpauseQueue(callback) {
        pythonClient.invoke("unpause_queue", callback)
    }

    predict(files, config, arg, callback) {
        if (callback) {
            pythonClient.invoke("predict", files, config, arg, callback)
        } else {
            pythonClient.invoke("predict", files, config, arg)
        }
        
    }

}

export default new Python()