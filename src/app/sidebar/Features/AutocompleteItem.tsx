import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import { SvgIconTypeMap } from "@material-ui/core";
import { Code, Memory, Settings, Share } from "@material-ui/icons";
import React from "react";
import { entity } from "./types";

interface AutoCompleteItemPropTypes {
    entity: entity;
}

export default function AutoCompleteItem(props: AutoCompleteItemPropTypes) {
    let AcIcon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
    switch (props.entity[1] ? props.entity[1].class : "") {
        case "property":
            AcIcon = Settings;
            break;
        case "feature":
            AcIcon = Memory;
            break;
        case "module":
            AcIcon = Share;
            break;
        case "function":
            AcIcon = Code;
            break;
        default:
            AcIcon = Code;
            break;
    }

    return (
        <div className={"aci"}>
            <AcIcon style={{ height: "20px", top: "1px" }}></AcIcon>{" "}
            <span>{props.entity[0]}</span>
        </div>
    );
}
