import { Button, Dialog, DialogActions, DialogTitle } from '@material-ui/core';
import React from 'react';

export default function DeleteAlert(props) {
    const { onClose, open, name } = this.props;

    const handleClose = (shouldDelete) => {
        onClose(shouldDelete);
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{'Delete ' + (name || 'component') + '?'}</DialogTitle>

            <DialogActions>
                <Button onClick={() => handleClose(false)} color="default">
                    Cancel
                </Button>
                <Button onClick={() => handleClose(true)} color="secondary" autoFocus>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
}
