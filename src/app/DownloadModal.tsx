import {
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Modal,
    Typography,
} from "@material-ui/core";
import { Check } from "@material-ui/icons";
import React from "react";
import PythonInterface from "../providers/PythonInterface";

interface DownloadItemPropTypes {
    displayName: string;
    name: string;
    id: string;
    max: number;
}

interface DownloadModalPropTypes {
    open: boolean;
    onClose:
        | ((event: {}, reason: "backdropClick" | "escapeKeyDown") => void)
        | undefined;
}

const DATASETS: DownloadItemPropTypes[] = [
    {
        displayName: "MNIST",
        name: "MNIST",
        id: "1UePQAYNp-ja9userMwTprIwGWjwCu3Tf",
        max: 11423120,
    },
    {
        displayName: "Particle Tracking",
        name: "ParticleTracking",
        id: "1eA9F_GjJbErkJu2TizE_CHjpqD6WePqy",
        max: 113345,
    },
    {
        displayName: "Particle Sizing",
        name: "ParticleSizing",
        id: "1FaygrzmEDnXjVe_W3yVfqNTM0Ir5jFkR",
        max: 202637312,
    },
    {
        displayName: "Quantum Dots",
        name: "QuantumDots",
        id: "1naaoxIaAU1F_rBaI-I1pB1K4Sp6pq_Jv",
        max: 136577024,
    },
    {
        displayName: "U2OS Cell Counting",
        name: "CellCounting",
        id: "18Afk9Fwe4y3FVLPYd7fr4sfNIW59KEGR",
        max: 79912092,
    },
    {
        displayName: "Nerve Cells",
        name: "MitoGAN",
        id: "13fzMUXz3QSJPjXOf9p-To72K8Z0XGKyU",
        max: 54997097,
    },
];

export default function DownloadModal(props: DownloadModalPropTypes) {
    return (
        <Modal
            open={props.open}
            onClose={props.onClose}
            disableAutoFocus={true}
            style={{
                width: "fit-content",
                height: "fit-content",
                borderRadius: 5,
                padding: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "auto",
            }}
            className="background--60">
            <div className="remove-focus">
                <Typography variant="h4">Download Dataset</Typography>
                <Divider></Divider>
                <List>
                    {DATASETS.map((item) => (
                        <>
                            <DownloadItem
                                key={item.id}
                                {...item}></DownloadItem>
                        </>
                    ))}
                </List>
            </div>
        </Modal>
    );
}

function DownloadItem(props: DownloadItemPropTypes) {
    const [progress, setProgress] = React.useState(0);
    const [done, setDone] = React.useState(false);

    const p = `${props.name}.png`;
    const progressFraction = Math.min(progress / props.max, 1);

    return (
        <ListItem
            button={true}
            className="progresser"
            onClick={() => {
                setDone(false);
                PythonInterface.download(
                    props.id,
                    "C:/Users/bmidt/OneDrive/Documents/My DeepTrack Sets",
                    (err, res, more) => {
                        if (res) {
                            if (res === "DONE") {
                                setDone(true);
                            } else {
                                console.log(res);
                                setProgress(res);
                            }
                        }
                    }
                );
            }}>
            <div
                className="progress-bar"
                style={{
                    transform: `scaleX(${progressFraction})`,
                    zIndex: 0,
                }}>
                <div
                    className={
                        "progress-check" + (done ? " progress-check-done" : "")
                    }
                    hidden={!done}>
                    <Check></Check>
                </div>
            </div>

            <ListItemAvatar>
                <Avatar src={p} />
            </ListItemAvatar>
            <div style={{ zIndex: 1 }}>
                <ListItemText>{props.displayName}</ListItemText>
            </div>
        </ListItem>
    );
}
