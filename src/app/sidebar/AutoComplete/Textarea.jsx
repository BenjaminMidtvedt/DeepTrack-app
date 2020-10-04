// @flow
/* eslint react/no-multi-comp: 0 */

import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import getCaretCoordinates from "textarea-caret";
import CustomEvent from "custom-event";

import Listeners, { KEY_CODES } from "./listener";
import List from "./List";

import { defaultScrollToItem } from "./utilities";

import type, {
    TextareaProps,
    TextareaState,
    caretPositionType,
    outputType,
    triggerType,
    settingType,
} from "./types";

import { Input } from "@material-ui/core";

const DEFAULT_CARET_POSITION = "next";

const POSITION_CONFIGURATION = {
    X: {
        LEFT: "rta__autocomplete--left",
        RIGHT: "rta__autocomplete--right",
    },
    Y: {
        TOP: "rta__autocomplete--top",
        BOTTOM: "rta__autocomplete--bottom",
    },
};

const errorMessage = (message: string) =>
    console.error(
        `RTA: dataProvider fails: ${message}
    \nCheck the documentation or create issue if you think it's bug. https://github.com/webscopeio/react-textarea-autocomplete/issues`
    );

const reservedRegexChars = [
    ".",
    "^",
    "$",
    "*",
    "+",
    "-",
    "?",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "\\",
    "|",
];

const escapeRegex = (text) =>
    [...text]
        .map((character) =>
            reservedRegexChars.includes(character)
                ? `\\${character}`
                : character
        )
        .join("");

// The main purpose of this component is to figure out to which side the autocomplete should be opened
type AutocompleteProps = {
    style: ?Object,
    className: ?string,
    innerRef: () => void,
    boundariesElement: string | HTMLElement,
    top: ?number,
    left: ?number,
    children: *,
    textareaRef: HTMLElement,
    renderToBody: ?boolean,
};

class MyReactTextareaAutocomplete extends React.Component<
    TextareaProps,
    TextareaState
