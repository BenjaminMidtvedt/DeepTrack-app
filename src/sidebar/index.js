import React from 'react';
import './index.scss';
import { Tabs, Tab, Typography } from "@material-ui/core"
import { Album, FitnessCenter, BarChart } from '@material-ui/icons'




export default function Sidebar(props) {

  const {header, children, theme} = props

  return (
    <div className="sidebar" style={{backgroundColor: theme.palette.background.default}}>
      <div className="header">
        <Typography variant="h5" color="textPrimary"> {header} </Typography>
      </div>
      <div className="form">
        {children}
      </div>
    </div>
  );
}

