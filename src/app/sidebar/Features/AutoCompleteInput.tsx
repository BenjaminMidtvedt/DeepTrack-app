import React, { ReactNode } from 'react';
import AutoComplete from '../AutoComplete';
import AutoCompleteItem from './AutocompleteItem';
import { getTriggersFromTree, available_functions } from './utils';
import { entity } from './types';
import { StoreItem } from '../../../types/StoreTypes';

function getInfoBox(item: entity | null, field: string): ReactNode | null {
    if (item) {
        switch (item[1].class) {
            case 'module':
                break;
            case 'function':
                return <div>{item[1].signature}</div>;
            case 'property':
                const value = item[1][field] || (field === 'T' && item[1]['V']) || item[1]['S'];
                return <div>{value}</div>;
            default:
                break;
        }
    }
}

interface AutoCompleteInputPropTypes {
    tree: StoreItem[];
    blacklist: number[];
    name: string;
    onChange: Function;
    field: 'S' | 'V' | 'T' | 'L';
    placeholder?: String;
    value: String;
    separators: String[];
}

export default function AutoCompleteInput(props: AutoCompleteInputPropTypes) {
    const [tree, setTree] = React.useState({});

    return (
        <AutoComplete
            getInfoBox={(item) => getInfoBox(item, props.field)}
            className={'actb'}
            onFocus={() => {
                setTree({
                    ...(available_functions || {}),
                    ...getTriggersFromTree(props.tree, props.blacklist),
                });
            }}
            style={{ width: '90%', fontFamily: 'Hack', fontSize: '12px' }}
            onChange={props.onChange}
            placeholder={props.placeholder}
            value={props.value}
            dropdownStyle={{ zIndex: 999 }}
            separators={props.separators}
            component={(props) => <AutoCompleteItem {...props} onSelect={(item: entity) => {}} />}
            tree={tree}
        ></AutoComplete>
    );
}
