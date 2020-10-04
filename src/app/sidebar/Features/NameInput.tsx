import React from 'react';

import { Input } from '@material-ui/core';

export default function NameInput(props) {
    const re = /[^a-zA-Z0-9_]/gi;

    function onChangeHandler(e) {
        const newValue = e.target.value.replace(re, '');

        e.target.value = newValue;

        e.persist();
        props.onChange && props.onChange(e);
    }

    return <Input {...props.inputProps} onChange={onChangeHandler}></Input>;
}