> {
    textareaRef = null;
    caretPosition = { start: false, end: false };

    static defaultProps = {
        movePopupAsYouType: false,
        value: null,
        minChar: 1,
        boundariesElement: "body",
        scrollToItem: true,
        textAreaComponent: "textarea",
        renderToBody: false,
    };

    state = {
        suggestionData: null,
    };

    constructor(props) {
        super(props);
        this._createRegExp();
        this._handleCaretChange = this._handleCaretChange.bind(this);
        this._handleChange = this._handleChange.bind(this);
        this._onFocus = this._onFocus.bind(this);
        this._onBlur = this._onBlur.bind(this);
        this._closeAutocomplete = this._closeAutocomplete.bind(this);
        this._handleTextModify = this._handleTextModify.bind(this);
        this.escListenerInit();
    }

    escListenerInit = () => {
        if (!this.escListener) {
            this.escListener = Listeners.add(
                KEY_CODES.ESC,
                this._closeAutocomplete
            );
        }
    };

    _closeAutocomplete() {
        this.setState({ suggestionData: null });
    }

    escListenerDestroy = () => {
        if (this.escListener) {
            Listeners.remove(this.escListener);
            this.escListener = null;
        }
    };

    componentDidMount() {
        Listeners.startListen(this.textareaRef);
        // handle caret change
        this.textareaRef &&
            this.textareaRef.addEventListener("focus", this._handleCaretChange);
        this.textareaRef &&
            this.textareaRef.addEventListener("click", this._handleCaretChange);
        this.textareaRef &&
            this.textareaRef.addEventListener(
                "keydown",
                this._handleCaretChange
            );

        this.setState({ value: this.props.defaultValue || "" });
    }

    componentDidUpdate({
        separators: oldSeparators,
        value: oldValue,
    }: TextareaProps) {
        const { separators, value } = this.props;
        if (
            Object.keys(oldSeparators).join("") !==
            Object.keys(separators).join("")
        ) {
            this._createRegExp();
        }

        const { selectionStart, selectionEnd } = this.textareaRef;
        const update =
            (this.caretPosition.start !== false &&
                this.caretPosition.start !== selectionStart) ||
            (this.caretPosition.end !== false &&
                this.caretPosition.end !== selectionEnd);
        if (update)
            this.setCaretPosition(
                this.caretPosition.start,
                this.caretPosition.end
            );
    }

    componentWillUnmount() {
        this.escListenerDestroy();
        Listeners.stopListen(this.textareaRef);
        // handle caret change
        this.textareaRef &&
            this.textareaRef.removeEventListener(
                "focus",
                this._handleCaretChange
            );
        this.textareaRef &&
            this.textareaRef.removeEventListener(
                "click",
                this._handleCaretChange
            );
        this.textareaRef &&
            this.textareaRef.removeEventListener(
                "keydown",
                this._handleCaretChange
            );
    }

    _dropdownScroll = (item: HTMLDivElement) => {
        const { scrollToItem } = this.props;

        if (!scrollToItem) return;

        if (scrollToItem === true) {
            defaultScrollToItem(this.dropdownRef, item);
            return;
        }

        if (typeof scrollToItem !== "function" || scrollToItem.length !== 2) {
            throw new Error(
                "`scrollToItem` has to be boolean (true for default implementation) or function with two parameters: container, item."
            );
        }

        scrollToItem(this.dropdownRef, item);
    };

    setCaretPosition = (position: number = 0) => {
        if (!this.textareaRef) return;
        this.textareaRef.focus();
        this.textareaRef.setSelectionRange(position, position);
    };

    _handleChange(e) {
        const caretPosition = e.target.selectionStart;
        let newValue = e.target.value;
        e.persist();
        this.props.onChange && this.props.onChange(e);
        let m = null;
        let areaStartPosition = 0;

        while ((m = this.separatorExp.exec(newValue)) !== null) {
            if (areaStartPosition <= caretPosition && m.index > caretPosition) {
                break;
            }
            areaStartPosition = m.index + 1;
        }
        this.separatorExp.lastIndex = 0;

        let areaEndPosition = newValue.length;
        if (m !== null) {
            areaEndPosition = m.index;
        }

        let newValueSubString = newValue.slice(
            areaStartPosition,
            areaEndPosition
        );

        let valueItems = newValueSubString.split(/[.)]/g);

        let currentTargetIndex = 0;
        let lengthSum = areaStartPosition;

        for (
            currentTargetIndex = 0;
            currentTargetIndex < valueItems.length;
            currentTargetIndex++
        ) {
            lengthSum += valueItems[currentTargetIndex].length;
            if (lengthSum >= caretPosition) {
                break;
            }
            lengthSum++;
        }

        valueItems = valueItems.slice(0, currentTargetIndex + 1);

        const textToReplace =
            valueItems.length > 0
                ? [lengthSum - valueItems[currentTargetIndex].length, lengthSum]
                : null;

        valueItems[0] = valueItems[0].trim();
        valueItems[currentTargetIndex] = valueItems[currentTargetIndex].replace(
            / *$/,
            ""
        );
        let selection = this.props.tree;
        if (valueItems.length > 1 || areaStartPosition > 0) {
            selection = {};

            Object.entries(this.props.tree).forEach(([key, value]) => {
                if (
                    value._suggestionData &&
                    value._suggestionData.class !== "feature"
                ) {
                    selection[key] = value;
                }
            });
        }

        for (let index = 0; index < valueItems.length - 1; index++) {
            selection = selection[valueItems[index]];

            if (!selection) {
                break;
            }
        }

        let suggestionData = null;
        if (selection && selection instanceof Object) {
            function score(key) {
                switch (key) {
                    case "module":
                        return 10;
                    case "function":
                        return 20;
                    case "property":
                        return 30;
                    case "feature":
                        return 40;
                    default:
                        return -10;
                }
            }

            suggestionData = Object.entries(selection)
                .filter(
                    (v) =>
                        v[0] !== "_suggestionData" &&
                        v[0].includes(valueItems[currentTargetIndex])
                )
                .map((v) => {
                    return [v[0], v[1]["_suggestionData"]];
                })
                .sort(
                    (a, b) =>
                        score(b[1].class) -
                        score(a[1].class) +
                        a[0].indexOf(valueItems[currentTargetIndex]) -
                        b[0].indexOf(valueItems[currentTargetIndex])
                );
        }

        this.caretPosition = {
            start: e.target.selectionStart,
            end: e.target.selectionEnd,
        };
        this.setCaretPosition(this.caretPosition.start, this.caretPosition.end);
        e.persist();
        this.setState(
            {
                suggestionData: suggestionData,
                textToReplace: textToReplace,
            },
            () => {
                this._handleCaretChange(e);
            }
        );
    }

    _handleCaretChange(e) {
        let selection = e.target.selectionEnd;
        if (e.type === "keydown") {
            switch (e.key) {
                case "ArrowLeft":
                    selection -= 1;
                    break;
                case "ArrowRight":
                    selection += 1;
                    break;
                default:
                    break;
            }
        }
        const { top: newTop, left: newLeft } = getCaretCoordinates(
            e.target,
            selection
        );

        this.caretPosition = {
            start: e.target.selectionStart,
            end: e.target.selectionEnd,
        };

        this.setState({ top: newTop, left: newLeft });
    }

    _onSelect = (item: Object | string) => {
        const { value } = this.props;
        const { textToReplace } = this.state;
        if (value[textToReplace[0]] === " ") textToReplace[0]++;

        const newValue =
            value.slice(0, textToReplace[0]) +
            item[0] +
            value.slice(textToReplace[1], value.length);
        // set the new textarea value and after that set the caret back to its position
        this.caretPosition = {
            start: textToReplace[0] + item[0].length,
            end: textToReplace[0] + item[0].length,
        };
        this._handleTextModify(newValue);
    };

    _onFocus(e) {
        this.props.onFocus && this.props.onFocus(e);
        this._handleChange(e);
    }

    _onBlur(e) {
        this.props.onBlur && this.props.onBlur(e);
        if (this._shouldStayOpen(e)) {
            return;
        }
        this._closeAutocomplete();
    }

    _shouldStayOpen = (e: SyntheticFocusEvent<*>) => {
        let el = e.relatedTarget;
        // IE11 doesn't know about `relatedTarget` // https://stackoverflow.com/a/49325196/2719917
        if (el === null) {
            el = document.activeElement;
        }
        if (
            this.dropdownRef &&
            el instanceof Node &&
            this.dropdownRef.contains(el)
        ) {
            return true;
        }

        return false;
    };

    _createRegExp() {
        this.separatorExp = new RegExp(
            "(?:" + this.props.separators.join("|") + ")",
            "gm"
        );

        this.substringSeparator = new RegExp(".", "gm");
    }

    getCaretPosition = (): number => {
        if (!this.textareaRef) {
            return 0;
        }

        const position = this.textareaRef.selectionEnd;
        return position;
    };

    _handleTextModify = (text) => {
        this.props.onChange && this.props.onChange({ target: { value: text } });
    };

    render() {
        const {
            loadingComponent: Loader,
            style,
            className,
            listStyle,
            itemStyle,
            boundariesElement,
            movePopupAsYouType,
            listClassName,
            itemClassName,
            dropdownClassName,
            dropdownStyle,
            containerStyle,
            containerClassName,
            loaderStyle,
            loaderClassName,
            textAreaComponent,
            renderToBody,
            component,
            placeholder,
            value,
        } = this.props;
        const { left, top, textToReplace, suggestionData } = this.state;
        const isAutocompleteOpen = suggestionData && suggestionData.length > 0;
        // const {} = this.state

        return (
            <>
                <Input
                    inputRef={(ref) => (this.textareaRef = ref)}
                    className={`rta__textarea ${className || ""}`}
                    onChange={this._handleChange}
                    placeholder={placeholder}
                    onClick={
                        // The textarea itself is outside the autoselect dropdown.
                        this._onClick
                    }
                    onFocus={this._onFocus}
                    onBlur={this._onBlur}
                    value={value}
                    style={style}></Input>

                {isAutocompleteOpen && (
                    <Autocomplete
                        innerRef={(ref) => {
                            // $FlowFixMe
                            this.dropdownRef = ref;
                        }}
                        top={top}
                        left={left}
                        style={dropdownStyle}
                        className={dropdownClassName}
                        movePopupAsYouType={movePopupAsYouType}
                        boundariesElement={boundariesElement}
                        textareaRef={this.textareaRef}
                        renderToBody={renderToBody}>
                        {suggestionData && component && textToReplace && (
                            <List
                                getInfoBox={this.props.getInfoBox}
                                onTextModify={this._handleTextModify}
                                values={suggestionData}
                                component={component}
                                style={listStyle}
                                className={listClassName}
                                itemClassName={itemClassName}
                                itemStyle={itemStyle}
                                getTextToReplace={() => textToReplace}
                                onSelect={this._onSelect}
                                dropdownScroll={this._dropdownScroll}
                            />
                        )}
                    </Autocomplete>
                )}
            </>
        );
    }
}

