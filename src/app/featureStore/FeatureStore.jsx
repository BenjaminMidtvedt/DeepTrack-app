import React from "react";
import {
    Typography,
    List,
    Collapse,
    IconButton,
    Divider,
    Input,
    InputAdornment,
} from "@material-ui/core";
import { Search, DeleteForever, ChevronRight } from "@material-ui/icons";
import Python from "../../providers/PythonInterface";

const ORDER = [
    "optics",
    "scatterers",
    "noise",
    "math",
    "models",
    "features",
].reverse();

export default class FeatureStore extends React.Component {
    state = {
        features: [],
        search: "",
    };

    constructor(props) {
        super(props);
        this.populateStore.bind(this);
    }

    populateStore() {
        Python.getAllFeatures((error, res) => {
            if (!res) {
                this.populateStore();
            }

            const featureKeys =
                JSON.parse(window.localStorage.getItem("featureKeys")) || [];
            featureKeys.forEach((key) => {
                const feature = JSON.parse(window.localStorage.getItem(key));
                if (feature) {
                    if (!res["My Features"]) res["My Features"] = {};
                    res["My Features"][key] = feature;
                }
            });
            this.setState({ features: res });
        });
    }

    componentDidMount() {
        this.populateStore();
    }

    render() {
        const { features } = this.state;

        return (
            <div className="background--dark">
                <Input
                    style={{ marginLeft: 10 }}
                    placeholder={"Search..."}
                    id="searchFeature"
                    onChange={(e) => {
                        this.setState({ search: e.target.value });
                    }}
                    startAdornment={
                        <InputAdornment position="start">
                            <Search />
                        </InputAdornment>
                    }></Input>
                <List>
                    {Object.entries(features)
                        .sort((a, b) => {
                            return ORDER.indexOf(b[0]) - ORDER.indexOf(a[0]);
                        })
                        .map((keyvalue, idx) => (
                            <FeatureListSection
                                search={this.state.search}
                                key={keyvalue[0] + idx}
                                name={keyvalue[0]}
                                items={keyvalue[1]}></FeatureListSection>
                        ))}
                </List>
            </div>
        );
    }
}

function FeatureListSection(props) {
    const [open, setOpen] = React.useState(false);

    const { name, items } = props;

    let subitems = Object.entries(items)
        .filter(
            (k) =>
                !props.search ||
                k[0].toLowerCase().indexOf(props.search.toLowerCase()) !== -1
        )
        .map((item, idx) => (
            <FeatureListItem
                search={props.search}
                key={JSON.stringify(item[1]) + idx}
                parentName={name}
                item={item[1]}
                name={item[0]}></FeatureListItem>
        ));

    subitems = subitems.filter((item) => item !== null);

    if (subitems.length > 0) {
        return (
            <div className="background--dark">
                <div
                    style={{ width: "100%" }}
                    className={"text--" + name + "--bright"}>
                    <div
                        style={{ display: "flex", width: "100%" }}
                        onClick={() => setOpen(!open)}>
                        <div
                            className={
                                "fs-chevron " +
                                (open ? "chevron-open" : "chevron-closed")
                            }>
                            <ChevronRight></ChevronRight>
                        </div>
                        <Typography
                            variant="h5"
                            style={{
                                textAlign: "center",
                                textIndent: 5,
                                color: "inherit",
                            }}>
                            {name}
                        </Typography>
                    </div>
                    <Collapse in={open || props.search}>{subitems}</Collapse>
                    <Divider></Divider>
                </div>
            </div>
        );
    } else {
        return null;
    }
}

function FeatureListItem(props) {
    const { item, name } = props;
    const [showMe, setShow] = React.useState(true);
    return showMe ? (
        <div
            className={"grabbable text--" + props.parentName + "--white"}
            draggable
            onDragStart={(e) => {
                if (Array.isArray(item)) {
                    e.dataTransfer.setData("items", JSON.stringify(item));
                } else {
                    e.dataTransfer.setData("item", JSON.stringify(item));
                }
            }}
            style={{
                height: 22,
                border: "1px solid rgba(255, 255, 255, 0.02)",
                display: "flex",
                flexDirection: "row",
            }}>
            <Typography
                noWrap
                style={{
                    fontFamily: "hack",
                    overflow: "hidden",
                    userSelect: "none",
                    textIndent: 30,
                    color: "inherit",
                }}>
                {name}
            </Typography>
            {Array.isArray(item) ? (
                <IconButton
                    style={{
                        height: 20,
                        width: 20,
                        padding: 0,
                        position: "absolut",
                        left: 5,
                    }}
                    onClick={() => {
                        if (
                            window.confirm(
                                "Are you sure you want to permanently delete this feature?"
                            )
                        ) {
                            window.localStorage.removeItem(name);
                            setShow(false);
                        }
                    }}>
                    <DeleteForever></DeleteForever>
                </IconButton>
            ) : null}
        </div>
    ) : null;
}
