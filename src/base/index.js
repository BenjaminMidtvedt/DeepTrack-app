import React from 'react';
import './index.css';
import Sidebar from "../sidebar"

import { Slider, Typography } from "@material-ui/core"

import python from "../PythonInterface"

const ACTIVE_RELOAD_MAX_IMAGE_AREA = 50000 * 50000

class Display extends React.Component {

    state = {
        isDragging: false,
        image: undefined,
        result: undefined,
        
    }

    imageWidth = 0
    imageHeight = 0
    imageArea = 0

    componentWillReceiveProps(nextProps) {
        let redoTrack = false

        if (this.props.segmentation_thr !== nextProps.segmentation_thr) redoTrack = true
        
        if (this.props.minArea !== nextProps.minArea) redoTrack = true
        
        if (this.props.maxArea !== nextProps.maxArea) redoTrack = true
        
        if (redoTrack) {
            this.call_tracker(this.state.image, nextProps.segmentation_thr, nextProps.minArea, nextProps.maxArea)
        }
        
    }  
    

    call_tracker(image, segmentation_thr, minArea, maxArea) {
        console.log(minArea, maxArea, segmentation_thr, image)
        if (image) {
            python.track_image(image, segmentation_thr, minArea, maxArea, (error, result) => { 
                if (error) {
                    alert(error)
                } else {
                    
                    this.setState({result: "data:image/bmp;base64, " + result.toString('base64')})
                }  
            })
        }
    }

    onImageLoad({target:img}) {
        this.imageHeight = img.naturalHeight
        this.imageWidth = img.naturalWidth
        this.imageArea = this.imageHeight * this.imageWidth
    }

    render() {
        const {isDragging, image, result} = this.state
        const {segmentation_thr, minArea, maxArea} = this.props
        
        return (
            <div className="main container">           
                <div
                    style={{backgroundColor: isDragging ? "#222" : "#171717"}}
                    id="drag-file" 
                    onDragOver = {(e)=>{
                        this.setState({isDragging: true})
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onDragEnd = {(e) => {e.preventDefault();this.setState({isDragging: false})}}
                    onDragLeave = {(e) => {e.preventDefault();this.setState({isDragging: false})}}
                    onDragExit = {(e) => {e.preventDefault();this.setState({isDragging: false})}}
                    onDrop = {(e) => {
                        e.stopPropagation()
                        const files = e.dataTransfer.files

                        if (files.length === 0) return 

                        this.setState({image: files[0].path, isDragging: false})
                        this.call_tracker(files[0].path, segmentation_thr, minArea, maxArea)  
                    }}
                    >
                    {image && !isDragging ? (<img src={image} onLoad={this.onImageLoad.bind(this)} alt=""></img>) : (<Typography variant="h2" style={{color: "#fff",height:"100vh", lineHeight: "100vh"}}>{isDragging ? "Drop the file here!" : "Drag a file to analyze"}</Typography>) }
                    {result && !isDragging ? <img src={result} alt=""></img> : null}
                </div>
                

            </div>
        );
    }
}


class Base extends React.Component {

    state = {
        image: undefined,
        segmentation_thr: 0.95,
        areaRange:[0, 5],
        result: undefined
    }

    display = undefined

    render() {
        const { theme } = this.props
        const { segmentation_thr, areaRange } = this.state
        return (
            <div className="base container horizontal">
                
                <Sidebar theme={theme} header="DeepTrack predictor">

                    <Typography id="threshold-slider" gutterBottom style={{textAlign: "left"}}> Segmentation Threshold </Typography>
                    <Slider 
                            aria-labelledby="threshold-slider"
                            defaultValue={0.95} 
                            valueLabelDisplay="auto"
                            onChange={(ev, newvalue) => {
                                if (this.display && this.display.imageArea < ACTIVE_RELOAD_MAX_IMAGE_AREA) {
                                    this.setState({segmentation_thr: newvalue})
                                }
                            }}
                            onChangeCommitted = {(ev, newvalue) => {
                                this.setState({segmentation_thr: newvalue})
                            }} 
                            marks={[{value:0, label:"0"}, {value:1, label:"1"}]}
                            step={0.001}
                            min={0}
                            max={1}></Slider>

                    <Typography id="area-slider" gutterBottom style={{textAlign: "left"}}> Accepted Area </Typography>
                    <Slider 
                            aria-labelledby="threshold-slider"
                            defaultValue={[0, 5]}
                            scale={(x) => Math.round(Math.pow(10, x))}
                            valueLabelDisplay="auto"
                            onChange={(ev, newvalue) => {
                                if (this.display && this.display.imageArea < ACTIVE_RELOAD_MAX_IMAGE_AREA) {
                                    this.setState({areaRange: newvalue})
                                }
                            }}
                            onChangeCommitted = {(ev, newvalue) => {
                                this.setState({areaRange: newvalue})
                            }} 
                            marks={[{value:0, label:"1e0"}, {value:1, label:"1e1"}, {value:2, label:"1e2"}, {value:3, label:"1e3"}, {value:4, label:"1e4"}, {value:5, label:"1e5"}]}
                            step={0.001}
                            min={0}
                            max={5}></Slider>
                    
                </Sidebar>

                <Display 
                    ref={(ref) => {this.display = ref}}
                    segmentation_thr={segmentation_thr}
                    minArea={Math.pow(10, areaRange[0])}
                    maxArea={Math.pow(10, areaRange[1])}></Display>
            </div>
        );
    }
}



export default Base;
