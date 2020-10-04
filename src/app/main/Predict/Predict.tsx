import React from 'react';
import { Slider, Typography, Fab, createStyles, Theme } from '@material-ui/core';

import python from '../../../providers/PythonInterface';
import { ResultDisplay } from '../training/Training.jsx';
import store from '../../../store/store';
import { GetApp } from '@material-ui/icons';

const { dialog } = window.require('electron').remote;
const fs = window.require('fs');

interface DisplayPropTypes {}

interface DisplayStateTypes {
    isDragging: boolean;
    results: {
        result: [] | Buffer;
        input: string;
    }[];
}

class Display extends React.Component<DisplayPropTypes> {
    state: DisplayStateTypes = {
        isDragging: false,
        results: [],
    };

    imageWidth = 0;
    imageHeight = 0;
    imageArea = 0;

    call_tracker(files) {
        files = Array.from(files);
        this.setState({
            results: files.map((f) => ({ input: f.path, result: '' })),
        });

        files.forEach((file, idx) =>
            python.predict(file.path, store.getState().undoable.present.items, (err, res) => {
                if (res) {
                    const arr = this.state.results;
                    arr[idx].result = res;
                    this.setState({ results: arr });
                }
            }),
        );
    }

    onImageLoad({ target: img }) {
        this.imageHeight = img.naturalHeight;
        this.imageWidth = img.naturalWidth;
        this.imageArea = this.imageHeight * this.imageWidth;
    }

    downloadImages(num) {
        dialog.showOpenDialog({ properties: ['openDirectory'] }).then((res) => {
            if (res.filePaths && res.filePaths.length === 1) {
                const dir = res.filePaths[0] + '/';
                this.state.results.forEach((item) => {
                    let fn = item.input.split('/');
                    fn = fn[fn.length - 1].split('\\');
                    let fns = fn[fn.length - 1].split('.')[0];
                    const path = dir + fns + '_prediction';
                    if (Array.isArray(item.result)) {
                        fs.writeFileSync(path + '.json', JSON.stringify(item.result), () => {});
                    } else {
                        fs.writeFileSync(path + '.bmp', item.result, 'base64', () => {});
                    }
                });
            }
        });
    }

    render() {
        const { isDragging, results } = this.state;

        return (
            <div className="main container">
                <div
                    style={{
                        backgroundColor: isDragging ? '#222' : '#000',
                        width: '100%',
                        height: '100%',
                    }}
                    id="drag-file"
                    onDragOver={(e) => {
                        this.setState({ isDragging: true });
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onDragEnd={(e) => {
                        e.preventDefault();
                        this.setState({ isDragging: false });
                    }}
                    onDrop={(e) => {
                        e.stopPropagation();
                        const files = e.dataTransfer.files;

                        if (files.length === 0) return;
                        this.call_tracker(files);
                        this.setState({ isDragging: false });
                    }}
                >
                    {results && !isDragging ? (
                        <>
                            <Fab
                                onClick={this.downloadImages.bind(this)}
                                size="large"
                                color="primary"
                                aria-label="add"
                                style={{
                                    position: 'absolute',
                                    bottom: 50,
                                    right: 50,
                                }}
                            >
                                <GetApp />
                            </Fab>
                            {results.map((entry, idx) => (
                                <div
                                    key={entry.input + idx}
                                    style={{
                                        width: 'calc(100% - 40px)',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        padding: 20,
                                        margin: 20,
                                        maxHeight: 500,
                                        borderRadius: 5,
                                        justifyContent: 'center',
                                        justifyItems: 'center',
                                        alignContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    className={'background--20'}
                                >
                                    <Typography variant="h4">{'#' + idx}</Typography>
                                    <div
                                        style={{
                                            width: '100%',
                                            height: 450,
                                            padding: 5,
                                        }}
                                    >
                                        <Typography variant="h4">{'Input'}</Typography>
                                        <img
                                            style={{
                                                objectFit: 'contain',
                                                width: '100%',
                                                height: '90%',
                                            }}
                                            src={entry.input}
                                            alt=""
                                        ></img>
                                    </div>
                                    <ResultDisplay
                                        title="Prediction"
                                        height={450}
                                        width={'100%'}
                                        src={entry.result}
                                        alt=""
                                    ></ResultDisplay>
                                </div>
                            ))}
                            <div style={{ height: 200 }} />
                        </>
                    ) : (
                        <Typography variant="h2" style={{ color: '#fff', lineHeight: '100vh' }}>
                            {isDragging ? 'Drop the file(s) here!' : 'Drag file(s) to analyze'}
                        </Typography>
                    )}
                    {results && !isDragging ? <></> : null}
                </div>
            </div>
        );
    }
}

class Predict extends React.Component<{ theme: Theme }> {
    render() {
        return (
            <div className="container horizontal">
                <Display></Display>
            </div>
        );
    }
}

export default Predict;
