import React from 'react';

const throttle = (f) => {
    let token = null, lastArgs = null;
    const invoke = () => {
        f(...lastArgs);
        token = null;
    };
    const result = (...args) => {
        lastArgs = args;
        if (!token) {
            token = requestAnimationFrame(invoke);
        }
    };
    result.cancel = () => token && cancelAnimationFrame(token);
    return result;
};

export default class Draggable extends React.PureComponent {
    _relX = 0;
    _relY = 0;
    _ref = React.createRef();

    _onMouseDown = (event) => {
        if (event.button !== 0) {
            return;
        }

        this._relX = event.pageX 
        this._relY = event.pageY 
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        event.preventDefault();
    };

    _onMouseUp = (event) => {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        this.props.onMouseUp(event)
        event.preventDefault();
    };

    _onMouseMove = (event) => {
        this.props.onMove(
            event.pageX - this._relX,
            event.pageY - this._relY,
            event
        );
        event.preventDefault();
    };

    _update = throttle(() => {
        const {x, y} = this.props;
        this._ref.current.style.transform = `translate(${x}px, ${y}px)`;
    });

    componentDidMount() {
        this._ref.current.addEventListener('mousedown', this._onMouseDown);
        this._update();
    }

    componentDidUpdate() {
        this._update();
    }

    componentWillUnmount() {
        this._ref.current.removeEventListener('mousedown', this._onMouseDown);
        this._update.cancel();
    }

    render() {
        return (
            <div className="draggable" ref={this._ref}>
                {this.props.children}
            </div>
        );
    }
}
