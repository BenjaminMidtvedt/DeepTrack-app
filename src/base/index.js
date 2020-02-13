import React from 'react';
import './index.css';

import { Input, Button, CircularProgress, Slider } from "@material-ui/core"

import python from "../PythonInterface"

const {dialog} = window.require('electron').remote;

var exec = window.require('child_process').exec;



class Base extends React.Component {

    state = {
        image: undefined,
        result: undefined
    }

    getImage() {
        let filepaths = dialog.showOpenDialogSync({properties: ['openFile']})

        this.setState({image: filepaths, result:"loading"})
    
        python.track_image(filepaths[0], (error, result) => {
            if (error) {
                alert(error)
            } else {
                this.setState({result: result + "?dummy=" + Math.ceil(Math.random() * 10000)})
            }  
        })
        
        // child.stdout.on('data', (result) => {
        //     
        //     this.forceUpdate()
        // });
    }

    segmentImage(event, value) {
        python.segment_image(value / 1000, (error, result) => {
            if (error) {
                alert(error)
            } else {
                this.setState({result: result + "?dummy=" + Math.ceil(Math.random() * 10000)})
            }  
        })
    }

    Display(props) {
        const {image, result} = props
        return (
            <div className="main container">
                {image ? <img src={image} alt="Upload an image to analyze!">
                </img> : <div></div>}

                {result ? 
                    (result=="loading" ?
                        <CircularProgress >
                        </CircularProgress> :
                        <img src={result} alt="">
                        </img>
                    ) : <div></div>}
            </div>
        );
    }
    
    

    render() {
        return (
            <div className="base container horizontal">
                <this.Display image={this.state.image} result={this.state.result}></this.Display>
                
                <div className="sidebar">
                    <p> DeepTrack Fluorescence Tracker </p>
                    <Button
                        variant="contained"
                        component="label"
                        onClick={this.getImage.bind(this)}>
                        Choose a file!
                    </Button>

                    {this.state.result ? 
                        <Slider defaultValue={0.5} 
                                onChange={this.segmentImage.bind(this)}
                                min={0}
                                max={1000}></Slider> : null }

                </div>
            </div>
        );
    }
}



export default Base;
