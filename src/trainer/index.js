import React from 'react';
import './index.scss';
import { Typography, IconButton, Select, MenuItem, Button} from "@material-ui/core"
import { Add } from "@material-ui/icons"

import Sidebar from "../sidebar"
import { Optics, Aberration, Scatterer} from "./Features/Feature"
import Python from "../PythonInterface"


class OpticsPanel extends React.Component {


    features = [
    ]


    
    addFeature(type) {
        const obj = {
            feature: undefined,
            properties: undefined, 
            type: undefined
        }

        let feature = undefined

        if (type === "optics") {
            feature = <Optics onChange={(type, items) => {
                obj.type = type
                obj.properties = items
                this.props.onChange(this.features.map(feature => {return {properties:feature.properties, type:feature.type}}))
            }}/>
        } else {
            feature = <Aberration onChange={(type, items) => {
                obj.type = type
                obj.properties = items
                this.props.onChange(this.features.map(feature => {return {properties:feature.properties, type:feature.type}}))
            }}/>
        }
        

        obj.feature = feature

        this.features = [...this.features, obj]

        this.forceUpdate()
    }

    componentDidMount() {
        this.addFeature("optics")
    }
    
    render() {
        return (
            <div hidden={this.props.hidden}>
                {this.features.map(f => f.feature)}
                <IconButton aria-label="add" onClick={this.addFeature.bind(this)}><Add/></IconButton>
            </div>
            
        )
    }
}

class SamplePanel extends React.Component {

    
    features =  [
    ]
    


    addFeature() {
        const obj = {
            feature: undefined,
            properties: undefined, 
            type: undefined
        }

        let feature = undefined

        
        feature = <Scatterer onChange={(type, items) => {
            obj.type = type
            obj.properties = items
            this.props.onChange(this.features.map(feature => {return {properties:feature.properties, type:feature.type}}))
        }}/>

        

        obj.feature = feature

        this.features = [...this.features, obj]

        this.forceUpdate()
    }


    render() {
        return (
            <div hidden={this.props.hidden}>
                {this.features.map(i => i.feature)}
                <IconButton aria-label="add" onClick={this.addFeature.bind(this)}><Add/></IconButton>
            </div>
            
        )
    }
}

export default class Trainer extends React.Component {

    state = {
        index: 0,
        models: [],
        activeModel:undefined
    }



    featureSet = {
        optics: null,
        sample: null,
        image_size: [128, 128]
    }

    a11yProps(i) {
        return {
            className: this.state.index === i ? "tab-hor tab-hor-active" : "tab-hor",
            onClick: () => this.setState({index: i})
        };
    }

    sampleFeature() {
        console.log("sampling")
        if (this.featureSet.optics && this.featureSet.sample) {
            Python.sampleFeature(JSON.stringify(this.featureSet), (error, result) => {
                if (error) {
                    alert(error)
                } else {
                    this.setState({result: result + "?dummy=" + Math.ceil(Math.random() * 10000)})
                }
            })
        }
    }

    handleOpticsUpdate(newvalue) {
        this.featureSet.optics = newvalue
        this.sampleFeature()
    }

    handleSampleUpdate(newvalue) {
        this.featureSet.sample = newvalue
        this.sampleFeature()
    }
    
    render() {
        const props = this.props
        const {index, models, activeModel, result} = this.state

        return (
            <div className="base container horizontal">
              
              <Sidebar header={"DeepTrack network trainer"} theme = {props.theme}>
                <Button onClick={() => console.log(this.getAllFeatures())}>log!</Button>
                <Select value={activeModel}>
                    {activeModel === undefined ? <MenuItem value={undefined}></MenuItem> : null }
                    <MenuItem value={"add"}>
                        <Add></Add> Create a new model
                    </MenuItem>
                    <MenuItem value={"Loaded model"}>
                        Loaded model
                    </MenuItem>
                </Select>
                
                <div className="tabs-hor">
                    <div {...this.a11yProps(0)} ><Typography color="inherit">Optics</Typography></div>
                    <div {...this.a11yProps(1)} ><Typography color="inherit">Sample</Typography></div>
                    <div {...this.a11yProps(2)} ><Typography color="inherit">Noise</Typography></div>
                </div>
                <OpticsPanel onChange={this.handleOpticsUpdate.bind(this)} hidden = {this.state.index !== 0}></OpticsPanel>
                <SamplePanel onChange={this.handleSampleUpdate.bind(this)} hidden = {this.state.index !== 1}></SamplePanel>
              </Sidebar>
                <div style={{width:"100%", height:"100%"}}>
                    <Button onClick={() => {console.log(this);this.sampleFeature()}}>Refresh</Button>
                    <img src={result}></img>
                </div>
                
            </div>
          );
    }
  
}

