import React from 'react';
import { Tabs, Tab, Typography } from '@material-ui/core';
import { Album, FitnessCenter, BarChart } from '@material-ui/icons';

export default function Sidebar({ header = '', children, theme }) {
    return (
        <div className="sidebar" style={{ backgroundColor: theme.palette.background.default }}>
            {header && header.length > 0 ? (
                <div className="header">
                    <Typography variant="h5" color="textPrimary">
                        {' '}
                        {header}{' '}
                    </Typography>
                </div>
            ) : null}
            <div className="form">{children}</div>
        </div>
    );
}
