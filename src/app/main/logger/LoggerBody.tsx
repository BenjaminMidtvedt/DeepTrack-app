import React from "react";
import { connect } from "react-redux";

interface LoggerBodyPropTypes {
    text: string;
}

class LoggerBody extends React.Component<LoggerBodyPropTypes> {
    isScrolledToBottom = true;

    componentDidMount() {
        this.componentDidUpdate();
    }

    componentWillUpdate() {
        const logger = document.getElementById("logger__inner");
        if (logger) {
            this.isScrolledToBottom =
                logger.scrollHeight - logger.clientHeight <=
                logger.scrollTop + 5;
        }
    }

    componentDidUpdate() {
        const logger = document.getElementById("logger__inner");
        if (this.isScrolledToBottom && logger)
            logger.scrollTop = logger.scrollHeight - logger.clientHeight;
    }

    scrollToBottom() {
        const logger = document.getElementById("logger__inner");
        if (this.isScrolledToBottom && logger)
            logger.scrollTop = logger.scrollHeight - logger.clientHeight;
    }

    render() {
        console.log(this.props.text);
        return (
            <div className="logger__inner" id="logger__inner">
                <pre>{this.props.text}</pre>
            </div>
        );
    }
}

function mapStateToProps(state, props): { text: string } {
    console.log(state.logger);
    return state.logger;
}

export default connect(mapStateToProps)(LoggerBody);
