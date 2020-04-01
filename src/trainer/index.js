import React from 'react';
import './index.scss';
import { Typography, IconButton, Select, MenuItem, Button} from "@material-ui/core"
import { Add } from "@material-ui/icons"

import Sidebar from "../sidebar"
import { FeatureSet } from "./Features/Feature"
import Python from "../PythonInterface"



export default class Trainer extends React.Component {

    state = {
        result: null,
        remountKey: (new Date()).getTime()
    }

    remount() {
        this.setState({
            remountKey: (new Date()).getTime()
        })
    }
    sidebar = undefined

    sampleFeature() {
        if (this.sidebar) {
            this.sidebar.resolve((err, image) => {
                if (image) {
                    this.setState({
                        result: "data:image/bmp;base64, " + image.toString("base64")
                    })
                }
                
            })
        }
    }

    // handleOpticsUpdate(newvalue) {
    //     this.featureSet.optics = newvalue
    //     this.sampleFeature()
    // }

    // handleSampleUpdate(newvalue) {
    //     this.featureSet.sample = newvalue
    //     this.sampleFeature()
    // }
    
    render() {
        const props = this.props
        const { result, remountKey } = this.state
        return (
            <div className="base container horizontal">
              
              <Sidebar header={""} theme = {props.theme}>
                  <FeatureSet key={remountKey} ref={ref => this.sidebar = ref} refresh={this.sampleFeature.bind(this)} remount={this.remount.bind(this)}/> 
              </Sidebar>
                <div style={{width:"100%", height:"100%"}}>
                    <Button onClick={() => {console.log(this);this.sampleFeature()}}>Refresh</Button>
                    <img src={result}></img>
                </div>
                
            </div>
          );
    }
  
}

