import React from 'react';
import './index.scss';
import { Typography, Button, Table, TableHead, TableRow, Tab, TableCell, TableBody} from "@material-ui/core"
import { RefreshOutlined } from "@material-ui/icons"
import Store from "../store.js"
import Python from "../PythonInterface.js"


export class ImageContainer extends React.Component {
    render() {
        return (
            <div class="image-container" style={{userSelect:"none"}}>
                <div class="image-header">
                    <Button style={{height: "100%", border:"none"}} onClick={this.props.onRequestRefresh}><RefreshOutlined></RefreshOutlined></Button>
                </div>
                <div class="image-wrapper">
                    <ResultDisplay src={this.props.src}></ResultDisplay>
                    <ResultDisplay src={this.props.label}></ResultDisplay>
                </div>
                
            </div>
        )
    }
}

function ResultDisplay(props) {

    return (

            <div style={{width:"50%"}}>
                {props.src ? 
                    Array.isArray(props.src) ? 
                        (<div class="label-wrapper">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            Label name
                                        </TableCell>
                                        <TableCell>
                                            Label value
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                {props.src.map((row, idx) => (
                                    <TableRow key={row}>
                                        <TableCell>
                                            {row.name}
                                        </TableCell>
                                        <TableCell>
                                            {row.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>) : <img style={{width:"100%"}} src={"data:image/bmp;base64, " + props.src.toString("base64")} /> 
                    : null}
            </div>
            
    )

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
            if (res) {
                this.setState({
                    result:res[0],
                    label:res[1]
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
    sidebar = undefined

    comparisons = []
    comparisonIndex = 0
    
    // }
    X0 = 0
    W0 = 0
    leftContainer = undefined

    render() {
        const props = this.props
        const { result, remountKey } = this.state
        const onmousemove = (e2) => {
            console.log(e2.pageX, this.W0.left, (this.W0.right - this.W0.left))
            requestAnimationFrame(() => {
                document.getElementById("display-left").style.width = 100 * (e2.pageX - this.W0.left) / (this.W0.right - this.W0.left) + "%"
            })
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
                        <ImageContainer src={result} label={this.state.label} onRequestRefresh={this.sampleFeature.bind(this)}></ImageContainer>
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
                            <Typography variant="h2" style={{color: "#fff", overflow:"wrap", userSelect: "none"}}>
                                    Drag image(s) to display
                            </Typography>}
                    </div>
                    
                </div>
                
            </div>
          );
    }
  
}

