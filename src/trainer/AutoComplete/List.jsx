// @flow

import React from "react";

import Listeners, { KEY_CODES } from "./listener";
import Item from "./Item";
import type { ListProps, ListState } from "./types";
import { FixedSizeList as VirtualizedList } from "react-window";

export default class List extends React.Component<ListProps, ListState> {
    state: ListState = {
        selectedItem: null,
    };

    cachedIdOfItems: Map<Object | string, string> = new Map();
    list = undefined;

    componentDidMount() {
        this.listeners.push(
            Listeners.add([KEY_CODES.DOWN, KEY_CODES.UP], this.scroll),
            Listeners.add([KEY_CODES.ENTER, KEY_CODES.TAB], this.onPressEnter)
        );

        const { values } = this.props;
        if (values && values[0]) this.selectItem(values[0]);
    }

    componentDidUpdate({ values: oldValues }: ListProps) {
        const { values } = this.props;

        const oldValuesSerialized = oldValues
            .map((val) => this.getId(val))
            .join("");
        const newValuesSerialized = values
            .map((val) => this.getId(val))
            .join("");

        if (
            oldValuesSerialized !== newValuesSerialized &&
            values &&
            values[0]
        ) {
            this.selectItem(values[0]);
        }
    }

    componentWillUnmount() {
        let listener;
        while (this.listeners.length) {
            listener = this.listeners.pop();
            Listeners.remove(listener);
        }
    }

    onPressEnter = (e: SyntheticEvent<*>) => {
        if (typeof e !== "undefined") {
            e.preventDefault();
        }

        const { values } = this.props;
        this.modifyText(values[this.getPositionInList()]);
    };

    getPositionInList = () => {
        const { values } = this.props;
        const { selectedItem } = this.state;

        if (!selectedItem) return 0;

        return values.findIndex(
            (a) => this.getId(a) === this.getId(selectedItem)
        );
    };

    getId = (item: Object | string): string => {
        return item[0];
    };

    props: ListProps;

    listeners: Array<number> = [];

    itemsRef: {
        [key: string]: HTMLDivElement,
    } = {};

    modifyText = (value: Object | string) => {
        if (!value) return;

        const { onSelect } = this.props;

        onSelect(value);
    };

    selectItem = (item: Object | string, keyboard: boolean = false) => {
        if (this.state.selectedItem === item) return;

        this.setState({ selectedItem: item }, () => {
            this.list && this.list.scrollToItem(this.getPositionInList());
        });
    };

    scroll = (e: KeyboardEvent) => {
        e.preventDefault();

        const { values } = this.props;

        const code = e.keyCode || e.which;

        const oldPosition = this.getPositionInList();
        let newPosition;
        switch (code) {
            case KEY_CODES.DOWN:
                newPosition = oldPosition + 1;
                break;
            case KEY_CODES.UP:
                newPosition = oldPosition - 1;
                break;
            default:
                newPosition = oldPosition;
                break;
        }

        newPosition =
            ((newPosition % values.length) + values.length) % values.length; // eslint-disable-line
        this.selectItem(
            values[newPosition],
            [KEY_CODES.DOWN, KEY_CODES.UP].includes(code)
        );
    };

    getInfoBox() {
        if (!this.props.getInfoBox) return null;

        return this.props.getInfoBox(
            this.props.values[this.getPositionInList()]
        );
    }

    isSelected = (item: Object | string): boolean => {
        const { selectedItem } = this.state;
        if (!selectedItem) return false;
        return this.getId(selectedItem) === this.getId(item);
    };

    render() {
        const {
            values,
            component,
            style,
            itemClassName,
            className,
            itemStyle,
        } = this.props;

        const infoBox = this.getInfoBox();
        const self = this;

        function Row({ index, style }) {
            const item = values[index];
            return (
                <Item
                    key={self.getId(item)}
                    innerRef={(ref) => {
                        self.itemsRef[self.getId(item)] = ref;
                    }}
                    selected={self.isSelected(item)}
                    item={item}
                    className={itemClassName}
                    style={style}
                    onClickHandler={self.onPressEnter}
                    onSelectHandler={self.selectItem}
                    component={component}
                />
            );
        }

        return (
            <div style={{ display: "flex", flexDirection: "row" }}>
                <VirtualizedList
                    className={`rta__list ${className || ""}`}
                    ref={(ref) => (this.list = ref)}
                    height={200}
                    itemCount={values ? values.length : 0}
                    itemSize={22}
                    width={450}>
                    {Row}
                </VirtualizedList>
                {infoBox && <div className="rta__infobox">{infoBox}</div>}
            </div>
        );
    }
}
