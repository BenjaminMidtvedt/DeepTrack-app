import React from 'react';
import './index.scss';
import { Typography, Button, Table, TableHead, TableRow, Tab, TableCell, TableBody, Input} from "@material-ui/core"
import { RefreshOutlined, FontDownload, GetApp } from "@material-ui/icons"
import Store from "../store.js"
import Python from "../PythonInterface.js"
import {ResultDisplay} from "../models"
const { dialog } = window.require('electron').remote;
const fs = window.require('fs');



export class ImageContainer extends React.Component {
    render() {
        return (
            <div class="image-container" style={{userSelect:"none"}}>
                <div class="image-header">
                    <Button style={{height: "100%", border:"none"}} onClick={this.props.onRequestRefresh}><RefreshOutlined></RefreshOutlined></Button>
                    {this.props.label ? 
                    <div style={{marginLeft: "auto"}}>
                    Save Images
                    <Input id="images_to_save" style={{marginLeft:10}} type="number" defaultValue={1}></Input>
                    <Button style={{height: "100%", border:"none"}} onClick={() => this.props.onRequestDownload(parseInt(document.getElementById("images_to_save").value))}><GetApp></GetApp></Button>
                    </div> : null
                    }
                </div>
                <div class="image-wrapper">
                    {
                    this.props.label ? 
                        <>
                        <ResultDisplay title="Input" src={this.props.src} height="100%" width="100%"></ResultDisplay>
                        <ResultDisplay title="Label" src={this.props.label} height="100%" width="100%"></ResultDisplay>
                        </> :
                         <div>
                         <Typography color="secondary" variant="h3" >{this.props.errorTitle}</Typography>
                         <pre style={{fontSize:20, whiteSpace: "pre-wrap"}}>{this.props.errorMessage}</pre>
                         </div>
                    }
                </div>
                
            </div>
        )
    }
}

export default class Trainer extends React.Component {

    state = {
        result: null,
        label:null,
        comparison: null,
        remountKey: (new Date()).getTime()
    }

    remount() {
        this.setState({
            remountKey: (new Date()).getTime()
        })
    }
    

    sampleFeature() {
        Python.sampleFeature(Store.getState().undoable.present.items, (err, res) => {
            if (!err) {
                this.setState({
                    error: "",
                    result:res[0],
                    label:res[1]
                })
            } else {
                this.setState({
                    error: err,
                    result: null,
                    label: null
                })
            }
        })
    }
    
    updateComparison() {
        if (this.comparisons && this.comparisons.length > 0) {
            const index = (this.comparisonIndex % this.comparisons.length)
            this.setState({comparison: this.comparisons[index].path})
            this.comparisonIndex += 1;  
        }
    }