class Autocomplete extends React.Component<AutocompleteProps> {
    containerElem: HTMLElement;

    ref: HTMLElement;

    componentDidMount() {
        const { boundariesElement } = this.props;

        if (typeof boundariesElement === "string") {
            const elem = document.querySelector(boundariesElement);
            if (!elem) {
                throw new Error(
                    "RTA: Invalid prop boundariesElement: it has to be string or HTMLElement."
                );
            }
            this.containerElem = elem;
        } else if (boundariesElement instanceof HTMLElement) {
            this.containerElem = boundariesElement;
        } else {
            throw new Error(
                "RTA: Invalid prop boundariesElement: it has to be string or HTMLElement."
            );
        }

        if (!this.containerElem || !this.containerElem.contains(this.ref)) {
            if (process.env.NODE_ENV !== "test") {
                throw new Error(
                    "RTA: Invalid prop boundariesElement: it has to be one of the parents of the RTA."
                );
            }
        }

        this.ref.style.position = "absolute";
    }

    componentDidUpdate() {
        const top = this.props.top || 0;
        const left = this.props.left || 0;
        const usedClasses = [];
        const unusedClasses = [];

        let topPosition = 0;
        let leftPosition = 0;

        const containerBounds = this.containerElem.getBoundingClientRect();
        const dropdownBounds = this.ref.getBoundingClientRect();
        const textareaBounds = this.props.textareaRef.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(this.ref);

        const marginTop = parseInt(
            computedStyle.getPropertyValue("margin-top"),
            10
        );
        const marginBottom = parseInt(
            computedStyle.getPropertyValue("margin-bottom"),
            10
        );
        const marginLeft = parseInt(
            computedStyle.getPropertyValue("margin-left"),
            10
        );
        const marginRight = parseInt(
            computedStyle.getPropertyValue("margin-right"),
            10
        );

        const dropdownBottom =
            marginTop +
            marginBottom +
            textareaBounds.top +
            top +
            dropdownBounds.height;
        const dropdownRight =
            marginLeft +
            marginRight +
            textareaBounds.left +
            left +
            dropdownBounds.width;

        if (dropdownRight > containerBounds.right) {
            leftPosition = left - dropdownBounds.width;
            usedClasses.push(POSITION_CONFIGURATION.X.LEFT);
            unusedClasses.push(POSITION_CONFIGURATION.X.RIGHT);
        } else {
            leftPosition = left;
            usedClasses.push(POSITION_CONFIGURATION.X.RIGHT);
            unusedClasses.push(POSITION_CONFIGURATION.X.LEFT);
        }

        if (dropdownBottom > window.innerHeight - 30) {
            topPosition = top - dropdownBounds.height - 30;
            usedClasses.push(POSITION_CONFIGURATION.Y.TOP);
            unusedClasses.push(POSITION_CONFIGURATION.Y.BOTTOM);
        } else {
            topPosition = top;
            topPosition += textareaBounds.height - 30;
            usedClasses.push(POSITION_CONFIGURATION.Y.BOTTOM);
            unusedClasses.push(POSITION_CONFIGURATION.Y.TOP);
        }

        topPosition += textareaBounds.top - 10;
        leftPosition += textareaBounds.left;
        leftPosition = Math.min(
            leftPosition,
            textareaBounds.left + textareaBounds.width
        );

        this.ref.style.top = `${topPosition}px`;
        this.ref.style.left = `${leftPosition}px`;

        this.ref.classList.remove(...unusedClasses);
        this.ref.classList.add(...usedClasses);
    }

    render() {
        const {
            style,
            className,
            innerRef,
            children,
            renderToBody,
        } = this.props;
        const body = document.body;
        const autocompleteContainer = (
            <div
                ref={(ref) => {
                    // $FlowFixMe
                    this.ref = ref;
                    // $FlowFixMe
                    innerRef(ref);
                }}
                className={`rta__autocomplete ${className || ""}`}
                style={style}>
                {children}
            </div>
        );

        return renderToBody && body !== null
            ? ReactDOM.createPortal(autocompleteContainer, body)
            : autocompleteContainer;
    }
}

export default MyReactTextareaAutocomplete;
