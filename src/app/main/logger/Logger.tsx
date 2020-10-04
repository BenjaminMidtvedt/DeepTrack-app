import React from 'react';

import { Button } from '@material-ui/core';

import store from '../../../store/store';

import LoggerBody from './LoggerBody';

export default function Logger(props) {
    return (
        <>
            <input type="checkbox" id="logger__checkbox" />
            <label htmlFor="logger__checkbox" className="logger background--dark">
                <div className="logger__title">TERMINAL</div>
                <div className="logger__buttons">
                    <Button
                        onClick={() => {
                            const logger = document.getElementById('logger__inner');
                            if (logger) {
                                logger.scrollTop = logger.scrollHeight - logger.clientHeight;
                            }
                        }}
                    >
                        Scroll to bottom
                    </Button>
                    <Button
                        onClick={() => {
                            store.dispatch({
                                type: 'CLEAR_TEXT',
                            });
                        }}
                    >
                        Clear
                    </Button>
                    <Button
                        onClick={() => {
                            store.dispatch({
                                type: 'RESTART_SERVER',
                            });
                        }}
                    >
                        Restart Server
                    </Button>
                </div>

                <div className="logger__body">
                    <LoggerBody />
                </div>
            </label>
        </>
    );
}