    downloadImages(num) {
        const self = this
        dialog.showOpenDialog({properties:["openDirectory"]}).then((res) => {
            if (res.filePaths && res.filePaths.length === 1) {
                let dict = []
                const dir = res.filePaths[0] + "/"
                try {
                    dict = JSON.parse(fs.readFileSync(dir + "config.json"))
                } catch {}
                try {
                    fs.mkdirSync(dir + "images")
                } catch {}
                try {
                    fs.mkdirSync(dir + "labels")
                } catch {}
                console.log(dict)

                const items = Store.getState().undoable.present.items 
                const d = (new Date())
                let datestring = ("0" + d.getDate()).slice(-2) + ("0"+(d.getMonth()+1)).slice(-2) +
                    d.getFullYear() + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2) + ("0" + d.getSeconds()).slice(-2);

                function save(index, result, label) {
                    const entry = {}
                    if (Array.isArray(result)) {
                        entry.input = {value: result, type:"list"}
                    } else {
                        const path = dir + "images/" + datestring + "image" + index + ".bmp"
                        fs.writeFileSync(path, result, "base64", () => {})
                        entry.input = {value: path, type:"path"}
                    }

                    if (Array.isArray(label)) {
                        entry.label = {value: label, type:"list"}
                    } else {
                        const path = dir + "labels/" + datestring + "label" + index + ".bmp"
                        fs.writeFileSync(path, label, "base64", () => {})
                        entry.label = {value: path, type:"path"}
                    }
                    dict.push(entry)
                    
                }

                function requestNext(index, self) {
                    console.log(index, num)
                    if (index < num) {                    
                        Python.sampleFeature(items, (err, res) => { 
                            if (res) {
                                save(index, res[0], res[1])
                            }
                            
                            self.setState({result: res[0], label:res[1]})

                            requestNext(index + 1, self)

                        })
                    } else {
                        fs.writeFileSync(dir + "config.json", JSON.stringify(dict, null, 4))
                    }
                }

                if (this.state.result && this.state.label) {
                    save(0, this.state.result, this.state.label)
                    requestNext(1, self)
                } else requestNext(0, self)

            }
        })
    }
    sidebar = undefined

    comparisons = []
    comparisonIndex = 0
    
    // }
    X0 = 0
    W0 = 0
    leftContainer = undefined

    render() {
        const props = this.props
        const { result, remountKey, error } = this.state
        const onmousemove = (e2) => {
            console.log(e2.pageX, this.W0.left, (this.W0.right - this.W0.left))
            requestAnimationFrame(() => {
                document.getElementById("display-left").style.width = 100 * (e2.pageX - this.W0.left) / (this.W0.right - this.W0.left) + "%"
            })
        }
        let errorTitle = ""
        let errorMessage = "".slice()
        if (error) {
            errorTitle = error.name
            errorMessage = "..." + error.stack.slice(-200) + "\n\n" + error.message
            console.log(error.stack)
        }
        return (
            <div className="base container horizontal">
              
                <div id="display-container" 
                    onMouseDown={(e) => {
                        if (e.target.id === "display-center") {
                            this.W0 = e.currentTarget.getBoundingClientRect()
                            console.log(e.currentTarget)
                            e.currentTarget.addEventListener("mousemove", onmousemove)
                        }
                        this.isDragging = false 
                    }}

                    onMouseUp={(e)=>{
                        e.currentTarget.removeEventListener("mousemove", onmousemove)
                    }}

                    >
                    <div id="display-left">

                            <ImageContainer 
                            src={result} 
                            label={this.state.label}
                            errorTitle={errorTitle}
                            errorMessage={errorMessage}
                            onRequestDownload={this.downloadImages.bind(this)} 
                            onRequestRefresh={this.sampleFeature.bind(this)}>}
                            </ImageContainer>
                    </div>
                    
                    <div id="display-center" >
                        
                    </div>

                    <div id="display-right" 
                        onDragOver={(e) => {
                            e.preventDefault();
                            const dt = e.dataTransfer
                            if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') !== -1 : dt.types.contains('Files'))) {
                                requestAnimationFrame(() => {
                                    document.getElementById("display-right").style.backgroundColor = "#333"
                                })
                            }
                            
                        }}

                        onDragLeave={(e) => {
                            e.preventDefault();
                            const dt = e.dataTransfer
                            if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') !== -1 : dt.types.contains('Files'))) {
                                requestAnimationFrame(() => {
                                    document.getElementById("display-right").style.backgroundColor = ""
                                })
                            }
                            
                        }}

                        onDragEnd={(e) => {
                            e.preventDefault();
                            
                        }}

                        onDrop={(e) => {
                            e.preventDefault();
                            let files = e.dataTransfer.files
                            if (files.length === 0) return

                            const images = []

                            for (let i = 0; i < files.length; i++) {
                                if (files[i].type.startsWith("image")) {
                                    images.push(files[i])
                                } 
                            }
                            
                            this.comparisons = images

                            this.comparisonIndex = 0;

                            this.updateComparison()

                            requestAnimationFrame(() => {
                                document.getElementById("display-right").style.backgroundColor = ""
                            })
                        }}
                    
                    >
                        {this.state.comparison ? 
                         <ImageContainer src={this.state.comparison} onRequestRefresh={this.updateComparison.bind(this)}/> :
                            <Typography variant="h4" style={{width:"100%", textAlign: 'center', color: "#fff", overflow:"wrap", userSelect: "none"}}>
                                    Drag image(s) here!
                            </Typography>}
                    </div>
                    
                </div>
                
            </div>
          );
    }
  
}

